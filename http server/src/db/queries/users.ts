import { db } from "../index.js";
import { users, type NewUser } from "../schema.js";

export async function createUser(user: NewUser) {
  const [result] = await db
    .insert(users)
    .values(user)
    .returning();
  return result;
}

export async function deleteAllUsers() {
  await db.delete(users);
}