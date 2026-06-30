"use strict";
/**
 * build_zip_node.js — Python 없이 Node.js로 학습자 ZIP 생성
 * 실행: node scripts/build_zip_node.js
 */

const fs   = require("fs");
const path = require("path");
const zlib = require("zlib");

const BASE_DIR   = path.join(__dirname, "..");
const DATASET    = path.join(BASE_DIR, "dataset_source");
const OUTPUT_ZIP = path.join(BASE_DIR, "dist", "welcome_day_workspace.zip");

const EXCLUDED = ["instructor","answer_key","evidence_map","scoring_guide","facilitation_guide"];

function shouldExclude(rel) {
  return EXCLUDED.some(p => rel.toLowerCase().includes(p));
}

function collectFiles(dir, base, result = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel  = base ? base + "/" + entry.name : entry.name;
    if (entry.isDirectory()) collectFiles(full, rel, result);
    else if (entry.isFile() && !shouldExclude(rel)) result.push({ full, rel });
  }
  return result;
}

// ── Minimal ZIP writer ──────────────────────────────────────

function u32le(n) { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; }
function u16le(n) { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; }

function dosDate(d = new Date()) {
  const date = ((d.getFullYear()-1980)<<9)|(( d.getMonth()+1)<<5)|d.getDate();
  const time = (d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1);
  return { date, time };
}

function makeZip(files) {
  const entries = [];
  const parts   = [];
  let offset = 0;

  for (const { full, rel } of files) {
    const data       = fs.readFileSync(full);
    const compressed = zlib.deflateRawSync(data, { level: 6 });
    const useDef     = compressed.length < data.length;
    const payload    = useDef ? compressed : data;
    const method     = useDef ? 8 : 0;
    const nameBuf    = Buffer.from(rel, "utf-8");
    const { date, time } = dosDate();

    // CRC-32
    const crc = crc32(data);

    const localHeader = Buffer.concat([
      Buffer.from([0x50,0x4B,0x03,0x04]),
      u16le(20),          // version needed
      u16le(0x0800),      // flags (UTF-8)
      u16le(method),
      u16le(time), u16le(date),
      u32le(crc),
      u32le(payload.length),
      u32le(data.length),
      u16le(nameBuf.length),
      u16le(0),           // extra len
      nameBuf,
    ]);

    entries.push({ nameBuf, method, time, date, crc, compSize: payload.length, uncompSize: data.length, offset });
    parts.push(localHeader, payload);
    offset += localHeader.length + payload.length;
  }

  // Central directory
  const cdParts = [];
  let cdSize = 0;
  const cdOffset = offset;

  for (const e of entries) {
    const cd = Buffer.concat([
      Buffer.from([0x50,0x4B,0x01,0x02]),
      u16le(20),          // version made by
      u16le(20),          // version needed
      u16le(0x0800),      // flags
      u16le(e.method),
      u16le(e.time), u16le(e.date),
      u32le(e.crc),
      u32le(e.compSize),
      u32le(e.uncompSize),
      u16le(e.nameBuf.length),
      u16le(0), u16le(0), u16le(0), u16le(0),
      u32le(0),
      u32le(e.offset),
      e.nameBuf,
    ]);
    cdParts.push(cd);
    cdSize += cd.length;
  }

  const eocd = Buffer.concat([
    Buffer.from([0x50,0x4B,0x05,0x06]),
    u16le(0), u16le(0),
    u16le(entries.length), u16le(entries.length),
    u32le(cdSize),
    u32le(cdOffset),
    u16le(0),
  ]);

  return Buffer.concat([...parts, ...cdParts, eocd]);
}

// ── CRC-32 ──────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// ── Main ────────────────────────────────────────────────────

const files = collectFiles(DATASET, "").sort((a, b) => a.rel.localeCompare(b.rel));
console.log(`포함 파일: ${files.length}개`);
files.forEach(f => console.log("  [추가]", f.rel));

const zipBuf = makeZip(files);
fs.mkdirSync(path.dirname(OUTPUT_ZIP), { recursive: true });
fs.writeFileSync(OUTPUT_ZIP, zipBuf);
console.log(`\n[완료] ${path.basename(OUTPUT_ZIP)} 생성 (${(zipBuf.length/1024).toFixed(1)} KB, ${files.length}개 파일)`);
