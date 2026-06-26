"""
build_student_zip.py
학습자 배포용 ZIP 파일 생성 스크립트

실행: python scripts/build_student_zip.py
출력: ai-handover-challenge/welcome_day_workspace.zip
"""

import os
import zipfile
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
DATASET_DIR = BASE_DIR / "dataset_source"
OUTPUT_ZIP = BASE_DIR / "welcome_day_workspace.zip"

EXCLUDED_PATHS = {"instructor", "answer_key", "evidence_map", "scoring_guide", "facilitation_guide"}

def should_exclude(path: Path) -> bool:
    name = path.name.lower()
    return any(pat in name for pat in EXCLUDED_PATHS)

def build_zip():
    if not DATASET_DIR.exists():
        print(f"[오류] dataset_source 폴더를 찾을 수 없습니다: {DATASET_DIR}")
        return

    all_files = [p for p in DATASET_DIR.rglob("*") if p.is_file()]
    included = [p for p in all_files if not should_exclude(p)]
    excluded = [p for p in all_files if should_exclude(p)]

    print(f"포함 파일: {len(included)}개")
    print(f"제외 파일: {len(excluded)}개")
    if excluded:
        for e in excluded:
            print(f"  [제외] {e.relative_to(BASE_DIR)}")

    with zipfile.ZipFile(OUTPUT_ZIP, "w", zipfile.ZIP_DEFLATED) as zf:
        for file_path in sorted(included):
            arcname = file_path.relative_to(DATASET_DIR)
            zf.write(file_path, arcname)
            print(f"  [추가] {arcname}")

    size_kb = OUTPUT_ZIP.stat().st_size / 1024
    print(f"\n[완료] {OUTPUT_ZIP.name} 생성 ({size_kb:.1f} KB, {len(included)}개 파일)")
    print(f"경로: {OUTPUT_ZIP}")

if __name__ == "__main__":
    print("학습자용 ZIP 생성 시작\n")
    build_zip()
