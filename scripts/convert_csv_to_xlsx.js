/**
 * CSV → XLSX 변환 스크립트
 *
 * 실행 방법:
 *   npm install xlsx          (최초 1회)
 *   node scripts/convert_csv_to_xlsx.js
 *
 * 동작:
 *   1. dataset_source/**\/*.csv 를 XLSX로 변환 (같은 폴더에 저장)
 *   2. 원본 CSV를 csv_backup/ 폴더로 폴더 구조 유지하며 이동
 *   3. instructor / web_data / scripts 폴더는 건드리지 않음
 */

"use strict";

const fs   = require("fs");
const path = require("path");
const XLSX = require("xlsx");

// ── 경로 설정 ──────────────────────────────────────────────
const ROOT          = path.join(__dirname, "..");          // ai-handover-challenge/
const DATASET_ROOT  = path.join(ROOT, "dataset_source");
const BACKUP_ROOT   = path.join(ROOT, "csv_backup");

// 변환 대상 제외 폴더 (절대 경로로 비교)
const EXCLUDE_DIRS = [
  path.join(ROOT, "instructor"),
  path.join(ROOT, "web_data"),
  path.join(ROOT, "scripts"),
];

// ── 유틸리티 ───────────────────────────────────────────────

/** 주어진 절대 경로가 제외 폴더 하위인지 확인 */
function isExcluded(filePath) {
  return EXCLUDE_DIRS.some((dir) => filePath.startsWith(dir + path.sep) || filePath === dir);
}

/** 재귀적으로 .csv 파일을 수집 */
function collectCsvFiles(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectCsvFiles(fullPath, results);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".csv")) {
      if (!isExcluded(fullPath)) results.push(fullPath);
    }
  }
  return results;
}

/** Excel 시트명 제한: 31자 이내, 금지 문자 제거 */
function safeSheetName(name) {
  const cleaned = name.replace(/[\\\/\?\*\[\]:]/g, "_");
  return cleaned.length > 31 ? cleaned.slice(0, 31) : cleaned;
}

/** 폴더가 없으면 재귀적으로 생성 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

// ── 변환 핵심 로직 ─────────────────────────────────────────

/**
 * CSV 파일 1개를 XLSX로 변환하고 원본을 백업으로 이동.
 * @returns {{ xlsx: string, backup: string }}
 */
function convertOne(csvPath) {
  // 1) CSV 읽기 (UTF-8, BOM 있어도 처리)
  const raw = fs.readFileSync(csvPath, "utf-8").replace(/^﻿/, "");

  // 2) xlsx.read 로 파싱 (raw CSV 문자열 → workbook)
  const workbook = XLSX.read(raw, { type: "string", codepage: 65001 });

  // 3) 시트명을 파일명(확장자 제외)으로 변경
  const originalSheet = workbook.SheetNames[0];
  const sheetName = safeSheetName(path.basename(csvPath, ".csv"));
  if (originalSheet !== sheetName) {
    workbook.Sheets[sheetName] = workbook.Sheets[originalSheet];
    delete workbook.Sheets[originalSheet];
    workbook.SheetNames[0] = sheetName;
  }

  // 4) XLSX 파일 경로 결정 (같은 폴더, 확장자만 변경)
  const xlsxPath = csvPath.replace(/\.csv$/i, ".xlsx");
  XLSX.writeFile(workbook, xlsxPath, { bookType: "xlsx", compression: true });

  // 5) CSV 백업 이동
  //    dataset_source/2_캘린더/foo.csv → csv_backup/2_캘린더/foo.csv
  const relFromDataset = path.relative(DATASET_ROOT, csvPath);
  const backupPath = path.join(BACKUP_ROOT, relFromDataset);
  ensureDir(path.dirname(backupPath));
  fs.renameSync(csvPath, backupPath);

  return { xlsx: xlsxPath, backup: backupPath };
}

// ── 메인 실행 ──────────────────────────────────────────────

function main() {
  // xlsx 패키지 존재 여부 사전 확인
  try {
    require.resolve("xlsx");
  } catch {
    console.error(
      "\n[오류] xlsx 패키지가 설치되어 있지 않습니다.\n" +
      "  다음 명령으로 설치 후 다시 실행하세요:\n\n" +
      "    npm install xlsx\n"
    );
    process.exit(1);
  }

  console.log("=".repeat(60));
  console.log(" CSV → XLSX 변환 시작");
  console.log("=".repeat(60));
  console.log(`  소스 폴더  : ${DATASET_ROOT}`);
  console.log(`  백업 폴더  : ${BACKUP_ROOT}`);
  console.log("");

  // dataset_source 존재 확인
  if (!fs.existsSync(DATASET_ROOT)) {
    console.error(`[오류] dataset_source 폴더를 찾을 수 없습니다: ${DATASET_ROOT}`);
    process.exit(1);
  }

  const csvFiles = collectCsvFiles(DATASET_ROOT);

  if (csvFiles.length === 0) {
    console.log("[정보] 변환할 CSV 파일이 없습니다.");
    return;
  }

  console.log(`총 ${csvFiles.length}개 CSV 파일 발견\n`);

  const converted = [];
  const failed    = [];

  for (const csvPath of csvFiles) {
    const rel = path.relative(ROOT, csvPath);
    process.stdout.write(`  변환 중: ${rel} ... `);
    try {
      const { xlsx, backup } = convertOne(csvPath);
      converted.push({ csv: csvPath, xlsx, backup });
      console.log("완료");
    } catch (err) {
      failed.push({ csv: csvPath, error: err.message });
      console.log(`실패 (${err.message})`);
    }
  }

  // ── 결과 출력 ────────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log(" 변환 결과 요약");
  console.log("=".repeat(60));
  console.log(`  변환 완료: ${converted.length}개 / 전체: ${csvFiles.length}개`);

  if (converted.length > 0) {
    console.log("\n[생성된 XLSX 파일]");
    for (const { xlsx } of converted) {
      console.log(`  ✔ ${path.relative(ROOT, xlsx)}`);
    }

    console.log("\n[백업된 CSV 파일]");
    for (const { backup } of converted) {
      console.log(`  → ${path.relative(ROOT, backup)}`);
    }
  }

  if (failed.length > 0) {
    console.log("\n[변환 실패 파일]");
    for (const { csv, error } of failed) {
      console.log(`  ✘ ${path.relative(ROOT, csv)} — ${error}`);
    }
  }

  console.log("\n" + "=".repeat(60));
  if (failed.length === 0) {
    console.log(" 모든 파일이 성공적으로 변환되었습니다.");
  } else {
    console.log(` 경고: ${failed.length}개 파일 변환 실패. 위 목록을 확인하세요.`);
  }
  console.log("=".repeat(60) + "\n");
}

main();
