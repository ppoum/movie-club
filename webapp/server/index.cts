const express = require("express");
const fs = require("fs/promises");
const path = require("path");

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
const distPath = path.resolve(__dirname, DIST_DIR);
app.use(express.static(distPath));

// Fallback to vite app
app.get("*all", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
