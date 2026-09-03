"""Merge public datasets into one 2-class YOLO dataset {0: pet, 1: can}.

Put the raw downloads under ml/data/raw/<name>/ (each in YOLO format with a data.yaml or classes.txt), e.g.
  ml/data/raw/verba-ai/        Roboflow "Verba AI" export, YOLOv8 format (classes aluminum_can, plastic_bottle)
  ml/data/raw/drinking-waste/  Kaggle "Drinking Waste Classification" YOLO_imgs (AluCan, Glass, PET, HDPEM)
Then:  uv run prepare.py  →  ml/data/dataset/{images,labels}/{train,val} + data.yaml
"""
from __future__ import annotations

import random
import shutil
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data" / "dataset"
CAN = {"aluminum_can", "aluminium_can", "aluminum_soda_cans", "alucan", "can", "cans", "tin", "drink can", "metal"}
PET = {"plastic_bottle", "plastic bottle", "plastic_soda_bottles", "plastic_water_bottles", "pet", "bottle", "clear plastic bottle"}


def norm(n: str) -> str:
    return n.strip().lower().replace("-", "_").replace(" ", "_")


def class_names(ds: Path) -> list[str]:
    y = next(iter(ds.rglob("data.yaml")), None)
    if y:
        d = yaml.safe_load(y.read_text())
        names = d.get("names")
        return list(names.values()) if isinstance(names, dict) else list(names)
    c = next(iter(ds.rglob("classes.txt")), None)
    if c:
        return [l.strip() for l in c.read_text().splitlines() if l.strip()]
    raise SystemExit(f"no data.yaml / classes.txt in {ds}")


def main() -> None:
    random.seed(7)
    if OUT.exists():
        shutil.rmtree(OUT)
    for split in ("train", "val"):
        (OUT / "images" / split).mkdir(parents=True)
        (OUT / "labels" / split).mkdir(parents=True)
    total = {"pet": 0, "can": 0}
    for ds in sorted(p for p in RAW.iterdir() if p.is_dir()):
        names = class_names(ds)
        remap: dict[int, int] = {}
        for i, n in enumerate(names):
            k = norm(n)
            if k in {norm(x) for x in CAN}:
                remap[i] = 1
            elif k in {norm(x) for x in PET}:
                remap[i] = 0
        print(f"{ds.name}: classes {names} → remap {remap}")
        labels = list(ds.rglob("*.txt"))
        kept = 0
        for lbl in labels:
            if lbl.name in ("classes.txt",):
                continue
            img = None
            for ext in (".jpg", ".jpeg", ".png", ".JPG", ".PNG"):
                cand = Path(str(lbl).replace("/labels/", "/images/")).with_suffix(ext)
                if cand.exists():
                    img = cand
                    break
                cand2 = lbl.with_suffix(ext)
                if cand2.exists():
                    img = cand2
                    break
            if img is None:
                continue
            rows = []
            for line in lbl.read_text().splitlines():
                parts = line.split()
                if len(parts) < 5:
                    continue
                c = int(float(parts[0]))
                if c in remap:
                    rows.append(" ".join([str(remap[c]), *parts[1:5]]))
                    total["pet" if remap[c] == 0 else "can"] += 1
            if not rows:
                continue
            split = "val" if random.random() < 0.15 else "train"
            stem = f"{ds.name}_{img.stem}"
            shutil.copyfile(img, OUT / "images" / split / f"{stem}{img.suffix.lower()}")
            (OUT / "labels" / split / f"{stem}.txt").write_text("\n".join(rows) + "\n")
            kept += 1
        print(f"  kept {kept} images")
    (OUT / "data.yaml").write_text(yaml.safe_dump({"path": str(OUT), "train": "images/train", "val": "images/val", "names": {0: "pet", 1: "can"}}))
    print("boxes:", total, "→", OUT / "data.yaml")


if __name__ == "__main__":
    main()
