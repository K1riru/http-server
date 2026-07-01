import type { NextFunction, Request, Response } from "express";

import { respondWithJSON } from "./json.js";
import {
  createChirp,
  deleteChirpById,
  getAllChirps,
  getChirpById,
} from "../db/queries/chirps.js";
import { BadRequestError } from "./errors.js";
import { getBearerToken, validateJWT } from "../auth.js";
import { config } from "../config.js";

export async function handlerChirpsCreate(req: Request, res: Response) {
  const token = getBearerToken(req);

  let userId: string | null = null;

  try {
    userId = validateJWT(token, config.auth.jwtSecret);
  } catch {
    return res.sendStatus(401);
  }

  if (!userId) {
    return res.sendStatus(401);
  }

  const params = req.body as { body: string };

  const cleaned = validateChirp(params.body);

  try {
    const chirp = await createChirp({ body: cleaned, userId });
    return respondWithJSON(res, 201, chirp);
  } catch (err) {
    console.error("Error creating chirp:", err);
    throw err;
  }
}

function validateChirp(body: string) {
  const maxChirpLength = 140;
  if (body.length > maxChirpLength) {
    throw new BadRequestError(
      `Chirp is too long. Max length is ${maxChirpLength}`,
    );
  }

  const badWords = ["kerfuffle", "sharbert", "fornax"];
  return getCleanedBody(body, badWords);
}

function getCleanedBody(body: string, badWords: string[]) {
  const words = body.split(" ");

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const loweredWord = word.toLowerCase();
    if (badWords.includes(loweredWord)) {
      words[i] = "****";
    }
  }

  const cleaned = words.join(" ");
  return cleaned;
}

type Chirp = Awaited<ReturnType<typeof getAllChirps>>[number];
type SortOrder = "asc" | "desc";

export function sortChirpsByCreatedAt(chirps: Chirp[], sort: SortOrder) {
  return [...chirps].sort((a, b) => {
    const diff = a.createdAt.getTime() - b.createdAt.getTime();
    return sort === "asc" ? diff : -diff;
  });
}

export function getSortOrder(req: Request): SortOrder {
  const sortQuery = req.query.sort;

  if (typeof sortQuery === "string" && sortQuery === "desc") {
    return "desc";
  }

  return "asc";
}

export async function handlerGetChirps(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const authorIdQuery = req.query.authorId;
    const authorId = typeof authorIdQuery === "string" ? authorIdQuery : undefined;
    const sortOrder = getSortOrder(req);
    const chirps = await getAllChirps(authorId);

    res.status(200).json(sortChirpsByCreatedAt(chirps, sortOrder));
  } catch (err) {
    next(err);
  }
}

export async function handlerGetChirp(req: Request, res: Response) {
  const chirpId = req.params.chirpId as string;
  const chirp = await getChirpById(chirpId);

  if (!chirp) {
    res.status(404).json({ error: "Chirp not found" });
    return;
  }

  res.status(200).json(chirp);
}

export async function handlerDeleteChirp(req: Request, res: Response) {
  let userId: string;

  try {
    const token = getBearerToken(req);
    userId = validateJWT(token, config.auth.jwtSecret);
  } catch {
    return res.sendStatus(401);
  }

  const chirpId = req.params.chirpId as string;
  const chirp = await getChirpById(chirpId);

  if (!chirp) {
    return res.sendStatus(404);
  }

  if (chirp.userId !== userId) {
    return res.sendStatus(403);
  }

  const deleted = await deleteChirpById(chirpId);

  if (!deleted) {
    return res.sendStatus(404);
  }

  return res.sendStatus(204);
}
