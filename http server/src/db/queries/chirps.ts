import { db } from "../index.js";
import { chirps } from "../schema.js";
import type { NewChirp } from "../schema.js";

export async function createChirp(chirp: NewChirp) {
  const [result] = await db.insert(chirps).values(chirp).returning();
  return result;
}