"""
News Agent API routes.

Endpoints
---------
POST /news/enable          — Toggle monitoring for a promptId.
POST /news/recheck         — Trigger immediate recheck for a promptId.
GET  /news/monitored       — List all monitored prompts for a session.
GET  /news/details/{id}    — Get notification details by notificationId.
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
import uuid

from app.core.db import DatabaseManager, get_db
from app.agents.news_agent.news_agent import run_news_agent

router = APIRouter(prefix="/news", tags=["news"])


# ── Request Models ──────────────────────────────────────────────────────────

class EnableNotificationRequest(BaseModel):
    sessionId: str
    promptId: str
    tagName: str = ""
    enabled: bool = True


class RecheckRequest(BaseModel):
    sessionId: str
    promptId: str
    rerunAnalysis: bool = False


class BroadcastIntelRequest(BaseModel):
    text: str = Field(..., min_length=1, description="New intel text to compare against monitored chats")


# ── POST /news/enable ──────────────────────────────────────────────────────

@router.post("/enable")
async def enable_notification(
    request: EnableNotificationRequest,
    db: DatabaseManager = Depends(get_db),
):
    """Toggle monitoring for a specific promptId."""
    session = db.get_session(request.sessionId)
    if not session:
        raise HTTPException(404, "Session not found")

    # Check promptId exists in agentsData
    found = False
    for entry in session.get("agentsData", []):
        if entry.get("promptId") == request.promptId:
            found = True
            break
    if not found:
        raise HTTPException(404, "promptId not found in session")

    now_iso = datetime.now(timezone.utc).isoformat()

    existing = db.db["notifications"].find_one({
        "sessionId": request.sessionId,
        "promptId": request.promptId,
    })

    if existing:
        db.db["notifications"].update_one(
            {"_id": existing["_id"]},
            {"$set": {
                "enabled": request.enabled,
                "tagName": request.tagName or existing.get("tagName", ""),
                "updatedAt": now_iso,
            }},
        )
        return {
            "status": "success",
            "message": f"Monitoring {'enabled' if request.enabled else 'disabled'}",
            "notificationId": existing.get("notificationId", str(existing["_id"])),
            "enabled": request.enabled,
        }
    else:
        notification_id = str(uuid.uuid4())
        doc = {
            "notificationId": notification_id,
            "sessionId": request.sessionId,
            "promptId": request.promptId,
            "tagName": request.tagName,
            "enabled": request.enabled,
            "lastCheckedAt": None,
            "status": "secure",
            "severity": "low",
            "changedFields": [],
            "details": {},
            "requiresManualReview": False,
            "decision_reason": "",
            "createdAt": now_iso,
            "updatedAt": now_iso,
        }
        db.db["notifications"].insert_one(doc)
        return {
            "status": "success",
            "message": f"Monitoring {'enabled' if request.enabled else 'disabled'}",
            "notificationId": notification_id,
            "enabled": request.enabled,
        }


# ── POST /news/recheck ────────────────────────────────────────────────────

@router.post("/recheck")
async def recheck_notification(
    request: RecheckRequest,
    db: DatabaseManager = Depends(get_db),
):
    """Trigger immediate recheck for a monitored promptId."""
    session = db.get_session(request.sessionId)
    if not session:
        raise HTTPException(404, "Session not found")

    # Find original agent data for this promptId
    old_agent_data = None
    for entry in session.get("agentsData", []):
        if entry.get("promptId") == request.promptId:
            old_agent_data = entry.get("agents", {})
            break

    if old_agent_data is None:
        raise HTTPException(404, "promptId not found in session agentsData")

    # Check if notification exists
    notif = db.db["notifications"].find_one({
        "sessionId": request.sessionId,
        "promptId": request.promptId,
    })
    if not notif:
        raise HTTPException(404, "No monitoring record found for this promptId. Enable monitoring first.")

    # ── Optional: re-run the orchestrator to get fresh agent data ──────
    new_agent_data = None
    if request.rerunAnalysis:
        try:
            # Pull the original extracted_params and prompt for this promptId
            original_prompt = None
            extracted_params = {}
            for entry in session.get("agentsData", []):
                if entry.get("promptId") == request.promptId:
                    original_prompt = entry.get("prompt", "")
                    extracted_params = entry.get("extracted_params", {})
                    break

            if original_prompt:
                from app.services.llm_orchestrator import plan_and_run_session
                fresh_result = await plan_and_run_session(
                    request.sessionId,
                    original_prompt,
                    db,
                    recheck_from_notification=True,
                )
                # If fresh data came back, use it as the "new" side of the diff
                if fresh_result and fresh_result.get("agentsData"):
                    new_agent_data = fresh_result["agentsData"]
        except Exception as exc:
            # Don't fail the whole recheck just because orchestrator had issues
            import traceback; traceback.print_exc()
            new_agent_data = None

    # Look for newly uploaded documents associated with this session
    new_doc_text = None
    try:
        from app.agents.internal_knowledge_agent.internal_knowledge_agent import (
            get_document_for_session,
        )
        doc_info = get_document_for_session(request.sessionId)
        if doc_info and doc_info.get("parsed_text"):
            new_doc_text = doc_info["parsed_text"]
    except Exception:
        pass  # No new docs

    # Run News Agent comparator
    result = run_news_agent(
        session_id=request.sessionId,
        prompt_id=request.promptId,
        old_agent_data=old_agent_data,
        new_agent_data=new_agent_data,
        new_document_text=new_doc_text,
        db=db,
    )

    # If status changed, insert a news-notification message into chat history
    compare_result = result.get("data", {}).get("compareResult", {})
    notification = result.get("data", {}).get("notification", {})

    if compare_result.get("status") == "changed":
        severity = compare_result.get("severity", "medium").upper()
        changed_fields = ", ".join(compare_result.get("changedFields", []))
        reason = compare_result.get("decision_reason", "changes detected")

        # Find original prompt text
        original_prompt = ""
        for entry in session.get("agentsData", []):
            if entry.get("promptId") == request.promptId:
                original_prompt = entry.get("prompt", "your research")
                break
        prompt_label = original_prompt[:50] if original_prompt else "your research"

        notif_message = (
            f"News agent detected {severity} risk change for '{prompt_label}' — "
            f"{reason[:120]}. Click to view details and re-run analysis."
        )

        db.sessions.update_one(
            {"sessionId": request.sessionId},
            {"$push": {"chatHistory": {
                "role": "assistant",
                "content": notif_message,
                "type": "news-notification",
                "promptId": request.promptId,
                "notificationId": notification.get("notificationId", ""),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }}},
        )

    return {
        "status": "success",
        "compareResult": compare_result,
        "notification": notification,
    }


# ── GET /news/monitored ───────────────────────────────────────────────────

@router.get("/monitored-all")
async def list_all_monitored(
    db: DatabaseManager = Depends(get_db),
):
    """List ALL enabled monitored notifications across every session."""
    notifications = list(db.db["notifications"].find({"enabled": True}))

    # Batch-fetch unique sessions with lightweight projection (title + agentsData prompt info only)
    session_ids = list({n.get("sessionId") for n in notifications if n.get("sessionId")})
    sessions_cache = {}
    for sid in session_ids:
        sess = db.sessions.find_one(
            {"sessionId": sid},
            {"title": 1, "agentsData.promptId": 1, "agentsData.prompt": 1, "sessionId": 1},
        )
        if sess:
            sessions_cache[sid] = sess

    result = []
    for n in notifications:
        n.pop("_id", None)
        sid = n.get("sessionId", "")
        session = sessions_cache.get(sid, {})

        # Resolve prompt text from agentsData
        pid = n.get("promptId", "")
        prompt_text = ""
        for entry in session.get("agentsData", []):
            if entry.get("promptId") == pid:
                prompt_text = entry.get("prompt", "")
                break

        n["chatTitle"] = session.get("title", n.get("tagName", "Untitled"))
        n["promptText"] = prompt_text[:80] if prompt_text else n.get("tagName", "")
        result.append(n)

    return {
        "status": "success",
        "notifications": result,
        "count": len(result),
    }


@router.get("/monitored")
async def list_monitored(
    sessionId: str,
    db: DatabaseManager = Depends(get_db),
):
    """List all monitored prompts for a session."""
    query = {"sessionId": sessionId}
    notifications = list(db.db["notifications"].find(query))

    # Serialize and enrich with chat title
    session = db.get_session(sessionId)
    prompts_map = {}
    if session:
        for entry in session.get("agentsData", []):
            pid = entry.get("promptId")
            if pid:
                prompts_map[pid] = {
                    "prompt": entry.get("prompt", ""),
                    "timestamp": entry.get("timestamp", ""),
                    "extracted_params": entry.get("extracted_params", {}),
                }

    result = []
    for n in notifications:
        n.pop("_id", None)
        pid = n.get("promptId", "")
        prompt_info = prompts_map.get(pid, {})
        n["chatTitle"] = prompt_info.get("prompt", "")[:60] or n.get("tagName", "Untitled")
        n["extracted_params"] = prompt_info.get("extracted_params", {})
        result.append(n)

    return {
        "status": "success",
        "notifications": result,
        "count": len(result),
    }


# ── GET /news/details/{notificationId} ────────────────────────────────────

@router.get("/details/{notification_id}")
async def get_notification_details(
    notification_id: str,
    db: DatabaseManager = Depends(get_db),
):
    """Get full details for a notification."""
    notif = db.db["notifications"].find_one({"notificationId": notification_id})
    if not notif:
        raise HTTPException(404, "Notification not found")

    notif.pop("_id", None)
    return {
        "status": "success",
        "notification": notif,
    }


# ── POST /news/broadcast-intel ────────────────────────────────────────────

@router.post("/broadcast-intel")
async def broadcast_intel(
    request: BroadcastIntelRequest,
    db: DatabaseManager = Depends(get_db),
):
    """
    Broadcast new intel text against ALL enabled monitored chats.

    Runs the news comparator for each monitored prompt using the supplied
    text as the new-document side of the diff.  Affected chats receive a
    ``news-notification`` message in their chatHistory.
    """
    notifications = list(db.db["notifications"].find({"enabled": True}))
    if not notifications:
        return {
            "status": "success",
            "totalChecked": 0,
            "affectedCount": 0,
            "results": [],
        }

    # Cache sessions to avoid repeated fetches
    sessions_cache: dict = {}
    results = []

    for notif in notifications:
        sid = notif.get("sessionId")
        pid = notif.get("promptId")
        if not sid or not pid:
            continue

        session = sessions_cache.get(sid)
        if session is None:
            session = db.get_session(sid)
            sessions_cache[sid] = session
        if not session:
            continue

        # Find original agent data for this promptId
        old_agent_data = None
        original_prompt = ""
        for entry in session.get("agentsData", []):
            if entry.get("promptId") == pid:
                old_agent_data = entry.get("agents", {})
                original_prompt = entry.get("prompt", "")
                break
        if old_agent_data is None:
            continue

        # Run news comparator with the new intel as document text
        try:
            result = run_news_agent(
                session_id=sid,
                prompt_id=pid,
                old_agent_data=old_agent_data,
                new_agent_data=None,
                new_document_text=request.text,
                db=db,
            )
        except Exception as exc:
            import traceback; traceback.print_exc()
            results.append({
                "sessionId": sid,
                "promptId": pid,
                "status": "error",
                "severity": "low",
                "chatTitle": session.get("title", ""),
            })
            continue

        compare_result = result.get("data", {}).get("compareResult", {})
        notification_doc = result.get("data", {}).get("notification", {})

        # If status changed, push news-notification message into chat history
        if compare_result.get("status") == "changed":
            severity = compare_result.get("severity", "medium").upper()
            reason = compare_result.get("decision_reason", "changes detected")
            prompt_label = original_prompt[:50] if original_prompt else "your research"

            notif_message = (
                f"⚠ News intel: {severity} risk for '{prompt_label}' — "
                f"{reason[:120]}. Review and re-run analysis as needed."
            )

            db.sessions.update_one(
                {"sessionId": sid},
                {"$push": {"chatHistory": {
                    "role": "assistant",
                    "content": notif_message,
                    "type": "news-notification",
                    "promptId": pid,
                    "notificationId": notification_doc.get("notificationId", ""),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }}},
            )

        results.append({
            "sessionId": sid,
            "promptId": pid,
            "status": compare_result.get("status", "secure"),
            "severity": compare_result.get("severity", "low"),
            "chatTitle": session.get("title", ""),
        })

    affected = [r for r in results if r["status"] == "changed"]
    return {
        "status": "success",
        "totalChecked": len(results),
        "affectedCount": len(affected),
        "results": results,
    }
