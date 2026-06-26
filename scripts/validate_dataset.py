"""
validate_dataset.py
웰컴데이 챌린지 데이터셋 무결성 검증 스크립트

실행: python scripts/validate_dataset.py
"""

import os
import csv
import json
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
DATASET_DIR = BASE_DIR / "dataset_source"
INSTRUCTOR_DIR = BASE_DIR / "instructor"
WEB_DATA_DIR = BASE_DIR / "web_data"
FILE_MANIFEST = BASE_DIR / "file_manifest.csv"
EVIDENCE_MAP = BASE_DIR / "evidence_map.csv"
ANSWER_KEY_JSON = WEB_DATA_DIR / "answer_key.json"
QUESTIONS_JSON = WEB_DATA_DIR / "questions.json"

PASS = "[PASS]"
FAIL = "[FAIL]"
WARN = "[WARN]"

results = []

def report(status, message):
    label = {"pass": PASS, "fail": FAIL, "warn": WARN}[status]
    line = f"{label} {message}"
    results.append((status, line))
    print(line)


# ─────────────────────────────────────────────
# 검증 1: file_manifest.csv의 파일이 실제 존재하는지
# ─────────────────────────────────────────────
def check_manifest_files():
    print("\n[검증 1] file_manifest.csv 파일 존재 여부")
    if not FILE_MANIFEST.exists():
        report("fail", f"file_manifest.csv 없음: {FILE_MANIFEST}")
        return

    missing = []
    total = 0
    with open(FILE_MANIFEST, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            path_str = row.get("path", "").strip()
            if not path_str:
                continue
            total += 1
            full_path = DATASET_DIR / path_str
            if not full_path.exists():
                missing.append(path_str)

    if missing:
        for m in missing:
            report("fail", f"  누락 파일: {m}")
    else:
        report("pass", f"file_manifest.csv 파일 {total}개 모두 존재")


# ─────────────────────────────────────────────
# 검증 2: evidence_map.csv의 근거 파일이 실제 존재하는지
# ─────────────────────────────────────────────
def check_evidence_files():
    print("\n[검증 2] evidence_map.csv 근거 파일 존재 여부")
    if not EVIDENCE_MAP.exists():
        report("fail", f"evidence_map.csv 없음: {EVIDENCE_MAP}")
        return

    missing = []
    checked = set()
    with open(EVIDENCE_MAP, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            for col in ("primary_evidence", "secondary_evidence", "additional_evidence", "confuser_files"):
                val = row.get(col, "").strip()
                if not val:
                    continue
                for fname in val.split("|"):
                    fname = fname.strip()
                    if not fname or fname in checked:
                        continue
                    checked.add(fname)
                    full_path = DATASET_DIR / fname
                    if not full_path.exists():
                        missing.append(fname)

    if missing:
        for m in missing:
            report("fail", f"  누락 근거파일: {m}")
    else:
        report("pass", f"evidence_map.csv 근거 파일 {len(checked)}개 모두 존재")


# ─────────────────────────────────────────────
# 검증 3: 정답 키워드가 근거 파일에 포함되어 있는지
# ─────────────────────────────────────────────
ANSWER_KEYWORDS = {
    "Q1": {
        "files": [
            "1_메일/장소변경_공지_0718.txt",
            "5_첨부자료/대관료_B룸_영수증_0719.md"
        ],
        "keywords": ["B룸", "5층 그랜드홀"]
    },
    "Q2": {
        "files": ["5_첨부자료/참석자명단_0718.csv"],
        "keywords": ["34", "참석확정"]
    },
    "Q3": {
        "files": ["5_첨부자료/운영체크리스트_0720.md"],
        "keywords": ["외부 강사", "주차", "웰컴 키트", "△"]
    },
    "Q4": {
        "files": ["5_첨부자료/세션_담당자변경_0718.txt"],
        "keywords": ["정다은", "조직 문화"]
    },
    "Q5": {
        "files": [
            "1_메일/외부강사_확인요청_0714.txt",
            "1_메일/김하늘_받은메일함_0715.txt"
        ],
        "keywords": ["신재원", "미회신", "확인"]
    }
}

def check_keywords_in_evidence():
    print("\n[검증 3] 정답 키워드 근거 파일 포함 여부")
    for qid, spec in ANSWER_KEYWORDS.items():
        for rel_path in spec["files"]:
            full_path = DATASET_DIR / rel_path
            if not full_path.exists():
                report("warn", f"  {qid}: 파일 없음(검증 2에서 처리됨) — {rel_path}")
                continue
            text = full_path.read_text(encoding="utf-8", errors="ignore")
            missing_kw = [kw for kw in spec["keywords"] if kw not in text]
            if missing_kw:
                report("fail", f"  {qid}: {rel_path} 에서 키워드 누락: {missing_kw}")
            else:
                report("pass", f"  {qid}: {rel_path} 키워드 확인")


# ─────────────────────────────────────────────
# 검증 4: questions.json과 answer_key.json의 정답 일치 여부
# ─────────────────────────────────────────────
def check_answer_consistency():
    print("\n[검증 4] questions.json ↔ answer_key.json 일치 여부")
    if not QUESTIONS_JSON.exists():
        report("fail", f"questions.json 없음: {QUESTIONS_JSON}")
        return
    if not ANSWER_KEY_JSON.exists():
        report("fail", f"answer_key.json 없음: {ANSWER_KEY_JSON}")
        return

    with open(QUESTIONS_JSON, encoding="utf-8") as f:
        questions = json.load(f)
    with open(ANSWER_KEY_JSON, encoding="utf-8") as f:
        answer_key = json.load(f)

    q_ids = {q["id"] for q in questions.get("questions", [])}
    ak_ids = set(answer_key.get("answers", {}).keys())

    missing_in_ak = q_ids - ak_ids
    extra_in_ak = ak_ids - q_ids

    if missing_in_ak:
        report("fail", f"  answer_key에 없는 문항: {missing_in_ak}")
    if extra_in_ak:
        report("warn", f"  questions에 없는 answer_key 항목: {extra_in_ak}")

    for qid in q_ids & ak_ids:
        q_score = next((q["score"] for q in questions["questions"] if q["id"] == qid), None)
        ak_score = answer_key["answers"][qid].get("score")
        if q_score != ak_score:
            report("fail", f"  {qid}: 배점 불일치 (questions={q_score}, answer_key={ak_score})")
        else:
            report("pass", f"  {qid}: 배점 일치 ({q_score}점)")

    if not missing_in_ak and not extra_in_ak:
        report("pass", f"questions.json ↔ answer_key.json 문항 ID 완전 일치 ({len(q_ids)}개)")


# ─────────────────────────────────────────────
# 검증 5: 학습자용 ZIP에 instructor 폴더/정답표가 없는지 시뮬레이션
# ─────────────────────────────────────────────
def check_zip_exclusion():
    print("\n[검증 5] 학습자용 ZIP 포함 금지 항목 확인")
    forbidden_patterns = [
        "instructor",
        "answer_key",
        "evidence_map",
        "scoring_guide",
        "facilitation_guide"
    ]

    violations = []
    for item in DATASET_DIR.rglob("*"):
        rel = str(item.relative_to(DATASET_DIR))
        for pat in forbidden_patterns:
            if pat in rel.lower():
                violations.append(rel)
                break

    if violations:
        for v in violations:
            report("fail", f"  ZIP 포함 금지 항목 발견: {v}")
    else:
        report("pass", "dataset_source/ 내에 instructor/정답표 관련 파일 없음 — ZIP 안전")

    zip_path = BASE_DIR / "welcome_day_workspace.zip"
    if zip_path.exists():
        import zipfile
        with zipfile.ZipFile(zip_path) as zf:
            zip_names = zf.namelist()
            zip_violations = [n for n in zip_names if any(p in n.lower() for p in forbidden_patterns)]
            if zip_violations:
                for v in zip_violations:
                    report("fail", f"  ZIP 내 금지 파일 발견: {v}")
            else:
                report("pass", f"welcome_day_workspace.zip 내 금지 파일 없음 ({len(zip_names)}개 파일 확인)")
    else:
        report("warn", "welcome_day_workspace.zip 미존재 — build_student_zip.py 실행 후 재검증 권장")


# ─────────────────────────────────────────────
# 결과 요약
# ─────────────────────────────────────────────
def print_summary():
    print("\n" + "="*50)
    print("검증 결과 요약")
    print("="*50)
    total = len(results)
    passed = sum(1 for s, _ in results if s == "pass")
    failed = sum(1 for s, _ in results if s == "fail")
    warned = sum(1 for s, _ in results if s == "warn")
    print(f"  총 검증 항목: {total}")
    print(f"  PASS: {passed}  FAIL: {failed}  WARN: {warned}")
    if failed == 0:
        print("\n  데이터셋 무결성 검증 통과. ZIP 생성을 진행할 수 있습니다.")
    else:
        print(f"\n  {failed}개 항목 실패. 위 오류를 수정 후 재검증하세요.")


if __name__ == "__main__":
    print("웰컴데이 챌린지 데이터셋 검증 시작")
    print(f"BASE_DIR: {BASE_DIR}")
    check_manifest_files()
    check_evidence_files()
    check_keywords_in_evidence()
    check_answer_consistency()
    check_zip_exclusion()
    print_summary()
