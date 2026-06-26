process.loadEnvFile();
import type { MigrationConfig } from "drizzle-orm/migrator";

function envOrThrow(key: string): string {
  const value = process.env[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

const migrationConfig: MigrationConfig = {
  migrationsFolder: "./src/db/migrations",
};

type DBConfig = {
  url: string;
  migrationConfig: MigrationConfig;
};

type APIConfig = {
  platform: string;
  dbURL: string;
  fileserverHits: number;
};

export const config: { api: APIConfig; db: DBConfig } = {
  api: {
    platform: envOrThrow("PLATFORM"),
    dbURL: envOrThrow("DB_URL"),
    fileserverHits: 0,
  },
  db: {
    url: envOrThrow("DB_URL"),
    migrationConfig,
  },
};
