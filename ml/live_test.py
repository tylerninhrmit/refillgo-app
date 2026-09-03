"""Live webcam sanity check of a .pt model with the kiosk class mapping.

  uv run live_test.py --weights hf:ninditya/aquasense-waste-detection-model/best.pt --cam 0 --imgsz 640
Press q to quit. Prints the mapped class (pet/can/other) of the top box every second.
"""
from __future__ import annotations

import argparse
import time

import cv2

from export import resolve_weights

CAN = {"aluminum_soda_cans", "aluminum_can", "aluminium_can", "tin", "drink can", "food can", "alucan", "cans", "can", "metal"}
PET = {"plastic_soda_bottles", "plastic_water_bottles", "plastic_bottle", "plastic bottle", "clear plastic bottle", "other plastic bottle", "pet", "bottle", "plastic"}


def kiosk_class(name: str) -> str:
    n = name.strip().lower().replace("-", "_").replace(" ", "_")
    if n in {c.replace("-", "_").replace(" ", "_") for c in CAN}:
        return "can"
    if n in {c.replace("-", "_").replace(" ", "_") for c in PET}:
        return "pet"
    return "other"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--weights", required=True)
    ap.add_argument("--cam", type=int, default=0)
    ap.add_argument("--imgsz", type=int, default=640)
    ap.add_argument("--conf", type=float, default=0.4)
    args = ap.parse_args()

    from ultralytics import YOLO

    model = YOLO(str(resolve_weights(args.weights)))
    cap = cv2.VideoCapture(args.cam)
    last = 0.0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        h, w = frame.shape[:2]
        s = int(min(h, w) * 0.85)
        x0, y0 = (w - s) // 2, (h - s) // 2
        crop = frame[y0 : y0 + s, x0 : x0 + s]
        r = model.predict(crop, imgsz=args.imgsz, conf=args.conf, verbose=False)[0]
        vis = r.plot()
        frame[y0 : y0 + s, x0 : x0 + s] = vis
        cv2.rectangle(frame, (x0, y0), (x0 + s, y0 + s), (255, 255, 255), 2)
        if r.boxes is not None and len(r.boxes) and time.time() - last > 1:
            i = int(r.boxes.conf.argmax())
            name = model.names[int(r.boxes.cls[i])]
            print(f"top: {name} → {kiosk_class(name)} ({float(r.boxes.conf[i]):.2f})")
            last = time.time()
        cv2.imshow("RefillGo live test (q to quit)", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break
    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
