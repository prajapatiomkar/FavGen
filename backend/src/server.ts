import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { faviconQueue } from "./queue";

const app = express();
const PORT = process.env.PORT || 3000;

const uploadsDir = path.join(__dirname, "..", "uploads");
const outputBase = path.join(__dirname, "..", "output");
fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(outputBase, { recursive: true });

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (_req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

app.get("/", (_req, res) =>
  res.send("Favicon pipeline API — POST /upload (form field: image)")
);

app.post("/upload", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ error: "No file uploaded (field name: image)" });
  }

  const inputPath = req.file.path;
  const name = path.parse(req.file.fieldname).name;
  const outputDir = path.join(outputBase, name);
  fs.mkdirSync(outputDir, { recursive: true });

  try {
    const job = await faviconQueue.add(
      "generate",
      {
        inputPath,
        outputDir,
      },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      }
    );
    return res.json({ message: "Job queued", jobId: job.id, outputDir });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to queue job" });
  }
});

app.listen(PORT, () =>
  console.log(`Server listening on http://localhost:${PORT}`)
);
