const sharp = require('sharp');
const path = require('path');

const svgPath = path.join(__dirname, '..', 'public', 'favicon.svg');
const svgBuffer = require('fs').readFileSync(svgPath);

const outputs = [
  { name: 'favicon-16.png', size: 16 },
  { name: 'favicon-32.png', size: 32 },
  { name: 'favicon-96.png', size: 96 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'icon-maskable-512.png', size: 512 },
];

async function main() {
  for (const o of outputs) {
    const outPath = path.join(__dirname, '..', 'public', o.name);
    let pipeline = sharp(svgBuffer).resize(o.size, o.size);
    if (o.name === 'icon-maskable-512.png') {
      // Maskable: scale logo down to ~70% and center on solid background
      const inner = await sharp(svgBuffer).resize(358, 358).toBuffer();
      pipeline = sharp({
        create: { width: 512, height: 512, channels: 4, background: { r: 13, g: 12, b: 11, alpha: 1 } }
      }).composite([{ input: inner, gravity: 'center' }]).png();
    } else if (o.name === 'apple-touch-icon.png') {
      // Apple touch icon: solid background, no transparency, logo centered with padding
      const inner = await sharp(svgBuffer).resize(140, 140).toBuffer();
      pipeline = sharp({
        create: { width: 180, height: 180, channels: 4, background: { r: 13, g: 12, b: 11, alpha: 1 } }
      }).composite([{ input: inner, gravity: 'center' }]).png();
    }
    await pipeline.png().toFile(outPath);
    console.log('Generated', o.name);
  }

  // Multi-resolution ICO
  const sizes = [16, 32, 48];
  const pngs = [];
  for (const s of sizes) {
    pngs.push(await sharp(svgBuffer).resize(s, s).png().toBuffer());
  }
  // Build ICO file
  const headerSize = 6 + sizes.length * 16;
  const ico = Buffer.alloc(headerSize + pngs.reduce((a, b) => a + b.length, 0));
  ico.writeUInt16LE(0, 0);
  ico.writeUInt16LE(1, 2);
  ico.writeUInt16LE(sizes.length, 4);
  let offset = headerSize;
  for (let i = 0; i < sizes.length; i++) {
    const s = sizes[i];
    const png = pngs[i];
    const base = 6 + i * 16;
    ico.writeUInt8(s === 256 ? 0 : s, base);
    ico.writeUInt8(s === 256 ? 0 : s, base + 1);
    ico.writeUInt16LE(0, base + 2);
    ico.writeUInt16LE(1, base + 4);
    ico.writeUInt16LE(png.length, base + 8);
    ico.writeUInt32LE(offset, base + 12);
    png.copy(ico, offset);
    offset += png.length;
  }
  require('fs').writeFileSync(path.join(__dirname, '..', 'public', 'favicon.ico'), ico);
  console.log('Generated favicon.ico');
}

main().catch(console.error);
