import { eq } from "drizzle-orm";
import { db } from "../index.js";
import { NewUser, users, UserResponse } from "../schema.js";

export async function createUser(user: NewUser) {
  const [result] = await db
    .insert(users)
    .values(user)
    .onConflictDoNothing()
    .returning();
  return result;
}

export async function reset() {
  await db.delete(users);
}

export async function getUserByEmail(email: string): Promise<UserResponse | undefined> {
  const [result] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result;
}
