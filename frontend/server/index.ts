import express from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

const PORT = process.env.PORT || 3000;
const DATA_FILE = process.env.DATA_FILE_PATH || "../stats.json";
const DIST_DIR = process.env.FRONTEND_DIST_DIR || "../dist/";

app.get("/api/data", async (_req, res) => {
  let json: string;
  try {
    json = await fs.readFile(DATA_FILE, "utf-8");
  } catch {
    return res.status(500).json({ error: "Failed to read JSON file" });
  }

  try {
    res.json(JSON.parse(json));
  } catch {
    return res.status(500).json({ error: "Failed to parse JSON file" });
  }
});

// Serve static app
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, DIST_DIR);
app.use(express.static(distPath));

// Fallback to vite app
app.get("*all", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
