from fastapi import APIRouter, Depends, HTTPException
import uuid

from app.api.schemas import AnalysisRequest
from app.core.db import DatabaseManager, get_db
from app.services.agent_runner import run_agents
from app.services.llm_orchestrator import plan_and_run_session
from app.services.query_classifier import classify_query
from app.services.task_planning import plan_tasks

router = APIRouter(tags=["analysis"])


@router.post("/analyze")
async def analyze(request: AnalysisRequest, db: DatabaseManager = Depends(get_db)):
    if not request.sessionId:
        raise HTTPException(status_code=400, detail="sessionId is required")

    session = db.sessions.find_one({"sessionId": request.sessionId})
    if not session:
        raise HTTPException(status_code=404, detail="Invalid sessionId")

    if not request.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")

    session.setdefault("chatHistory", []).append(
        {"role": "user", "content": request.prompt}
    )

    classification = classify_query(request.prompt)
    query_type = classification.get("type", "actionable")
    message = classification.get("message", "")

    if query_type in ["greeting", "irrelevant"]:
        session["chatHistory"].append({"role": "assistant", "content": message})
        db.sessions.update_one(
            {"sessionId": request.sessionId},
            {"$set": {"chatHistory": session["chatHistory"]}},
        )
        updated_session = db.sessions.find_one(
            {"sessionId": request.sessionId}, {"_id": 0}
        )
        return {
            "status": "success",
            "sessionId": request.sessionId,
            "queryType": query_type,
            "response": {"message": message},
            "session": updated_session,
        }

    planning = plan_tasks(request.prompt, session)
    if planning["type"] == "vague":
        session["chatHistory"].append(
            {"role": "assistant", "content": planning["message"]}
        )
        db.sessions.update_one(
            {"sessionId": request.sessionId},
            {"$set": {"chatHistory": session["chatHistory"]}},
        )
        updated_session = db.sessions.find_one(
            {"sessionId": request.sessionId}, {"_id": 0}
        )
        return {
            "status": "success",
            "sessionId": request.sessionId,
            "queryType": "vague",
            "response": {"message": planning["message"]},
            "session": updated_session,
        }

    orchestration = plan_and_run_session(session, request.prompt, planning["agents"])
    agents = planning["agents"]
    temp_message = orchestration.get("finalResponse") or orchestration.get(
        "message", "Analysis complete."
    )

    # Generate unique prompt ID for this query
    prompt_id = str(uuid.uuid4())

    session["chatHistory"].append({"role": "assistant", "content": temp_message})
    session.setdefault(
        "workflowState",
        {"activeAgent": None, "showAgentFlow": False, "workflowComplete": False},
    )
    session.setdefault("agentsData", [])

    db.sessions.update_one(
        {"sessionId": request.sessionId},
        {
            "$set": {
                "chatHistory": session["chatHistory"],
                "workflowState": session["workflowState"],
            }
        },
    )

    run_agents(db, request.sessionId, agents, request.prompt, prompt_id)

    updated_session = db.sessions.find_one({"sessionId": request.sessionId}, {"_id": 0})
    return {
        "status": "success",
        "sessionId": request.sessionId,
        "queryType": "actionable",
        "plan": orchestration,
        "response": {"message": temp_message},
        "session": updated_session,
    }
