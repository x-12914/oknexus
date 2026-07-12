import "dotenv/config";
import { defineConfig, env } from "@prisma/config";

// Runtime uses a driver adapter (see src/lib/db.ts); the CLI (generate/db push/
// migrate) needs the connection string here.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
