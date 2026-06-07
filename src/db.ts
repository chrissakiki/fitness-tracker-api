import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import type { Database } from "./db/type";

const getDatabaseUrl = (): string | undefined => {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const { POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB } = process.env;
  if (!POSTGRES_USER || !POSTGRES_PASSWORD || !POSTGRES_DB) return undefined;

  const host = process.env.POSTGRES_HOST ?? "localhost";
  const port = process.env.POSTGRES_PORT ?? "5432";
  return `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${host}:${port}/${POSTGRES_DB}`;
};

const databaseUrl = getDatabaseUrl();

const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : undefined;

export const db = pool
  ? new Kysely<Database>({
      dialect: new PostgresDialect({ pool }),
    })
  : undefined;
