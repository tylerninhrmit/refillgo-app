"""Export a YOLO .pt to ONNX for the kiosk (onnxruntime-web) and write public/models/manifest.json.

Examples
  uv run export.py --weights hf:ninditya/aquasense-waste-detection-model/best.pt --name aquasense --imgsz 640
  uv run export.py --weights runs/refillgo/weights/best.pt --name refillgo-yolo11n --imgsz 416
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
MODELS_DIR = ROOT / "public" / "models"


def resolve_weights(spec: str) -> Path:
    if spec.startswith("hf:"):
        from huggingface_hub import hf_hub_download

        repo, filename = spec[3:].rsplit("/", 1)
        return Path(hf_hub_download(repo, filename))
    return Path(spec)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--weights", required=True, help="path to .pt or hf:<repo>/<file>")
    ap.add_argument("--name", required=True, help="model name used for the .onnx file")
    ap.add_argument("--imgsz", type=int, default=640)
    ap.add_argument("--opset", type=int, default=12)
    ap.add_argument("--roi", type=float, default=0.85, help="tray ROI as a fraction of the shorter video side")
    args = ap.parse_args()

    from ultralytics import YOLO

    weights = resolve_weights(args.weights)
    model = YOLO(str(weights))
    names = [model.names[i] for i in range(len(model.names))]
    print("classes:", names)

    out = model.export(format="onnx", imgsz=args.imgsz, opset=args.opset, simplify=True, dynamic=False, batch=1)
    onnx_path = Path(out)

    import onnxruntime as ort

    sess = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    inp = sess.get_inputs()[0]
    outp = sess.get_outputs()[0]
    dummy = np.zeros((1, 3, args.imgsz, args.imgsz), dtype=np.float32)
    res = sess.run([outp.name], {inp.name: dummy})[0]
    layout = "end2end" if res.ndim == 3 and res.shape[2] == 6 else "yolo-raw"
    print(f"onnx ok: input={inp.name}{inp.shape} output={outp.name}{res.shape} layout={layout}")

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    dst = MODELS_DIR / f"{args.name}-{args.imgsz}.onnx"
    shutil.copyfile(onnx_path, dst)
    sha = hashlib.sha256(dst.read_bytes()).hexdigest()[:16]
    manifest = {
        "file": f"/models/{dst.name}",
        "name": f"{args.name} ({args.imgsz}px, {len(names)} classes)",
        "classes": names,
        "imgsz": args.imgsz,
        "inputName": inp.name,
        "outputName": outp.name,
        "layout": layout,
        "roi": {"cx": 0.5, "cy": 0.5, "size": args.roi},
        "sha256": sha,
        "source": args.weights,
    }
    (MODELS_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2))
    print(f"wrote {dst} ({dst.stat().st_size/1e6:.1f} MB) and manifest.json")


if __name__ == "__main__":
    main()
