import uuid
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from contextlib import asynccontextmanager
from task_planning import plan_tasks
from config import API_METADATA, CORS_ORIGINS
from query_classifier import classify_query
from db_manager import get_db_manager
from llm_orchestrator import validate_and_plan_session

db = None

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
    orchestration = validate_and_plan_session(session)

    agents = orchestration["agents_to_run"]

    temp_message = (
        f"Analysis accepted for {orchestration['drug_name']} in {orchestration['indication']}. "
        f"The following agents will start working: {', '.join(agents)}."
    )

    session["chatHistory"].append({"role": "assistant", "content": temp_message})
    db.sessions.update_one(
        {"sessionId": request.sessionId},
        {"$set": {"chatHistory": session["chatHistory"]}}
    )

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
