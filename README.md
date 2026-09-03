# RefillGo Green Points

Member web app (MoMo-style, mobile-first PWA) + reverse-vending-machine **kiosk** for the RefillGo Station pitch (BUSM3299, RMIT Vietnam).
Residents scan the station QR, drop PET bottles / aluminium cans, and see Green Points credited live on their phone; the kiosk recognises the material with YOLO running in the browser.

## Stack
Vite + React 19 + TypeScript + Tailwind 4 + framer-motion · Supabase (Postgres, RPC, Realtime) · onnxruntime-web (WebGPU → WASM) · ultralytics (model export / fine-tune)

## Run locally
```bash
cp .env.example .env.local       # fill VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm install
npm run dev                      # http://localhost:5173
```
Demo account: name anything, phone `0900000001` (1,500 points seeded). Station: `SG-SUN-01`.

## Kiosk (the machine's screen, run on the laptop next to the box)
```bash
npm run build && npm run preview      # http://localhost:4173
open "http://localhost:4173/kiosk/SG-SUN-01?key=<machine_key from supabase/seed>"
```
Add `?sim=1` to rehearse without a camera, `?debug=1` for the HUD. Operator keys: `O` overlay, `P/C/X` simulate PET/can/reject,
`S/E` demo session start/end, `R` restart camera, `K` next camera (iPhone Continuity Camera works), `B` recapture background,
`M` WebGPU/WASM, `F` fullscreen, `Q` flush the offline queue.

## Backend
`supabase/migrations/*.sql` (schema, RPCs, grants, seed). `select reset_demo();` restores the demo data between rehearsals.
Kiosk contract: `record_deposit(machine_id, machine_key, material, client_event_id)` — idempotent, credits the active session.
Simulate a deposit from anywhere:
```bash
curl -s -X POST "$VITE_SUPABASE_URL/rest/v1/rpc/record_deposit" -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
  -d '{"machine_id":"SG-SUN-01","machine_key":"<key>","material":"can"}'
```

## Recogniser
See [ml/README.md](ml/README.md). Current model: AquaSense YOLOv8n (5 classes) exported to `public/models/aquasense-640.onnx`;
class mapping in `src/kiosk/kiosk.config.ts`. Fine-tune on the Verba AI / Kaggle Drinking Waste datasets if it misfires on your tray.

## Deploy (Vercel)
Import this repo in Vercel (framework: Vite), add env vars `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (and optionally
`VITE_APP_URL` = the deployed origin, used by the kiosk QR). `vercel.json` already contains the SPA rewrite.
