import type { Request, Response } from "express";

import { respondWithJSON } from "./json.js";
import { createChirp } from "../db/queries/chirps.js";
import { BadRequestError } from "./errors.js";
import { getAllChirps } from "../db/queries/chirps.js";
import { getChirpById } from "../db/queries/chirps.js";
import { deleteChirpById } from "../db/queries/chirps.js";
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

export async function handlerGetChirps(req: Request, res: Response, next: Function) {
    try {
        const chirps = await getAllChirps();
        res.status(200).json(chirps);
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
    const chirpId = req.params.chirpId as string;
    const deletedChirp = await deleteChirpById(chirpId);

    if (!deletedChirp || deletedChirp.body.length === 0) {
        res.status(404).json({ error: "Chirp not found" });
        return;
    }

    res.status(204).json({ message: "Chirp deleted successfully" });
}