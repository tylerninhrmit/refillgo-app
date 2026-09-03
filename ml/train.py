"""Fine-tune a small YOLO on ml/data/dataset (Apple Silicon MPS).

  uv run train.py --model yolo11n.pt --epochs 30 --imgsz 416
  uv run export.py --weights runs/refillgo/weights/best.pt --name refillgo-yolo11n --imgsz 416
"""
from __future__ import annotations

import argparse
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="yolo11n.pt")
    ap.add_argument("--data", default=str(ROOT / "data" / "dataset" / "data.yaml"))
    ap.add_argument("--epochs", type=int, default=30)
    ap.add_argument("--imgsz", type=int, default=416)
    ap.add_argument("--batch", type=int, default=16)
    ap.add_argument("--device", default="mps")
    ap.add_argument("--name", default="refillgo")
    args = ap.parse_args()
    os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")

    from ultralytics import YOLO

    model = YOLO(args.model)
    model.train(
        data=args.data, epochs=args.epochs, patience=12, imgsz=args.imgsz, batch=args.batch, device=args.device,
        workers=4, cache=True, hsv_v=0.6, hsv_s=0.7, degrees=20, scale=0.4, translate=0.1, fliplr=0.5, flipud=0.3,
        mosaic=1.0, close_mosaic=8, erasing=0.2, project=str(ROOT / "runs"), name=args.name, exist_ok=True,
    )
    best = ROOT / "runs" / args.name / "weights" / "best.pt"
    print("best weights:", best)
    metrics = YOLO(str(best)).val(data=args.data, imgsz=args.imgsz, device=args.device)
    print("mAP50 per class:", metrics.box.ap50)


if __name__ == "__main__":
    main()
