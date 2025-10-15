const JimpModule = require("jimp");
const Jimp = JimpModule.default || JimpModule;
const fs = require("fs");
const path = require("path");

const assets = ["assets/icon.png", "assets/adaptive-icon.png"];

async function makeSquare(srcPath) {
  try {
    const img = await Jimp.read(srcPath);
    const w = img.bitmap.width;
    const h = img.bitmap.height;
    const size = Math.max(w, h);
    const bg = new Jimp(size, size, 0xffffffff); // white background
    const x = Math.floor((size - w) / 2);
    const y = Math.floor((size - h) / 2);
    bg.composite(img, x, y);
    const dir = path.dirname(srcPath);
    const base = path.basename(srcPath, path.extname(srcPath));
    const out = path.join(dir, base + "-sq.png");
    await bg.writeAsync(out);
    console.log(`Wrote ${out} (from ${w}x${h} to ${size}x${size})`);
  } catch (err) {
    console.error("Failed to process", srcPath, err);
    process.exitCode = 1;
  }
}

(async () => {
  for (const a of assets) {
    if (fs.existsSync(a)) {
      await makeSquare(a);
    } else {
      console.warn("Missing asset, skipping:", a);
    }
  }
})();
