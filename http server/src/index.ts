import express, { NextFunction, Request, Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "./config.js";
import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import { createChirp } from "./db/queries/chirps.js";

const migrationClient = postgres(config.db.url, { max: 1 });
await migrate(drizzle(migrationClient), config.db.migrationConfig);

const app = express();
app.use(express.json());
const PORT = 8080;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function middlewareLogResponses(req: Request, res: Response, next: NextFunction) {
  res.on("finish", () => {
    const statusCode = res.statusCode;

    if (statusCode !== 200) {
      console.log(`[NON-OK] ${req.method} ${req.url} - Status: ${statusCode}`);
    }
  });

  next();
}

function middlewareMetricsInc(_req: Request, _res: Response, next: NextFunction) {
  config.api.fileserverHits += 1;
  next();
}

class HttpError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
  }
}

class BadRequestError extends HttpError {
  constructor(message: string = "Bad Request") {
    super(message, 400);
    this.name = "BadRequestError";
  }
}

class UnauthorizedError extends HttpError {
  constructor(message: string = "Unauthorized") {
    super(message, 401);
    this.name = "UnauthorizedError";
  }
}

class ForbiddenError extends HttpError {
  constructor(message: string = "Forbidden") {
    super(message, 403);
    this.name = "ForbiddenError";
  }
}

class NotFoundError extends HttpError {
  constructor(message: string = "Not Found") {
    super(message, 404);
    this.name = "NotFoundError";
  }
}

function isHttpError(error: unknown): error is HttpError {
  return typeof error === "object" && error !== null && "statusCode" in error && typeof (error as { statusCode?: unknown }).statusCode === "number";
}

function middlewareErrorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (isHttpError(err)) {
    console.log(err);
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  console.log("Unexpected error:", err);
  res.status(500).json({ error: "Something went wrong on our end" });
}

function handlerReadiness(_req: Request, res: Response) {
  res.set("Content-Type", "text/plain; charset=utf-8");
  res.send("OK");
}

function handlerMetrics(_req: Request, res: Response) {
  res.set("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html>
  <body>
    <h1>Welcome, Chirpy Admin</h1>
    <p>Chirpy has been visited ${config.api.fileserverHits} times!</p>
  </body>
</html>`);
}

async function handlerReset(_req: Request, res: Response, next: NextFunction) {
  try {
    if (config.api.platform !== "dev") {
      throw new ForbiddenError("Forbidden");
    }

    const { deleteAllUsers } = await import("./db/queries/users.js");
    await deleteAllUsers();

    config.api.fileserverHits = 0;
    res.set("Content-Type", "text/plain; charset=utf-8");
    res.send(`Hits: ${config.api.fileserverHits}`);
  } catch (err) {
    next(err);
  }
}
  

async function handlerCreateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body as { email?: string } | undefined;
    const email = typeof body === "object" && body !== null ? body.email : undefined;

    if (typeof email !== "string") {
      throw new BadRequestError("Missing or invalid email");
    }

    const { createUser } = await import("./db/queries/users.js");
    const user = await createUser({ email });

    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}


async function handlerCreateChirp(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body as { body?: string; userId?: string; } | undefined;
    const chirpBody = typeof body === "object" && body !== null ? body.body : undefined;

    if (typeof chirpBody !== "string") {
      throw new BadRequestError("Something went wrong");
    }

    if (chirpBody.length > 140) {
      throw new BadRequestError("Chirp is too long. Max length is 140");
    }

    const userId = typeof body === "object" && body !== null ? body.userId : undefined;
    if (typeof userId !== "string") {
      throw new BadRequestError("Missing or invalid userId");
    }

    const profaneWords = ["kerfuffle", "sharbert", "fornax"];
    const words = chirpBody.split(" ");
    const cleanedWords = words.map((word) => {
      const normalizedWord = word.toLowerCase();
      if (profaneWords.includes(normalizedWord)) {
        return "****";
      }
      return word;
    });
    const cleanedBody = cleanedWords.join(" ");

    const createdChirp = await createChirp({ body: cleanedBody, userId});

    res.status(201).json(createdChirp);
  } catch (err) {
    next(err);
  }
}

app.use(middlewareLogResponses);
app.use("/app", middlewareMetricsInc, express.static(path.join(__dirname, "..", "src", "app")));
app.get("/api/healthz", handlerReadiness);

app.get("/admin/metrics", handlerMetrics);
app.post("/admin/reset", handlerReset);
app.post("/api/users", handlerCreateUser);
app.post("/api/chirps", handlerCreateChirp);


app.use(middlewareErrorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

