import type { MigrationConfig } from "drizzle-orm/migrator";

type Config = {
  api: APIConfig;
  db: DBConfig;
  auth: AuthConfig;
};

type APIConfig = {
  fileServerHits: number;
  port: number;
  platform: string;
  secret?: string;
};

type DBConfig = {
  url: string;
  migrationConfig: MigrationConfig;
};

type AuthConfig = {
  jwtSecret: string;
};

process.loadEnvFile();

function envOrThrow(key: string) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value;
}

const migrationConfig: MigrationConfig = {
  migrationsFolder: "./src/db/migrations",
};

export const config: Config = {
  api: {
    fileServerHits: 0,
    port: Number(envOrThrow("PORT")),
    platform: envOrThrow("PLATFORM"),
    secret: envOrThrow("SECRET"),
  },
  db: {
    url: envOrThrow("DB_URL"),
    migrationConfig: migrationConfig,
  },
  auth: {
    jwtSecret: envOrThrow("JWT_SECRET"),
  },
};