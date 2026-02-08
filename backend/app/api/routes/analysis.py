from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
import uuid
import json

from app.api.schemas import AnalysisRequest
from app.core.db import DatabaseManager, get_db
from app.services.task_planning import plan_tasks
from app.services.llm_orchestrator import plan_and_run_session
from app.services.generate_pdf_report import create_pdf_report, create_comparison_pdf_report
from app.services.query_classifier import classify_query


router = APIRouter(tags=["analysis"])


def update_session(db: DatabaseManager, session: dict):
    session_id = session["sessionId"]

    safe_session = session.copy()
    safe_session.pop("_id", None)
    safe_session.pop("sessionId", None)

    db.sessions.update_one(
        {"sessionId": session_id},
        {"$set": safe_session}
    )


def _reset_voice_state(session: dict):
    """
    Reset voice state after planning/execution completes.
    Ensures voice agent doesn't persist across workflows.
    """
    if "voiceState" in session:
        session["voiceState"] = {
            "mode": "idle",
            "is_speaking": False,
            "was_interrupted": False,
            "partial_transcript": "",
            "finalized_transcript": "",
            "original_prompt": "",
            "refined_prompt": "",
            "prompt_confirmed": False,
            "current_response": "",
            "interruption_point": 0,
            "clarifying_questions": [],
            "clarifying_responses": [],
            "voice_turns": [],
            "last_activity": "",
            "error": None
        }


def _build_consolidated_prompt(session: dict) -> str:
    """
    Build a consolidated prompt from all user messages in chat history.
    This ensures all context (drug, disease, intent) is passed to agents.
    """
    user_messages = []
    for msg in session.get("chatHistory", []):
        if msg.get("role") == "user":
            user_messages.append(msg.get("content", ""))
    
    if not user_messages:
        return ""
    
    # Combine all user messages into a coherent prompt
    if len(user_messages) == 1:
        return user_messages[0]
    
    # Multiple messages - combine with context
    return " | Context from conversation: ".join(user_messages)


def _get_session_context(session: dict) -> dict:
    """
    Extract accumulated context from session for follow-up prompts.
    Looks at previous agent runs to understand what was analyzed.
    """
    context = {
        "previous_drugs": [],
        "previous_indications": [],
        "previous_agents": [],
        "last_analysis_summary": None
    }
    
    agents_data = session.get("agentsData", [])
    if agents_data:
        last_run = agents_data[-1]
        extracted = last_run.get("extracted_params", {})
        
        if extracted.get("drug"):
            context["previous_drugs"].append(extracted["drug"])
        if extracted.get("indication"):
            context["previous_indications"].append(extracted["indication"])
        
        # Get list of agents that ran
        agents = last_run.get("agents", {})
        context["previous_agents"] = list(agents.keys())
        
        # Get a brief summary from the last run
        for agent_key, agent_data in agents.items():
            data = agent_data.get("data", {})
            if isinstance(data, dict) and data.get("summary"):
                context["last_analysis_summary"] = data.get("summary")
                break
    
    return context


@router.post("/analyze")
async def analyze(request: AnalysisRequest, db: DatabaseManager = Depends(get_db)):
    if not request.sessionId:
        raise HTTPException(400, "sessionId is required")

    session = db.get_session(request.sessionId)
    if not session:
        raise HTTPException(404, "Invalid sessionId")

    if not request.prompt.strip():
        raise HTTPException(400, "Prompt cannot be empty")

    # ---- INIT SESSION STATE ----
    session.setdefault("chatHistory", [])
    session.setdefault("planningState", {
        "status": "planning",   # planning | ready | executing
        "lastPlan": None,
        "originalPrompt": None,
        "consolidatedPrompt": None
    })

    planning_state = session["planningState"]
    
    # ---- GET SESSION CONTEXT FOR FOLLOW-UPS ----
    session_context = _get_session_context(session)

    # ---- STORE USER MESSAGE ----
    session["chatHistory"].append({
        "role": "user",
        "content": request.prompt
    })

    # ============================================================
    # ✅ EXECUTION CONFIRMATION (ONLY IF PLAN EXISTS)
    # ============================================================
    if planning_state["status"] == "ready" and planning_state.get("lastPlan"):
        session["chatHistory"].append({
            "role": "assistant",
            "content": "Executing the approved analysis plan."
        })

        update_session(db, session)

        return {
            "status": "success",
            "queryType": "confirm",
            "message": "Plan confirmed. Executing analysis.",
            "session": session
        }

    # ============================================================
    # ❗ CLASSIFIER ONLY IF NOT PLANNING (skip for follow-ups after workflow)
    # ============================================================
    if planning_state["status"] not in ["planning", "executing"]:
        # Reset to planning for new analysis after workflow completion
        planning_state["status"] = "planning"
        planning_state["lastPlan"] = None
        planning_state["originalPrompt"] = None
        planning_state["consolidatedPrompt"] = None
    
    # Classify query
    classification = classify_query(request.prompt)
    if classification.get("type") in ["greeting", "irrelevant"]:
        session["chatHistory"].append({
            "role": "assistant",
            "content": classification.get("message", "")
        })
        update_session(db, session)
        return {
            "status": "success",
            "queryType": classification["type"],
            "response": classification["message"],
            "session": session
        }

    # ============================================================
    # 🧠 PLANNER - with session context injection
    # ============================================================
    # Inject previous context into chat for the planner to use
    if session_context["previous_drugs"] or session_context["previous_indications"]:
        context_note = f"[Previous analysis context: Drug(s): {', '.join(session_context['previous_drugs']) or 'None'}, Indication(s): {', '.join(session_context['previous_indications']) or 'None'}]"
        # Add as a system note in the planning call
        session["_context_note"] = context_note
    
    planning = plan_tasks(session)
    
    # Clean up temp context
    session.pop("_context_note", None)
    
    # Ensure planning response is valid (should never be None from plan_tasks)
    if not planning or not isinstance(planning, dict):
        print(f"[ERROR] Invalid planning response type: {type(planning)}, value: {planning}")
        planning = {
            "type": "vague",
            "message": "I encountered an issue while planning. Could you please rephrase your request?",
            "agents": [],
            "drug": None,
            "indication": None
        }
    else:
        print(f"[DEBUG] Planning response valid. Type: {planning.get('type')}")
    
    planning=json.loads(json.dumps(planning))  # Ensure planning is JSON-serializable
    # ============================================================
    # 🟡 PLANNING (VAGUE → ASK QUESTIONS)
    # ============================================================
    if planning.get("type") == "vague":
        planning_state["status"] = "planning"
        planning_state["lastPlan"] = None

        session["chatHistory"].append({
            "role": "assistant",
            "content": planning["message"],
            "type": "planning-question"
        })

        update_session(db, session)

        return {
            "status": "success",
            "queryType": "planning",
            "response": planning["message"],
            "session": session
        }

    # ============================================================
    # 🟢 READY (FINAL PLAN GENERATED)
    # ============================================================
    if planning.get("type") == "plan":
        planning_state["status"] = "ready"
        planning_state["lastPlan"] = planning
        planning_state["originalPrompt"] = request.prompt
        
        # Build consolidated prompt from entire chat history
        consolidated = planning.get("consolidated_prompt") or _build_consolidated_prompt(session)
        planning_state["consolidatedPrompt"] = consolidated

        # Add a summary message (not the full plan JSON) to chatHistory
        agent_names = ", ".join(planning.get("agents", []))
        drug_display = planning.get('drug', ['this drug'])
        indication_display = planning.get('indication', ['the indicated condition'])
        
        drug_str = drug_display[0] if isinstance(drug_display, list) and drug_display else str(drug_display or 'this drug')
        indication_str = indication_display[0] if isinstance(indication_display, list) and indication_display else str(indication_display or 'the indicated condition')
        
        session["chatHistory"].append({
            "role": "assistant",
            "content": f"Analysis plan ready. I will analyze {drug_str} for {indication_str} using: {agent_names}.\n\nPlease click 'Confirm & Execute' to proceed.",
            "type": "plan"
        })

        update_session(db, session)

        return {
            "status": "success",
            "queryType": "ready",
            "plan": planning,
            "message": "Planning complete. Confirm to execute.",
            "session": session
        }

    # ============================================================
    # FALLBACK (SHOULD NEVER HIT)
    # ============================================================
    session["chatHistory"].append({
        "role": "assistant",
        "content": "I couldn't determine the next step. Please rephrase."
    })
    update_session(db, session)

    return {
        "status": "error",
        "message": "Unknown planning state",
        "session": session
    }


@router.post("/execute")
async def execute(sessionId: str, db: DatabaseManager = Depends(get_db)):
    session = db.get_session(sessionId)
    if not session:
        raise HTTPException(404, "Invalid sessionId")

    planning_state = session.get("planningState")
    if not planning_state or planning_state["status"] != "ready":
        raise HTTPException(400, "Planning not complete")

    plan = planning_state["lastPlan"]
    prompt_id = str(uuid.uuid4())

    planning_state["status"] = "executing"
    
    # Use consolidated prompt (combines all user context) instead of just original prompt
    consolidated_prompt = planning_state.get("consolidatedPrompt") or planning_state.get("originalPrompt", "")
    
    print(f"[EXECUTE] Running orchestrator with agents: {plan['agents']}")
    print(f"[EXECUTE] Consolidated prompt: {consolidated_prompt[:200]}...")

    orchestrator_message = plan_and_run_session(
        db=db,
        session=session,
        user_query=consolidated_prompt,
        agents=plan["agents"],
        prompt_id=prompt_id,
        plan_context={
            "drug": plan.get("drug"),
            "indication": plan.get("indication"),
        }
    )
    
    print(f"[EXECUTE] Orchestrator completed: {orchestrator_message}")

    # Refresh session from DB to get updated agentsData from orchestrator
    updated_session = db.get_session(sessionId)
    
    # Reset planning state for next analysis (CRITICAL: allows new workflows)
    updated_session["planningState"] = {
        "status": "planning",
        "lastPlan": None,
        "originalPrompt": None,
        "consolidatedPrompt": None
    }
    
    # Reset voice state after execution (CRITICAL: voice agent doesn't persist)
    _reset_voice_state(updated_session)
    
    updated_session["chatHistory"].append({
        "role": "assistant",
        "content": orchestrator_message,
        "type": "agent-complete",
        "promptId": prompt_id
    })

    update_session(db, updated_session)

    return {
        "status": "success",
        "promptId": prompt_id,
        "message": orchestrator_message,
        "session": updated_session
    }


# ---------------- REPORT DOWNLOAD ---------------- #

@router.get("/generate-report/{prompt_id}")
def generate_report(prompt_id: str, db: DatabaseManager = Depends(get_db)):
    session = db.sessions.find_one(
        {"agentsData.promptId": prompt_id}, {"agentsData.$": 1, "title": 1, "chatHistory": 1}
    )

    if not session or "agentsData" not in session:
        raise HTTPException(status_code=404, detail="Prompt ID not found")

    entry = session["agentsData"][0]
    agents = entry["agents"]
    extracted_params = entry.get("extracted_params", {})
    
    # Get drug and indication from extracted params or session title
    drug_name = extracted_params.get("drug") or session.get("title", "Drug Analysis")
    indication = extracted_params.get("indication") or "general"

    try:
        result = create_pdf_report(
            drug_name=drug_name,
            indication=indication,
            iqvia_data=agents.get("IQVIA_AGENT", {}).get("data", {}),
            exim_data=agents.get("EXIM_AGENT", {}).get("data", {}),
            patent_data=agents.get("PATENT_AGENT", {}).get("data", {}),
            clinical_data=agents.get("CLINICAL_AGENT", {}).get("data", {}),
            internal_knowledge_data=agents.get("INTERNAL_KNOWLEDGE_AGENT", {}).get("data", {}),
            web_intelligence_data=agents.get("WEB_INTELLIGENCE_AGENT", {}).get("data", {}),
            report_data=agents.get("REPORT_GENERATOR", {}).get("data", {}),
            # Pass visualizations for chart rendering
            visualizations={
                "iqvia": agents.get("IQVIA_AGENT", {}).get("data", {}).get("visualizations", []),
                "clinical": agents.get("CLINICAL_AGENT", {}).get("data", {}).get("visualizations", []),
                "patent": agents.get("PATENT_AGENT", {}).get("data", {}).get("visualizations", []),
                "exim": agents.get("EXIM_AGENT", {}).get("data", {}).get("visualizations", []),
                "web": agents.get("WEB_INTELLIGENCE_AGENT", {}).get("data", {}).get("visualizations", []),
            }
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

    if result["status"] != "success":
        raise HTTPException(status_code=500, detail=result)

    return FileResponse(
        path=result["file_path"],
        filename=result["file_name"],
        media_type="application/pdf",
    )


# ---------------- COMPARISON REPORT ---------------- #

@router.post("/generate-comparison-report")
def generate_comparison_report(
    prompt_ids: list[str],
    db: DatabaseManager = Depends(get_db)
):
    """
    Generate a comparison PDF report for multiple analyses.
    
    Args:
        prompt_ids: List of prompt IDs to compare (2-5 prompts)
    """
    if len(prompt_ids) < 2:
        raise HTTPException(400, "At least 2 prompt IDs required for comparison")
    if len(prompt_ids) > 5:
        raise HTTPException(400, "Maximum 5 prompt IDs allowed for comparison")
    
    # Collect data from all prompts
    comparisons = []
    for prompt_id in prompt_ids:
        session = db.sessions.find_one(
            {"agentsData.promptId": prompt_id}, 
            {"agentsData.$": 1, "title": 1}
        )
        
        if not session or "agentsData" not in session:
            raise HTTPException(404, f"Prompt ID not found: {prompt_id}")
        
        entry = session["agentsData"][0]
        agents = entry["agents"]
        extracted_params = entry.get("extracted_params", {})
        
        comparisons.append({
            "prompt_id": prompt_id,
            "drug_name": extracted_params.get("drug") or session.get("title", "Drug Analysis"),
            "indication": extracted_params.get("indication") or "general",
            "agents": agents
        })
    
    try:
        result = create_comparison_pdf_report(comparisons)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"Failed to generate comparison report: {str(e)}")
    
    if result["status"] != "success":
        raise HTTPException(500, result.get("error", "Unknown error"))
    
    return FileResponse(
        path=result["file_path"],
        filename=result["file_name"],
        media_type="application/pdf"
    )
