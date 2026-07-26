const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

async function generateIcons() {
  const rootDir = path.resolve(__dirname, "..");
  const svgPath = path.join(rootDir, "public", "icon.svg");
  const svgBuffer = fs.readFileSync(svgPath);

  const targets = [
    { file: path.join(rootDir, "public", "favicon-48x48.png"), size: 48 },
    { file: path.join(rootDir, "public", "icon-96x96.png"), size: 96 },
    { file: path.join(rootDir, "public", "icon-192x192.png"), size: 192 },
    { file: path.join(rootDir, "public", "icon-512x512.png"), size: 512 },
    { file: path.join(rootDir, "public", "apple-touch-icon.png"), size: 180 },
    { file: path.join(rootDir, "public", "icon.png"), size: 512 },
    { file: path.join(rootDir, "app", "icon.png"), size: 512 },
    { file: path.join(rootDir, "app", "apple-icon.png"), size: 180 },
  ];

  for (const { file, size } of targets) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png({ compressionLevel: 9, quality: 100 })
      .toFile(file);
    console.log(`Generated: ${path.relative(rootDir, file)} (${size}x${size})`);
  }

  // Also create favicon.ico in app directory using 48x48 PNG buffer
  const ico48Buffer = await sharp(svgBuffer)
    .resize(48, 48)
    .png()
    .toBuffer();
    
  fs.writeFileSync(path.join(rootDir, "app", "favicon.ico"), ico48Buffer);
  fs.writeFileSync(path.join(rootDir, "public", "favicon.ico"), ico48Buffer);
  console.log("Updated app/favicon.ico and public/favicon.ico");
}

generateIcons().catch((err) => {
  console.error("Error generating icons:", err);
  process.exit(1);
});
