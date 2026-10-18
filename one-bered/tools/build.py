"""Bygg app/index.html: injicerar KLG-urvalet i källfilen.
Kör från one-bered/:  python3 tools/build.py"""
from pathlib import Path
root = Path(__file__).resolve().parent.parent
src = (root / "src/app_bess_src.html").read_text(encoding="utf-8")
cat = (root / "src/klg_urval_p2.json").read_text(encoding="utf-8")
assert "/*CATALOG*/[]" in src
(root / "app/index.html").write_text(src.replace("/*CATALOG*/[]", cat), encoding="utf-8")
print("app/index.html byggd")
