from fastapi import APIRouter, Depends, HTTPException

from app.api.schemas import SessionCreateRequest
from app.core.db import DatabaseManager, get_db

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("/create")
async def create_session(
    request: SessionCreateRequest, db: DatabaseManager = Depends(get_db)
):
    session_id = db.create_session(title=request.title)
    return {"status": "success", "sessionId": session_id, "title": request.title}


@router.get("")
async def list_sessions(
    limit: int = 50, skip: int = 0, db: DatabaseManager = Depends(get_db)
):
    sessions = list(
        db.sessions.find({}, {"_id": 0}).sort("createdAt", -1).skip(skip).limit(limit)
    )
    return {"status": "success", "sessions": sessions}


@router.get("/{session_id}")
async def get_session(session_id: str, db: DatabaseManager = Depends(get_db)):
    session = db.sessions.find_one({"sessionId": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": "success", "session": session}


@router.delete("/{session_id}/delete")
async def delete_session(session_id: str, db: DatabaseManager = Depends(get_db)):
    result = db.sessions.delete_one({"sessionId": session_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": "success"}
