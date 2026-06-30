import type { Request, Response } from "express";

import { createUser, getUserByEmail } from "../db/queries/users.js";
import { createHashedPassword, hashPassword, makeJWT } from "../auth.js";
import { BadRequestError } from "./errors.js";
import { respondWithJSON } from "./json.js";
import { config } from "../config.js";

export async function handlerUsersCreate(req: Request, res: Response) {
  type parameters = Omit<Parameters<typeof createUser>[0], "hashedPassword"> & { password: string };
  const params: parameters = req.body;

  if (!params.email || !params.password) {
    throw new BadRequestError("Missing required fields");
  }

  const hashedPassword = await createHashedPassword(params.password);
  const user = await createUser({ email: params.email, hashedPassword });

  if (!user) {
    throw new Error("Could not create user");
  }

  respondWithJSON(res, 201, {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });
}

export async function handlerUsersLogin(req: Request, res: Response) {
  const body = req.body;

  if (!body.password || !body.email) {
    throw new BadRequestError("Missing required fields");
  }

  const user = await getUserByEmail(body.email);

  if (!user) {
    respondWithJSON(res, 401, "incorrect email or password");
    return;
  }

  const isValidPassword = await hashPassword(body.password, user.hashedPassword!);

  if (!isValidPassword) {
    respondWithJSON(res, 401, "incorrect email or password");
    return;
  }

  // Determine expiration time: default to 1 hour (3600s), cap at 1 hour if specified value exceeds it
  const expiresInSeconds = body.expiresInSeconds !== undefined ? Math.min(body.expiresInSeconds, 3600) : 3600;

  // Generate JWT token
  const token = makeJWT(user.id, expiresInSeconds, config.auth.jwtSecret);

  // Return a copy of the user without the hashed password and include the token
  respondWithJSON(res, 200, {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    token: token,
  });
}
