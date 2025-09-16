import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import toIco from "to-ico";

export async function generateFavicons(inputPath: string, outputDir: string) {
  await fs.mkdir(outputDir, { recursive: true });

  const sizes = [16, 32, 48, 64, 128];

  const pngBuffers = await Promise.all(
    sizes.map((s) =>
      sharp(inputPath)
        .resize(s, s, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer()
    )
  );

  await Promise.all(
    pngBuffers.map((buf, idx) =>
      fs.writeFile(path.join(outputDir, `favicon-${sizes[idx]}.png`), buf)
    )
  );

  const icoBuffer = await toIco(pngBuffers);
  await fs.writeFile(path.join(outputDir, "favicon.ico"), icoBuffer);

  console.log(`Generated favicons in: ${outputDir}`);
}
