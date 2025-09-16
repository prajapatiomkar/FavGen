// server.ts
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { faviconQueue } from "./queue";
import archiver from "archiver";
import fsExtra from "fs-extra";

const app = express();
const PORT = process.env.PORT || 3000;

const uploadsDir = path.join(__dirname, "..", "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

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

  try {
    const job = await faviconQueue.add(
      "generate",
      { inputPath }, // only send inputPath, worker will decide outputDir
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      }
    );
    return res.json({ message: "Job queued", jobId: job.id });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to queue job" });
  }
});

app.get("/download/:jobId", async (req, res) => {
  const { jobId } = req.params;
  const job = await faviconQueue.getJob(jobId);

  if (!job) return res.status(404).json({ error: "Job not found" });

  // read worker return value
  const { outputDir, inputPath } = job.returnvalue as {
    outputDir: string;
    inputPath: string;
  };

  if (!fs.existsSync(outputDir)) {
    return res.status(404).json({ error: "Generated files not found" });
  }

  res.setHeader(
    "Content-Disposition",
    `attachment; filename=favicons-${jobId}.zip`
  );
  res.setHeader("Content-Type", "application/zip");

  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.pipe(res);
  archive.directory(outputDir, false);

  // cleanup after archiving finishes
  archive.on("end", async () => {
    try {
      await fsExtra.remove(outputDir);
      await fsExtra.remove(inputPath);
      console.log(`Cleaned up job ${jobId}`);
    } catch (err) {
      console.error("Cleanup error:", err);
    }
  });

  await archive.finalize();
});

app.listen(PORT, () =>
  console.log(`Server listening on http://localhost:${PORT}`)
);
