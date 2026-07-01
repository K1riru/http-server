import { asc, eq } from "drizzle-orm";

import { db } from "../index.js";
import { chirps, NewChirp } from "../schema.js";

export async function createChirp(chirp: NewChirp) {
  const [rows] = await db.insert(chirps).values(chirp).returning();
  return rows;
}

export async function getAllChirps(authorId?: string) {
  const query = db.select().from(chirps);

  const results = authorId
    ? await query.where(eq(chirps.userId, authorId)).orderBy(asc(chirps.createdAt))
    : await query.orderBy(asc(chirps.createdAt));

  return results.map((chirp) => ({
    id: chirp.id,
    createdAt: chirp.createdAt,
    updatedAt: chirp.updatedAt,
    body: chirp.body,
    userId: chirp.userId,
  }));
}

export async function getChirpById(chirpId: string) {
  const [result] = await db
    .select()
    .from(chirps)
    .where(eq(chirps.id, chirpId));

  return result;
}

export async function deleteChirpById(chirpId: string) {
  const [result] = await db
    .delete(chirps)
    .where(eq(chirps.id, chirpId))
    .returning();

  return result;
}
