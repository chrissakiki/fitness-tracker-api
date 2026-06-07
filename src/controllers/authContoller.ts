import bcrypt from "bcrypt";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { db } from "../db";

type LoginBody = {
  email?: string;
  password?: string;
};

type SignupBody = {
  email?: string;
  password?: string;
  first_name?: string;
  last_name?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BCRYPT_ROUNDS = 10;

const isUniqueViolation = (err: unknown): boolean => {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    err.code === "23505"
  );
};

export const login = async (req: Request, res: Response): Promise<void> => {
  if (!db) {
    res.status(503).json({ error: "Database not configured" });
    return;
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    res.status(503).json({ error: "JWT not configured" });
    return;
  }

  const { email, password } = req.body as LoginBody;

  if (!email?.trim() || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const user = await db
      .selectFrom("users")
      .select(["id", "email", "password_hash", "first_name", "last_name"])
      .where("email", "=", normalizedEmail)
      .executeTakeFirst();

    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = jwt.sign({ sub: user.id }, jwtSecret, {
      expiresIn: (process.env.JWT_EXPIRES_IN ?? "7d") as jwt.SignOptions["expiresIn"],
    });

    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
      },
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to login" });
  }
};

export const signup = async (req: Request, res: Response): Promise<void> => {
  if (!db) {
    res.status(503).json({ error: "Database not configured" });
    return;
  }

  const { email, password, first_name, last_name } = req.body as SignupBody;

  if (!email?.trim() || !password || !first_name?.trim() || !last_name?.trim()) {
    res.status(400).json({
      error: "email, password, first_name, and last_name are required",
    });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    res.status(400).json({ error: "Invalid email format" });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  try {
    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await db
      .insertInto("users")
      .values({
        email: normalizedEmail,
        password_hash,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
      })
      .returning(["id", "email", "first_name", "last_name", "created_at"])
      .executeTakeFirstOrThrow();

    res.status(201).json({ user });
  } catch (err) {
    if (isUniqueViolation(err)) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    console.error(err);
    res.status(500).json({ error: "Failed to create account" });
  }
};
