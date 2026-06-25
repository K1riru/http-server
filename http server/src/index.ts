import express, { NextFunction, Request, Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "./config.js";

const app = express();
const PORT = 8080;

// Compute __dirname for ES module scope
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
  config.fileserverHits += 1;
  next();
}

function handlerReadiness(_req: Request, res: Response) {
  res.set("Content-Type", "text/plain; charset=utf-8");
  res.send("OK");
}

function handlerMetrics(_req: Request, res: Response) {
  res.set("Content-Type", "text/plain; charset=utf-8");
  res.send(`Hits: ${config.fileserverHits}`);
}

function handlerReset(_req: Request, res: Response) {
  config.fileserverHits = 0;
  res.set("Content-Type", "text/plain; charset=utf-8");
  res.send(`Hits: ${config.fileserverHits}`);
}

app.use(middlewareLogResponses);
app.get("/api/healthz", handlerReadiness);
app.use("/app", middlewareMetricsInc, express.static(path.join(__dirname, "..", "src", "app")));
app.get("/api/metrics", handlerMetrics);
app.get("/api/reset", handlerReset);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});