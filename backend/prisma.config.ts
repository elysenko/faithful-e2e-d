// Prisma 7 configuration file.
//
// DATABASE_URL is injected via environment variable at runtime (K8s secret /
// Docker ENV). dotenv is intentionally absent — it is not installed in
// backend/package.json and is not needed in Docker or K8s contexts.
//
// datasource.url is intentionally absent — Prisma 7.8+ requires the
// connection URL to be passed to the PrismaClient constructor via the
// @prisma/adapter-pg driver adapter, not via this config file.
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
});
