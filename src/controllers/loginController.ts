import { Request, Response } from "express";

export const login = async (req: Request, res: Response): Promise<void> => {
  res.status(501).json({ error: "test" });
}
