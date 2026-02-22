import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Runtime: PgBouncer pooled connection (DATABASE_URL)
    // Migrations: Direct Aiven connection (DIRECT_DATABASE_URL)
    url: process.env.DATABASE_URL!,
    directUrl: process.env.DIRECT_DATABASE_URL,
  },
});
