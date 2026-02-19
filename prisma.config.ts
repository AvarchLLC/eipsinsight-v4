import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Direct Aiven URL for migrations & prisma generate (not the Accelerate proxy)
    url: process.env.DIRECT_DATABASE_URL!,
  },
});
