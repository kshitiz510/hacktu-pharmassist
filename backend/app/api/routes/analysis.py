from fastapi import APIRouter, Depends, HTTPException
import uuid

from app.api.schemas import AnalysisRequest
from app.core.db import DatabaseManager, get_db
from app.services.llm_orchestrator import plan_and_run_session
from app.services.query_classifier import classify_query
from app.services.task_planning import plan_tasks

router = APIRouter(tags=["analysis"])


@router.post("/analyze")
async def analyze(request: AnalysisRequest, db: DatabaseManager = Depends(get_db)):
    if not request.sessionId:
        raise HTTPException(status_code=400, detail="sessionId is required")

    session = db.get_session(request.sessionId)
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
        return {
            "status": "success",
            "sessionId": request.sessionId,
            "queryType": query_type,
            "response": {"message": message},
            "session": db.get_session(request.sessionId),
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
        return {
            "status": "success",
            "sessionId": request.sessionId,
            "queryType": "vague",
            "response": {"message": planning["message"]},
            "session": db.get_session(request.sessionId),
        }

    prompt_id = str(uuid.uuid4())

    orchestrator_message = plan_and_run_session(
        db, session, request.prompt, planning["agents"], prompt_id
    )

    # Add assistant's response to chat history
    session["chatHistory"].append(
        {"role": "assistant", "content": orchestrator_message}
    )
    db.sessions.update_one(
        {"sessionId": request.sessionId},
        {"$set": {"chatHistory": session["chatHistory"]}},
    )

    return {
        "status": "success",
        "queryType": "actionable",
        "agents": planning["agents"],
        "message": orchestrator_message,
        "session": db.get_session(request.sessionId),
    }


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
