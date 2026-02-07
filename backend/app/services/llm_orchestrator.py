"""
LLM Orchestrator for PharmAssist
Temporary stub: dispatches session to worker agents (no real execution yet)
"""

from typing import Dict, Any, List
from app.agents.clinical_agent.clinical_agent import run_clinical_agent
from app.agents.iqvia_agent.iqvia_agent import run_iqvia_agent
from app.agents.patent_agent.patent_agent import run_patent_agent
from app.agents.exim_agent.exim_agent import run_exim_agent
from app.core.db import DatabaseManager
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
    "INTERNAL_AGENT": "internal_knowledge_data.json",
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

def plan_and_run_session(
    db: DatabaseManager,
    session: Dict[str, Any],
    user_query: str,
    agents: List[str],
    prompt_id: str,
) -> str:

    print("\n[ORCHESTRATOR] Session received")
    print(f"Session ID: {session['sessionId']}")
    print("Agents to run:", agents)

    # Fetch last agent state for context (if exists)
    previous_agents_data = {}
    if session.get("agentsData"):
        last_entry = session["agentsData"][-1]
        previous_agents_data = last_entry.get("agents", {})

    agents_results = previous_agents_data.copy()

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

        normalized_key = agent_key.lower().replace("_agent", "")
        print(f"[ORCHESTRATOR] Running agent: {agent_key} (normalized: {normalized_key})")

        if normalized_key == "clinical":
            data = run_clinical_agent(user_query)
        elif normalized_key == "iqvia":
            data = run_iqvia_agent(user_query)
        elif normalized_key == "exim":
            data = run_exim_agent(user_query)
        elif normalized_key == "patent":
            data = run_patent_agent(user_query)
        else:
            data = load_agent_data(agent_key)

        # Append instead of overwrite
        if agent_key not in agents_results:
            agents_results[agent_key] = []

        agents_results[agent_key].append({
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "query": user_query,
            "result": data
        })

    agent_entry = {
        "promptId": prompt_id,
        "prompt": user_query,
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "agents": agents_results,
    }

    db.sessions.update_one(
        {"sessionId": session["sessionId"]},
        {
            "$push": {"agentsData": agent_entry},
            "$set": {
                "chatHistory": session["chatHistory"],
                "workflowState.activeAgent": None,
                "workflowState.workflowComplete": True,
            },
        },
    )

    return "All agents have completed their tasks. Report generation is underway."
