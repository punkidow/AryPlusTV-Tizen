const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Standard CRC32 calculation
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c >>> 0;
}
function crc32(buf) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
        crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

function packWgt(rootDir, filesAndDirs, outputFile) {
    const entries = [];

    function addFile(fullPath, archivePath) {
        // Enforce POSIX forward slashes
        const normalized = archivePath.replace(/\\/g, '/');
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            entries.push({
                name: normalized.endsWith('/') ? normalized : normalized + '/',
                isDir: true,
                data: Buffer.alloc(0)
            });
            const sub = fs.readdirSync(fullPath);
            for (const s of sub) {
                addFile(path.join(fullPath, s), (normalized.endsWith('/') ? normalized : normalized + '/') + s);
            }
        } else {
            const data = fs.readFileSync(fullPath);
            entries.push({
                name: normalized,
                isDir: false,
                data
            });
        }
    }

    for (const item of filesAndDirs) {
        const fullPath = path.join(rootDir, item);
        if (fs.existsSync(fullPath)) {
            addFile(fullPath, item);
        }
    }

    const localHeaders = [];
    const centralHeaders = [];
    let offset = 0;

    for (const entry of entries) {
        const nameBuf = Buffer.from(entry.name, 'utf8');
        const uncompressedSize = entry.data.length;
        const compressedData = entry.isDir ? Buffer.alloc(0) : zlib.deflateRawSync(entry.data);
        const compressedSize = compressedData.length;
        const crc = entry.isDir ? 0 : crc32(entry.data);

        // Local header (30 bytes + name length)
        const lh = Buffer.alloc(30);
        lh.writeUInt32LE(0x04034b50, 0);
        lh.writeUInt16LE(20, 4);
        lh.writeUInt16LE(0x0800, 6); // UTF-8 filename flag
        lh.writeUInt16LE(entry.isDir ? 0 : 8, 8); // Store or Deflate
        lh.writeUInt16LE(0, 10);
        lh.writeUInt16LE(0, 12);
        lh.writeUInt32LE(crc, 14);
        lh.writeUInt32LE(compressedSize, 18);
        lh.writeUInt32LE(uncompressedSize, 22);
        lh.writeUInt16LE(nameBuf.length, 26);
        lh.writeUInt16LE(0, 28);

        localHeaders.push(lh, nameBuf, compressedData);

        // Central directory header (46 bytes + name length)
        const ch = Buffer.alloc(46);
        ch.writeUInt32LE(0x02014b50, 0);
        ch.writeUInt16LE(20, 4);
        ch.writeUInt16LE(20, 6);
        ch.writeUInt16LE(0x0800, 8);
        ch.writeUInt16LE(entry.isDir ? 0 : 8, 10);
        ch.writeUInt16LE(0, 12);
        ch.writeUInt16LE(0, 14);
        ch.writeUInt32LE(crc, 16);
        ch.writeUInt32LE(compressedSize, 20);
        ch.writeUInt32LE(uncompressedSize, 24);
        ch.writeUInt16LE(nameBuf.length, 28);
        ch.writeUInt16LE(0, 30);
        ch.writeUInt16LE(0, 32);
        ch.writeUInt16LE(0, 34);
        ch.writeUInt16LE(0, 36);
        ch.writeUInt32LE(entry.isDir ? 0x10 : 0, 38);
        ch.writeUInt32LE(offset, 42);

        centralHeaders.push(ch, nameBuf);

        offset += 30 + nameBuf.length + compressedSize;
    }

    const centralOffset = offset;
    const centralSize = centralHeaders.reduce((sum, b) => sum + b.length, 0);

    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(0, 4);
    eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(entries.length, 8);
    eocd.writeUInt16LE(entries.length, 10);
    eocd.writeUInt32LE(centralSize, 12);
    eocd.writeUInt32LE(centralOffset, 16);
    eocd.writeUInt16LE(0, 20);

    const fullZip = Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
    fs.writeFileSync(outputFile, fullZip);
    console.log(`Packaged ${entries.length} items into ${outputFile} (${fullZip.length} bytes)`);
}

// Package items for Tizen WGT
const items = [
    'config.xml',
    'index.html',
    'icon.png',
    'README.md',
    'icons',
    'css',
    'js'
];

packWgt(__dirname, items, path.join(__dirname, 'AryPlusTV.wgt'));

