"""
SpaceClean Backend — FastAPI Server
Serves the frontend + ML collision risk prediction API
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
import time
import os
from datetime import datetime
from ML import CollisionModel

app = FastAPI(title="SpaceClean API", version="1.0.0")

# Enable CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = CollisionModel()

# In-memory storage for demonstration
history = []
stats = {
    "total_predictions": 0,
    "critical_alerts": 0,
    "warning_alerts": 0,
    "average_collision_probability": 0.0,
    "total_camera_detections": 0
}

# ─── Data Models ───

class EncounterData(BaseModel):
    miss_distance_km: float
    relative_velocity_kms: float
    bstar_drag: float
    position_covariance: float
    combined_mass_kg: float

class PredictionResponse(BaseModel):
    status: str
    collision_probability_percentage: float
    alert_level: str
    prediction_id: int
    timestamp: str

# ─── API Endpoints ───

@app.post("/predict_risk", response_model=PredictionResponse)
async def predict_risk(data: EncounterData):
    try:
        prob = model.predict([
            data.miss_distance_km,
            data.relative_velocity_kms,
            data.bstar_drag,
            data.position_covariance,
            data.combined_mass_kg
        ])
        alert = model.get_alert_level(prob)

        prediction_id = len(history) + 1
        timestamp = datetime.now().isoformat()

        result = {
            "status": "success",
            "collision_probability_percentage": round(prob, 2),
            "alert_level": alert,
            "prediction_id": prediction_id,
            "timestamp": timestamp
        }

        # Update history and stats
        history.append({**result, **data.dict(), "id": prediction_id})
        update_stats(prob, alert)

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/statistics")
async def get_statistics():
    result = {**stats}
    if result["total_predictions"] > 0:
        result["alert_rate"] = (result["critical_alerts"] + result["warning_alerts"]) / result["total_predictions"]
    else:
        result["alert_rate"] = 0
    return result

@app.post("/log_detection")
async def log_detection(payload: dict):
    count = payload.get("count", 0)
    stats["total_camera_detections"] += count
    return {"status": "success", "new_total": stats["total_camera_detections"]}

@app.get("/history")
async def get_history(limit: Optional[int] = 100, offset: Optional[int] = 0, alert_level: Optional[str] = None):
    filtered_history = history
    if alert_level:
        filtered_history = [item for item in history if item["alert_level"] == alert_level]
    return filtered_history[::-1][offset : offset + limit]

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "uptime_seconds": int(time.time() % 3600)
    }

# ─── Stats Helper ───

def update_stats(prob, alert):
    global stats
    n = stats["total_predictions"]
    current_avg = stats["average_collision_probability"]
    stats["average_collision_probability"] = (current_avg * n + prob) / (n + 1)
    stats["total_predictions"] += 1
    if alert == "CRITICAL":
        stats["critical_alerts"] += 1
    elif alert == "WARNING":
        stats["warning_alerts"] += 1

# ─── Serve Frontend Static Files ───
# Mount the website directory to serve HTML/CSS/JS
WEBSITE_DIR = os.path.join(os.path.dirname(__file__), "space", "website")

# Serve specific pages
@app.get("/")
async def serve_index():
    return FileResponse(os.path.join(WEBSITE_DIR, "index.html"))

@app.get("/detector")
async def serve_detector():
    return FileResponse(os.path.join(WEBSITE_DIR, "detector.html"))

@app.get("/dashboard")
async def serve_dashboard():
    return FileResponse(os.path.join(WEBSITE_DIR, "dashboard.html"))

# Mount static files AFTER the API routes so they don't override
app.mount("/", StaticFiles(directory=WEBSITE_DIR), name="static")

if __name__ == "__main__":
    import uvicorn
    print("\n🛰️  SpaceClean Server Starting...")
    print("=" * 50)
    print("🌍  Website:    http://localhost:8000")
    print("📡  Detector:   http://localhost:8000/detector.html")
    print("📊  Dashboard:  http://localhost:8000/dashboard.html")
    print("📋  API Docs:   http://localhost:8000/docs")
    print("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=8000)
