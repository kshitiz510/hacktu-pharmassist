import uuid
import json
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from contextlib import asynccontextmanager
from task_planning import plan_tasks
from config import API_METADATA, CORS_ORIGINS
from query_classifier import classify_query
from db_manager import get_db_manager
from llm_orchestrator import plan_and_run_session
from clinical_agent.clinical_agent import run_clinical_agent

db = None

def load_agent_data(agent_key: str) -> Dict[str, Any]:
    """Load mock data for an agent"""
    data_dir = Path(__file__).parent / "mockData"
    files = {
        "iqvia": "iqvia.json",
        "exim": "exim_data.json",
        "patent": "patent_data.json",
        "clinical": "clinical_data.json",
        "internal": "internal_knowledge_data.json",
        "web_intelligence": "web_intel.json",
        "report_generator": "report_data.json"
    }
    
    file_name = files.get(agent_key)
    if not file_name or not (data_dir / file_name).exists():
        return {}
    
    try:
        with open(data_dir / file_name, 'r') as f:
            data = json.load(f)
        # Extract first nested object if structure is nested
        if isinstance(data, dict):
            first_key = next(iter(data), None)
            if first_key and isinstance(data[first_key], dict):
                return data[first_key]
        return data
    except:
        return {}

def run_agents(session_id: str, agents: List[str], prompt: str):
    """Execute agents. Clinical agent uses live API; others fallback to mock.

    Normalizes agent keys so data is written both to the original key and a lower-case key.
    This avoids empty objects when planner returns uppercase keys (e.g., CLINICAL_AGENT).
    """

    for agent_key in agents:
        key_lower = agent_key.lower()

        db.sessions.update_one(
            {"sessionId": session_id},
            {"$set": {"workflowState.activeAgent": agent_key, "workflowState.showAgentFlow": True}},
        )

        # Route clinical to live API; others to mock loader
        if "clinical" in key_lower:
            data = run_clinical_agent(prompt)
        else:
            data = load_agent_data(key_lower)

        # Persist under normalized key only to avoid duplicate casing
        db.sessions.update_one(
            {"sessionId": session_id},
            {"$set": {f"agentsData.{key_lower}": data}},
        )

    db.sessions.update_one(
        {"sessionId": session_id},
        {"$set": {"workflowState.activeAgent": None, "workflowState.workflowComplete": True}},
    )

@asynccontextmanager
async def lifespan(app: FastAPI):
    global db
    db = get_db_manager()
    print("[API] Database initialized successfully")
    yield

app = FastAPI(**API_METADATA, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===== MODELS =====

class SessionCreateRequest(BaseModel):
    title: Optional[str] = "New Analysis"

class AnalysisRequest(BaseModel):
    sessionId: str
    prompt: str

# ===== ENDPOINTS =====

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/sessions/create")
async def create_session(request: SessionCreateRequest):
    session_id = db.create_session(title=request.title)
    return {
        "status": "success",
        "sessionId": session_id,
        "title": request.title
    }

@app.get("/sessions")
async def list_sessions(limit: int = 50, skip: int = 0):
    sessions = list(
        db.sessions.find({}, {"_id": 0}).sort("createdAt", -1).skip(skip).limit(limit)
    )
    return {"status": "success", "sessions": sessions}

@app.get("/sessions/{session_id}")
async def get_session(session_id: str):
    session = db.sessions.find_one({"sessionId": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": "success", "session": session}

@app.delete("/sessions/{session_id}/delete")
async def delete_session(session_id: str):
    result = db.sessions.delete_one({"sessionId": session_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": "success"}

@app.post("/analyze")
async def analyze(request: AnalysisRequest):
    if not request.sessionId:
        raise HTTPException(status_code=400, detail="sessionId is required")

    session = db.sessions.find_one({"sessionId": request.sessionId})
    if not session:
        raise HTTPException(status_code=404, detail="Invalid sessionId")

    if not request.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")

    # Add user message
    session["chatHistory"].append({"role": "user", "content": request.prompt})

    # Classify
    classification = classify_query(request.prompt)
    query_type = classification.get("type", "actionable")
    message = classification.get("message", "")

    # Greeting / Irrelevant
    if query_type in ["greeting", "irrelevant"]:
        session["chatHistory"].append({"role": "assistant", "content": message})
        db.sessions.update_one(
            {"sessionId": request.sessionId},
            {"$set": {"chatHistory": session["chatHistory"]}}
        )

        updated_session = db.sessions.find_one({"sessionId": request.sessionId}, {"_id": 0})

        return {
            "status": "success",
            "sessionId": request.sessionId,
            "queryType": query_type,
            "response": {"message": message},
            "session": updated_session
        }

    # Plan tasks for actionable
    planning = plan_tasks(request.prompt, session)
    print(f"[API] Planning result\n: {planning}")
    if planning["type"] == "vague":
        session["chatHistory"].append({"role": "assistant", "content": planning["message"]})
        db.sessions.update_one(
            {"sessionId": request.sessionId},
            {"$set": {"chatHistory": session["chatHistory"]}}
        )

        updated_session = db.sessions.find_one({"sessionId": request.sessionId}, {"_id": 0})

        return {
            "status": "success",
            "sessionId": request.sessionId,
            "queryType": "vague",
            "response": {"message": planning["message"]},
            "session": updated_session
        }

    # Call orchestrator
    orchestration = plan_and_run_session(session, request.prompt, planning["agents"])
    print(f"[API] Orchestration result\n: {orchestration}")
    agents = planning["agents"]
    temp_message = orchestration.get("finalResponse", "Analysis complete.")

    session["chatHistory"].append({"role": "assistant", "content": temp_message})
    
    # Initialize workflow state
    if "workflowState" not in session:
        session["workflowState"] = {"activeAgent": None, "showAgentFlow": False, "workflowComplete": False}
    if "agentsData" not in session:
        session["agentsData"] = {}
    
    db.sessions.update_one(
        {"sessionId": request.sessionId},
        {"$set": {"chatHistory": session["chatHistory"], 
                 "workflowState": session["workflowState"],
                 "agentsData": session["agentsData"]}}
    )
    
    # Run agents
    run_agents(request.sessionId, agents, request.prompt)

    updated_session = db.sessions.find_one({"sessionId": request.sessionId}, {"_id": 0})

    return {
        "status": "success",
        "sessionId": request.sessionId,
        "queryType": "actionable",
        "plan": orchestration,
        "response": {"message": temp_message},
        "session": updated_session
    }



if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)


# {
#   "status": "success",
#   "message": "Semaglutide shows promising repurposing signals...",
#   "session": {
#     "sessionId": "...",
#     "title": "...",
#     "chatHistory": [
#       { "role": "user", "content": "..." },
#       { "role": "assistant", "content": "..." }
#     ],
#     "agentsData": {
#       "iqvia": { ... },
#       "exim": { ... },
#       "patent": { ... },
#       "clinical": { ... },
#       "internal": { ... },
#       "report": { ... }
#     },
#     "workflowState": { ... }
#   },
#   "meta": {}
# }
