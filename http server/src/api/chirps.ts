import type { Request, Response } from "express";

import { respondWithJSON } from "./json.js";
import { createChirp } from "../db/queries/chirps.js";
import { BadRequestError } from "./errors.js";
import { getAllChirps } from "../db/queries/chirps.js";
import { getChirpById } from "../db/queries/chirps.js";
import { getBearerToken, validateJWT } from "../auth.js";
import { config } from "../config.js";

export async function handlerChirpsCreate(req: Request, res: Response) {
  let token = getBearerToken(req);

  const userId = validateJWT(token, config.auth.jwtSecret);

  type parameters = {
    body: string;
  };

  const params: parameters = req.body;

  const cleaned = validateChirp(params.body);
  
  try {
    const chirp = await createChirp({ body: cleaned, userId });
    respondWithJSON(res, 201, chirp);
  } catch (err) {
    console.error("Error creating chirp:", err);
    
    // Check if it's a foreign key constraint violation (user doesn't exist)
    const fkError = err as any;
    if (fkError.code === "23503" || fkError.detail?.includes("foreign key") || fkError.message?.includes("foreign key")) {
      throw new BadRequestError(
        `User with ID ${userId} not found. Please ensure the user exists before creating a chirp.`
      );
    }
    
    // Re-throw other errors to be handled by error middleware
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