# Prisma v7 + PgBouncer Setup Guide

This document describes how to run EIPsInsight with Prisma v7, a self-hosted PgBouncer, and Aiven PostgreSQL.

---

## Overview

- **Prisma v7** uses the "client" engine by default, which requires either an adapter or Accelerate URL.
- **PgBouncer** sits between the app and PostgreSQL to pool connections.
- **Aiven** hosts the PostgreSQL database.

```
App (Prisma + @prisma/adapter-pg) → PgBouncer (self-hosted) → Aiven PostgreSQL
```

---

## 1. Prisma v7 + Adapter

### Problem

Prisma v7 throws:

```
PrismaClientConstructorValidationError: Using engine type "client" requires either "adapter" or "accelerateUrl" to be provided to PrismaClient constructor.
```

### Solution

Use the `@prisma/adapter-pg` adapter with the `pg` driver.

```bash
bun add @prisma/adapter-pg pg
```

### `src/lib/prisma.ts`

```ts
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrisma() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter, log: ["error"] });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

### Environment Variables

`.env`:

```env
# PgBouncer (pooled)
DATABASE_URL="postgresql://user:password@PGBOUNCER_HOST:6432/defaultdb?pgbouncer=true"

# Direct Aiven (migrations only)
DIRECT_DATABASE_URL="postgresql://user:password@AIVEN_HOST:PORT/defaultdb?sslmode=require"

# Local/dev only: allow self-signed TLS chains
PRISMA_SSL_ALLOW_SELF_SIGNED="false"
```

- `pgbouncer=true` tells Prisma to avoid prepared statements (required for PgBouncer transaction pooling).
- `DIRECT_DATABASE_URL` is used by `prisma.config.ts` for migrations.

---

## 2. Self-Hosted PgBouncer for Aiven

### Prerequisites

- Ubuntu server with PgBouncer installed
- Aiven PostgreSQL with host, port, user, password

### Config File: `/etc/pgbouncer/pgbouncer.ini`

Use a single, clean config. Avoid duplicate `[databases]` and `[pgbouncer]` sections.

```ini
[databases]
* = host=YOUR_AIVEN_HOST.aivencloud.com port=YOUR_AIVEN_PORT

[pgbouncer]
listen_port = 6432
listen_addr = 0.0.0.0
auth_type = plain
auth_file = /etc/pgbouncer/userlist.txt
# Transaction mode required for Prisma (releases connections after each transaction)
pool_mode = transaction
max_client_conn = 100
default_pool_size = 10
reserve_pool_size = 5
# Increase if clients often hit query_wait_timeout (default ~120s)
query_wait_timeout = 120
server_tls_sslmode = require
ignore_startup_parameters = extra_float_digits
logfile = /var/log/postgresql/pgbouncer.log
pidfile = /var/run/postgresql/pgbouncer.pid
unix_socket_dir = /var/run/postgresql
```

**Note:** `default_pool_size` is limited by Aiven's connection limit (e.g. ~20–25 on Developer plan). Set it to match or stay below that.

### Auth File: `/etc/pgbouncer/userlist.txt`

For `auth_type = plain`:

```
"avnadmin" "YOUR_PASSWORD"
```

### Important Notes

1. **No `sslmode` in the connection string**  
   PgBouncer 1.12 does not support `sslmode` in the per-database connection string. Use `server_tls_sslmode = require` in `[pgbouncer]` instead.

2. **No duplicate sections**  
   If the config has two `[databases]` or `[pgbouncer]` sections, the later one can override the first and break things.

3. **Log file permissions**  
   Ensure PgBouncer can write to the log file:

   ```bash
   sudo touch /var/log/postgresql/pgbouncer.log
   sudo chown postgres:postgres /var/log/postgresql/pgbouncer.log
   ```

### Log File Permissions

```bash
sudo touch /var/log/postgresql/pgbouncer.log
sudo chown postgres:postgres /var/log/postgresql/pgbouncer.log
```

### Restart

```bash
sudo systemctl restart pgbouncer
```

---

## 3. Verification

### Check PgBouncer status

```bash
sudo systemctl status pgbouncer
```

### Test connection

```bash
PGPASSWORD='YOUR_PASSWORD' psql -h 127.0.0.1 -p 6432 -U avnadmin -d defaultdb -c "SELECT 1"
```

### Test direct Aiven connection (bypass PgBouncer)

```bash
PGPASSWORD='YOUR_PASSWORD' psql -h YOUR_AIVEN_HOST.aivencloud.com -p YOUR_PORT -U avnadmin -d defaultdb -c "SELECT 1"
```

If direct works but PgBouncer fails, the issue is in PgBouncer config.

---

## 4. Troubleshooting

### "no such database: defaultdb"

- **Cause:** Database entry was skipped due to `sslmode` in the connection string.
- **Fix:** Remove `sslmode=require` from the connection string. Use `server_tls_sslmode = require` in `[pgbouncer]` instead.

### "no pg_hba.conf entry... no encryption"

- **Cause:** Backend connections to Aiven are not using SSL.
- **Fix:** Add `server_tls_sslmode = require` in `[pgbouncer]` and ensure no duplicate sections override it.

### "skipping database: unknown parameter"

- **Cause:** PgBouncer 1.12 does not support `sslmode` in the connection string.
- **Fix:** Remove `sslmode` from the connection string.

### Duplicate config sections

- **Cause:** Two `[databases]` or `[pgbouncer]` sections; later sections override earlier ones.
- **Fix:** Remove duplicate sections and keep a single config.

### Log file permission denied

- **Cause:** PgBouncer cannot write to the log file.
- **Fix:** Create the file and set ownership:

  ```bash
  sudo touch /var/log/postgresql/pgbouncer.log
  sudo chown postgres:postgres /var/log/postgresql/pgbouncer.log
  ```

### `query_wait_timeout` (Prisma error 08P01)

- **Cause:** Too many clients are waiting for a connection from the pool. PgBouncer has only `default_pool_size` connections to PostgreSQL; when all are in use, new queries wait. If they wait longer than `query_wait_timeout`, the client is disconnected.
- **Fixes:**
  1. **Increase `default_pool_size`** in PgBouncer (up to Aiven's connection limit).
  2. **Increase `query_wait_timeout`** in PgBouncer (e.g. `query_wait_timeout = 180`).
  3. **Reduce Prisma pool size** in `src/lib/prisma.ts` — set `max: 2` or `max: 3` in the PrismaPg adapter so each Vercel serverless instance uses fewer connections.
  4. **Use `pool_mode = transaction`** — session mode holds connections for the whole session; transaction mode releases them after each query, so the pool can serve more clients.

---

## 5. Summary

| Component | Purpose |
|-----------|---------|
| `@prisma/adapter-pg` | Adapter for Prisma v7 client engine |
| `pg` | Node.js PostgreSQL driver |

| `.env` | Purpose |
|--------|---------|
| `DATABASE_URL` | PgBouncer URL (pooled, for app runtime) |
| `DIRECT_DATABASE_URL` | Direct Aiven URL (for migrations) |

| PgBouncer config | Purpose |
|------------------|---------|
| `* = host=... port=...` | Route all DBs to Aiven |
| `pool_mode = transaction` | Required for Prisma; releases connections after each transaction |
| `default_pool_size` | Connections to PostgreSQL (≤ Aiven limit) |
| `query_wait_timeout` | Max seconds a client waits for a pool slot before disconnect |
| `server_tls_sslmode = require` | Use SSL for backend connections |
| `auth_type = plain` | Match plain password in `userlist.txt` |

---

## 6. Prisma Schema

`prisma/schema.prisma`:

```prisma
generator client {
  provider   = "prisma-client-js"
  output     = "../src/generated/prisma"
  engineType = "library"
}

datasource db {
  provider = "postgresql"
}
```

Connection URLs are in `prisma.config.ts` (Prisma v7).
