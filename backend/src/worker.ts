// worker.ts
import { Worker } from "bullmq";
import { connection } from "./queue";
import { generateFavicons } from "./processor";
import path from "path";
import fs from "fs-extra";

const worker = new Worker(
  "faviconQueue",
  async (job) => {
    console.log(`Worker: processing job ${job.id} (${job.name})`);

    const { inputPath } = job.data as { inputPath: string };

    // compute unique outputDir per job
    const outputDir = path.join(__dirname, "..", "output", job.id!);
    await fs.ensureDir(outputDir);

    await generateFavicons(inputPath, outputDir);

    return { outputDir, inputPath }; // returned value is accessible in server.ts
  },
  { connection }
);

worker.on("completed", (job) => console.log(`Job ${job.id} completed`));
worker.on("failed", (job, err) => console.error(`Job ${job?.id} failed:`, err));
console.log("Worker started, waiting for jobs...");
