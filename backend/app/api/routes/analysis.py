from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
import uuid

from app.api.schemas import AnalysisRequest
from app.core.db import DatabaseManager, get_db
from app.services.llm_orchestrator import plan_and_run_session
from app.services.query_classifier import classify_query
from app.services.task_planning import plan_tasks
from app.services.generate_pdf_report import create_pdf_report

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
        "promptId": prompt_id,
        "message": orchestrator_message,
        "session": db.get_session(request.sessionId),
    }


# ---------------- NEW API (NON-BREAKING) ---------------- #

@router.get("/generate-report/{prompt_id}")
def generate_report(prompt_id: str, db: DatabaseManager = Depends(get_db)):
    session = db.sessions.find_one(
        {"agentsData.promptId": prompt_id},
        {"agentsData.$": 1, "title": 1}
    )

    if not session or "agentsData" not in session:
        raise HTTPException(status_code=404, detail="Prompt ID not found")

    entry = session["agentsData"][0]
    agents = entry["agents"]

    try:
        result = create_pdf_report(
            drug_name=session["title"],
            indication="general",
            iqvia_data=agents.get("IQVIA_AGENT", {}).get("data", {}),
            exim_data=agents.get("EXIM_AGENT", {}).get("data", {}),
            patent_data=agents.get("PATENT_AGENT", {}).get("data", {}),
            clinical_data=agents.get("CLINICAL_AGENT", {}).get("data", {}),
            internal_knowledge_data=agents.get("INTERNAL_AGENT", {}).get("data", {}),
            report_data=agents.get("REPORT_GENERATOR", {}).get("data", {})
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if result["status"] != "success":
        raise HTTPException(status_code=500, detail=result)

    return FileResponse(
        path=result["file_path"],
        filename=result["file_name"],
        media_type="application/pdf"
    )
