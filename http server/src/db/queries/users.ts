import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "../index.js";
import { NewUser, users, UserResponse, refreshTokens, NewRefreshToken, RefreshTokenResponse } from "../schema.js";

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

export async function createRefreshToken(
  options: { token: string; userId: string; expiresAt: Date },
) {
  const [result] = await db
    .insert(refreshTokens)
    .values(options)
    .returning();
  return result;
}

export async function getUserFromRefreshToken(
  token: string,
): Promise<{ user: UserResponse; refreshToken: RefreshTokenResponse } | undefined> {
  const result = await db
    .select({
      user: users,
      refreshToken: refreshTokens,
    })
    .from(refreshTokens)
    .innerJoin(users, eq(refreshTokens.userId, users.id))
    .where(
      and(
        eq(refreshTokens.token, token),
        isNull(refreshTokens.revokedAt),
        gt(refreshTokens.expiresAt, new Date()),
      ),
    );
  return result[0];
}

export async function revokeRefreshToken(token: string) {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.token, token));
}
