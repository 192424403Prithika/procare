# PropCare NW — Trained YOLO Moisture Models Directory

This directory stores trained Ultralytics YOLO model weight checkpoints (`.pt` files) for moisture observation and building water damage detection.

## Default Weights File
The application looks for weights at:
`backend/models/moisture_best.pt`

Configure a custom location by setting `YOLO_MODEL_PATH` in `backend/.env`.

## Supported Defect Classes
Trained weights must be calibrated to detect the following 8 building water damage classes:
0. `water_stain`: Water stains
1. `damp_patch`: Damp patches
2. `wall_moisture_damage`: Wall moisture damage
3. `ceiling_water_damage`: Ceiling water damage
4. `peeling_paint`: Peeling or bubbling paint
5. `visible_mould`: Visible mould-like growth (Awaab's Law statutory trigger)
6. `leakage_mark`: Water leakage marks
7. `plaster_deterioration`: Plaster deterioration

## How to Install Custom Weights
1. Train a model using `backend/training/train_moisture_yolo.py`.
2. Copy the resulting `best.pt` to this folder:
   `copy runs/detect/train/weights/best.pt backend/models/moisture_best.pt`
3. Restart or reload the FastAPI backend. The `/api/v1/analysis/moisture/model/status` endpoint will reflect `configured: true`.
