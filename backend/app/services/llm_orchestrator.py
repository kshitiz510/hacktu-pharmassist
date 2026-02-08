"""
LLM Orchestrator for PharmAssist
Dispatches session to worker agents with unified parameter extraction.
Supports memory/context accumulation across chat turns.
"""

from typing import Dict, Any, List, Optional
from app.agents.clinical_agent.clinical_agent import run_clinical_agent
from app.agents.iqvia_agent.iqvia_agent import run_iqvia_agent
from app.agents.patent_agent.patent_agent import run_patent_agent
from app.agents.exim_agent.exim_agent import run_exim_agent
from app.agents.internal_knowledge_agent.internal_knowledge_agent import run_internal_knowledge_agent
from app.agents.web_intelligence_agent.web_intelligence_agent import run_web_intelligence_agent
from app.core.db import DatabaseManager
from app.services.parameter_extractor import extract_all_parameters
import datetime
from app.core.config import MOCK_DATA_DIR
import json
from pathlib import Path

# Mapping of agent key to mock data file name under mockData/
AGENT_MOCK_FILES = {
    "IQVIA_AGENT": "iqvia.json",
    "EXIM_AGENT": "exim_data.json",
    "PATENT_AGENT": "patent_data.json",
    "CLINICAL_AGENT": "clinical_data.json",
    "INTERNAL_KNOWLEDGE_AGENT": "internal_knowledge_data.json",
    "WEB_INTELLIGENCE_AGENT": "web_intel.json",
    "REPORT_GENERATOR": "report_data.json",
}


def load_agent_data(agent_key: str) -> Dict[str, Any]:
    """Load mock data payload for a given agent key."""
    file_name = AGENT_MOCK_FILES.get(agent_key)
    if not file_name:
        return {}

    data_path = Path(MOCK_DATA_DIR) / file_name
    if not data_path.exists():
        return {}

    try:
        with data_path.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
    except Exception:
        return {}

    if isinstance(data, dict):
        first_key = next(iter(data), None)
        if first_key and isinstance(data[first_key], dict):
            return data[first_key]
    return data


def _merge_plan_context(extracted_params: Dict[str, Any], plan_context: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Merge plan context (from task planner) with extracted parameters.
    Plan context takes precedence for drug/indication as it's accumulated from full chat.
    """
    if not plan_context:
        return extracted_params
    
    merged = extracted_params.copy()
    
    # Drug from plan context (accumulated from chat history)
    plan_drug = plan_context.get("drug")
    if plan_drug:
        if isinstance(plan_drug, list) and plan_drug:
            merged["drug"] = plan_drug[0]
        elif isinstance(plan_drug, str):
            merged["drug"] = plan_drug
    
    # Indication from plan context
    plan_indication = plan_context.get("indication")
    if plan_indication:
        if isinstance(plan_indication, list) and plan_indication:
            merged["indication"] = plan_indication[0]
            merged["condition"] = plan_indication[0]
        elif isinstance(plan_indication, str):
            merged["indication"] = plan_indication
            merged["condition"] = plan_indication
    
    # Update search_term and product based on merged values
    if merged.get("drug") and not merged.get("search_term"):
        merged["search_term"] = merged["drug"]
    if merged.get("drug") and not merged.get("product"):
        merged["product"] = merged["drug"]
    
    return merged


def _generate_next_prompts(drug: str, indication: str, agents_results: Dict[str, Any]) -> List[Dict[str, str]]:
    """
    Generate suggested next prompts based on analysis results.
    
    Analyzes the workflow results and suggests relevant follow-up research areas.
    
    Args:
        drug: Drug name analyzed
        indication: Indication/disease analyzed
        agents_results: Dict of agent results
        
    Returns:
        List of suggested prompt objects with 'prompt' key
    """
    suggestions = []
    drug = drug or "the drug"
    indication = indication or "the indication"
    
    # Check Patent results for FTO status
    patent_data = agents_results.get("PATENT_AGENT", {}).get("data", {})
    if isinstance(patent_data, dict):
        fto = patent_data.get("fto", {})
        fto_status = fto.get("ftoStatus", "")
        if fto_status in ["BLOCKED", "AT_RISK"]:
            suggestions.append({
                "prompt": f"Find alternative compounds to {drug} with better patent freedom"
            })
        elif fto_status == "CLEAR":
            suggestions.append({
                "prompt": f"Explore repurposing {drug} for other indications"
            })
    
    # Check Clinical results for trial gaps
    clinical_data = agents_results.get("CLINICAL_AGENT", {}).get("data", {})
    if isinstance(clinical_data, dict):
        trials = clinical_data.get("trials", {})
        phase_dist = clinical_data.get("phase_distribution", [])
        if phase_dist:
            # Check if mostly Phase 2/3 trials
            late_phase = sum(p.get("count", 0) for p in phase_dist if "3" in str(p.get("phase", "")))
            if late_phase > 0:
                suggestions.append({
                    "prompt": f"What are the commercialization timelines for {drug} in {indication}?"
                })
            else:
                suggestions.append({
                    "prompt": f"Show early-stage research on {drug} mechanism of action"
                })
    
    # Check Market data for growth opportunities
    iqvia_data = agents_results.get("IQVIA_AGENT", {}).get("data", {})
    if isinstance(iqvia_data, dict):
        market_forecast = iqvia_data.get("market_forecast", {})
        if market_forecast:
            suggestions.append({
                "prompt": f"Compare {drug} market potential vs competitors in {indication}"
            })
    
    # Check EXIM data for supply chain insights
    exim_data = agents_results.get("EXIM_AGENT", {}).get("data", {})
    if isinstance(exim_data, dict):
        llm_insights = exim_data.get("llm_insights", {})
        dependency = llm_insights.get("import_dependency", {})
        if dependency.get("dependency_ratio", 0) > 50:
            suggestions.append({
                "prompt": f"Identify alternative API sourcing options for {drug}"
            })
    
    # Add general follow-up suggestions if we don't have enough
    if len(suggestions) < 3:
        general_suggestions = [
            {"prompt": f"Explore repurposing {drug} for cancer treatment"},
            {"prompt": f"Analyze {drug} safety profile for elderly patients"},
            {"prompt": f"Compare {drug} with biosimilar alternatives"},
            {"prompt": f"Show regulatory pathway for {drug} in EU and Asia"},
            {"prompt": f"Find combination therapy opportunities for {drug}"},
        ]
        
        # Add unique suggestions
        existing_prompts = {s["prompt"] for s in suggestions}
        for gs in general_suggestions:
            if gs["prompt"] not in existing_prompts and len(suggestions) < 4:
                suggestions.append(gs)
    
    return suggestions[:4]  # Return max 4 suggestions


def plan_and_run_session(
    db: DatabaseManager,
    session: Dict[str, Any],
    user_query: str,
    agents: List[str],
    prompt_id: str,
    plan_context: Optional[Dict[str, Any]] = None,
) -> str:
    print("\n[ORCHESTRATOR] Session received")
    print(f"Session ID: {session['sessionId']}")
    print("Agents to run (original):", agents)
    
    # ========================================================================
    # ENSURE WEB AGENT IS ALWAYS INCLUDED
    # LLM planner might forget to include it, so we force it here
    # ========================================================================
    if "web" not in [a.lower() for a in agents]:
        print("[ORCHESTRATOR] 'web' agent missing from plan - adding it automatically")
        agents.append("web")
    
    print("Agents to run (after ensuring web):", agents)

    # ========================================================================
    # UNIFIED PARAMETER EXTRACTION (called once for all agents)
    # ========================================================================
    print("[ORCHESTRATOR] Extracting unified parameters from user prompt...")
    extracted_params = extract_all_parameters(user_query)
    
    # Merge with plan context (accumulated drug/indication from chat history)
    extracted_params = _merge_plan_context(extracted_params, plan_context)
    print(f"[ORCHESTRATOR] Merged params (with plan context): {extracted_params}")

    # Fetch last agent state for context (if exists)
    previous_agents_data = {}
    if session.get("agentsData"):
        last_entry = session["agentsData"][-1]
        previous_agents_data = last_entry.get("agents", {})

    agents_results = {}  # Start fresh for each workflow run

    # ========================================================================
    # RUN AGENTS WITH EXTRACTED PARAMETERS
    # ========================================================================
    for agent_key in agents:
        db.sessions.update_one(
            {"sessionId": session["sessionId"]},
            {
                "$set": {
                    "workflowState.activeAgent": agent_key,
                    "workflowState.showAgentFlow": True,
                }
            },
        )

        normalized_key = agent_key.lower().replace("_agent", "").replace("_", "")
        print(f"[ORCHESTRATOR] Running agent: {agent_key} (normalized: {normalized_key})")

        try:
            if normalized_key == "clinical":
                data = run_clinical_agent(
                    user_query,
                    drug_name=extracted_params.get("drug"),
                    condition=extracted_params.get("condition"),
                    phase=extracted_params.get("phase"),
                    status=extracted_params.get("trial_status"),
                )
            elif normalized_key == "iqvia":
                data = run_iqvia_agent(
                    user_query,
                    search_term=extracted_params.get("search_term"),
                    therapy_area=extracted_params.get("therapy_area"),
                    indication=extracted_params.get("indication"),
                )
            elif normalized_key == "exim":
                data = run_exim_agent(
                    user_query,
                    product=extracted_params.get("product"),
                    year=extracted_params.get("year"),
                    country=extracted_params.get("country"),
                    trade_type=extracted_params.get("trade_type"),
                )
            elif normalized_key == "patent":
                data = run_patent_agent(
                    user_query,
                    drug=extracted_params.get("drug"),
                    disease=extracted_params.get("indication"),
                    jurisdiction=extracted_params.get("jurisdiction"),
                )
            elif normalized_key in ["internal", "internalknowledge"]:
                data = run_internal_knowledge_agent(user_query, session_id=session["sessionId"])
            elif normalized_key in ["webintel", "webintelligence", "web"]:
                # Web Intelligence Agent - real-time web signals
                print(f"[ORCHESTRATOR] Running Web Intelligence Agent with query: {user_query}")
                data = run_web_intelligence_agent(user_query)
                # Keep agent_key as-is for consistency (already normalized to "web")
            elif normalized_key in ["report", "reportgenerator", "generator"]:
                # Report Generator - use mock data for now
                print("[ORCHESTRATOR] Report generator placeholder")
                data = {
                    "status": "success",
                    "data": load_agent_data("REPORT_GENERATOR"),
                    "visualizations": []
                }
            else:
                print(f"[ORCHESTRATOR] No handler for {agent_key}, loading mock data")
                data = load_agent_data(agent_key)

            # Store agent result directly (not as array)
            agents_results[agent_key] = {
                "timestamp": datetime.datetime.utcnow().isoformat(),
                "query": user_query,
                "data": data,
            }
        except Exception as e:
            print(f"[ORCHESTRATOR] Error running {agent_key}: {e}")
            agents_results[agent_key] = {
                "timestamp": datetime.datetime.utcnow().isoformat(),
                "query": user_query,
                "data": {"status": "error", "message": str(e)},
            }

    # Generate suggested next prompts based on analysis results
    suggested_next_prompts = _generate_next_prompts(
        extracted_params.get("drug", "drug"),
        extracted_params.get("indication", "indication"),
        agents_results
    )

    agent_entry = {
        "promptId": prompt_id,
        "prompt": user_query,
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "agents": agents_results,
        "extracted_params": extracted_params,
        "suggestedNextPrompts": suggested_next_prompts,
    }

    db.sessions.update_one(
        {"sessionId": session["sessionId"]},
        {
            "$push": {"agentsData": agent_entry},
            "$set": {
                "chatHistory": session["chatHistory"],
                "workflowState.activeAgent": None,
                "workflowState.workflowComplete": True,
                "suggestedNextPrompts": suggested_next_prompts,
            },
        },
    )

    return "All agents have completed their tasks. Report generation is underway."
