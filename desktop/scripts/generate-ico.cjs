const fs = require('fs');
const path = require('path');

const pngPath = path.join(__dirname, '../build/icon.png');
const icoPath = path.join(__dirname, '../build/icon.ico');

if (!fs.existsSync(pngPath)) {
  console.error('icon.png not found at', pngPath);
  process.exit(1);
}

const pngBuffer = fs.readFileSync(pngPath);

// Windows Vista+ icon container embedding 256x256 PNG directly
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // Reserved
header.writeUInt16LE(1, 2); // Icon type (1 = icon)
header.writeUInt16LE(1, 4); // Number of images (1)

const entry = Buffer.alloc(16);
entry.writeUInt8(0, 0); // Width: 0 means 256px
entry.writeUInt8(0, 1); // Height: 0 means 256px
entry.writeUInt8(0, 2); // Color count: 0 (no palette)
entry.writeUInt8(0, 3); // Reserved: 0
entry.writeUInt16LE(1, 4); // Color planes: 1
entry.writeUInt16LE(32, 6); // Bits per pixel: 32
entry.writeUInt32LE(pngBuffer.length, 8); // Image size in bytes
entry.writeUInt32LE(22, 12); // Offset to image data (6 header + 16 entry = 22)

const icoBuffer = Buffer.concat([header, entry, pngBuffer]);
fs.writeFileSync(icoPath, icoBuffer);

console.log(`Generated icon.ico successfully (${icoBuffer.length} bytes)`);

