# RefillGo kiosk recogniser (ml/)

The kiosk page (`/kiosk/SG-SUN-01`) runs a YOLO model **in the browser** (onnxruntime-web, WebGPU → WASM).
Everything here produces one file pair: `public/models/<name>.onnx` + `public/models/manifest.json`.

## Setup (once)
```bash
cd ml && uv sync            # creates .venv with Python 3.12, ultralytics, onnxruntime, opencv
```

## Stage A — use a public model as-is
```bash
uv run export.py --weights hf:ninditya/aquasense-waste-detection-model/best.pt --name aquasense --imgsz 640
uv run live_test.py --weights hf:ninditya/aquasense-waste-detection-model/best.pt --cam 0
```
Classes are mapped in `src/kiosk/kiosk.config.ts` (`aluminum_soda_cans → can`, `plastic_*_bottles → pet`, everything else → not accepted).

## Stage B — fine-tune on public PET/can datasets (if Stage A is unreliable on your tray)
1. Download into `ml/data/raw/`:
   - Roboflow **ProjectVerba / Verba AI** (2 classes, CC BY 4.0) → export "YOLOv8" → unzip to `ml/data/raw/verba-ai/`
   - Kaggle **Drinking Waste Classification** (CC0) → `YOLO_imgs` → `ml/data/raw/drinking-waste/` (+ a `classes.txt` with `AluCan Glass PET HDPEM` if missing)
2. `uv run prepare.py` → `ml/data/dataset/data.yaml` (classes `pet`, `can`)
3. `uv run train.py --model yolo11n.pt --epochs 30 --imgsz 416` (≈10–30 min on M1 Max)
4. `uv run export.py --weights runs/refillgo/weights/best.pt --name refillgo-yolo11n --imgsz 416`

## Stage C — photos of your own tray (last resort, 10 minutes)
Take 40–60 photos per class with the demo camera (phone photos are fine), label them in Roboflow (free) or LabelImg,
export as YOLOv8 into `ml/data/raw/tray/` and repeat Stage B (it merges all folders under `raw/`).

## Rig tips
Camera fixed above a matte light-grey tray (clear PET vanishes on pure white), a clip lamp, tape everything.
The kiosk's dashed square is the ROI (85 % of the shorter side by default, `roi` in manifest.json).

## Kiosk operator keys
`O` overlay · `P/C/X` simulate PET/can/reject · `S/E` demo session start/end · `R` restart camera · `K` next camera ·
`B` recapture empty-tray background · `M` switch WebGPU/WASM · `D` debug HUD · `F` fullscreen · `Q` flush offline queue.
URL flags: `?sim=1` (no camera), `?debug=1`.
