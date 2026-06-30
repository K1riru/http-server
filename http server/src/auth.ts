import * as argon2 from "argon2";
import jwt, { type JwtPayload } from "jsonwebtoken";

export async function createHashedPassword(password: string): Promise<string> {
  const hashed = await argon2.hash(password);
  return hashed;
}

export function hashPassword(password: string, hash: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

type payload = Pick<JwtPayload, "iss" | "sub" | "iat" | "exp">;

function makeJWT(userID: string, expiresIn: number, secret: string): string {
  return jwt.sign(
    {
      iss: "chirpy",
      sub: userID,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + expiresIn,
    },
    secret,
  );
}

function validateJWT(tokenString: string, secret: string): string {
  const decoded = jwt.verify(tokenString, secret) as JwtPayload & { sub?: string };
  if (!decoded.sub) {
    throw new Error("Token missing 'sub' claim");
  }
  return decoded.sub;
}

export { makeJWT, validateJWT };

export function getBearerToken(req: Request): string {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw new Error("Missing Authorization header");
  }

  // Strip "Bearer " prefix if present (handles both standard and test framework formats)
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  return authHeader;
}
