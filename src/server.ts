import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import { Pool } from "pg";
import routes from "./routes";

const app = express();
const PORT = process.env.PORT || 3000;

const  getDatabaseUrl = (): string | undefined => {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const { POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB } = process.env;
  if (!POSTGRES_USER || !POSTGRES_PASSWORD || !POSTGRES_DB) return undefined;

  const host = process.env.POSTGRES_HOST ?? "localhost";
  const port = process.env.POSTGRES_PORT ?? "5432";
  return `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${host}:${port}/${POSTGRES_DB}`;
}

const databaseUrl = getDatabaseUrl();
const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : undefined;

app.use(cors());
app.use(express.json());
app.use("/api", routes);

app.get("/", (req: Request, res: Response) => {
  res.send("Fitness Tracker API");
});

app.get("/health/db", async (_req: Request, res: Response) => {
  if (!pool) {
    res.status(503).json({
      ok: false,
      error: "Database not configured",
    });
    return;
  }
  try {
    const result = await pool.query<{ ok: number }>("SELECT 1 AS ok");
    res.json({ ok: true, db: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Database unreachable" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
