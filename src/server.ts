import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import { sql } from "kysely";
import routes from "./routes";
import { db } from "./db";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use("/api", routes);

app.get("/", (req: Request, res: Response) => {
  res.send("Fitness Tracker API");
});

app.get("/health/db", async (_req: Request, res: Response) => {
  if (!db) {
    res.status(503).json({
      ok: false,
      error: "Database not configured",
    });
    return;
  }
  try {
    const result = await sql<{ ok: number }>`SELECT 1 AS ok`.execute(db);
    res.json({ ok: true, db: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Database unreachable" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
