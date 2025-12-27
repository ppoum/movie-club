import express from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = 3000;

// TODO: refactor into env var
const DATA_PATH = "../out.json";

app.get("/api/data", async (_req, res) => {
  let json: string;
  try {
    json = await fs.readFile(DATA_PATH, "utf-8");
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
const distPath = path.resolve(__dirname, "../dist/");
app.use(express.static(distPath));

// Fallback to vite app
app.get("*all", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
