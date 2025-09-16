import { Worker } from "bullmq";
import { connection } from "./queue";
import { generateFavicons } from "./processor";
const worker = new Worker(
  "faviconQueue",
  async (job) => {
    console.log(`Worker: processing job ${job.id} (${job.name})`);

    const { inputPath, outputDir } = job.data as {
      inputPath: string;
      outputDir: string;
    };

    await generateFavicons(inputPath, outputDir);
    return { ok: true, outputDir };
  },
  { connection }
);

worker.on("completed", (job) => console.log(`Job ${job.id} completed`));
worker.on("failed", (job, err) => console.error(`Job ${job?.id} failed:`, err));
console.log("Worker started, waiting for jobs...");
