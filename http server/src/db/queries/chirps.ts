import { db } from "../index.js";
import { chirps, NewChirp } from "../schema.js";
import { asc } from "drizzle-orm";
import { eq } from "drizzle-orm";

export async function createChirp(chirp: NewChirp) {
  const [rows] = await db.insert(chirps).values(chirp).returning();
  return rows;
}

export async function getAllChirps() {
    const results = await db
    .select()
    .from(chirps)
    .orderBy(asc(chirps.createdAt));

    return results.map((chirp) => ({
        id: chirp.id,
        createdAt: chirp.createdAt,
        updatedAt: chirp.updatedAt,
        body: chirp.body,
        userId: chirp.userId,
    }));
}

export async function getChirpById(chirpId: string) {
    const[result] = await db
        .select()
        .from(chirps)
        .where(eq(chirps.id, chirpId));

    return result;

    


}