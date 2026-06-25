import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = 8080;

// Compute __dirname for ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve the assets folder at /assets
app.use("/assets", express.static(path.join(__dirname, "..", "assets")));

// Serve index.html at the root
app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});