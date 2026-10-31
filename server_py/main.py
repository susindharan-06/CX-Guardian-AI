# server_py/main.py
# FastAPI Python Microservice for CX Guardian

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
from demo_data_generator import generate_demo_records
from ai_engine import run_cluster_analysis

app = FastAPI(title="CX Guardian AI Microservice", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

feedback_db = generate_demo_records(525)

@app.get("/api/health")
def health_check():
    return {"status": "online", "model": "FastAPI + Scikit-Learn"}

@app.get("/api/feedback")
def get_feedback(limit: int = 50):
    return {"total": len(feedback_db), "records": feedback_db[:limit]}

@app.post("/api/analysis/run")
def trigger_analysis():
    clusters = run_cluster_analysis(feedback_db)
    return {"status": "success", "clusters": clusters, "records_analyzed": len(feedback_db)}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
