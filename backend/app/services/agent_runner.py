"""Agent execution helpers (mock + live clinical agent)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List

from app.agents.clinical_agent.clinical_agent import run_clinical_agent
from app.core.config import MOCK_DATA_DIR
from app.core.db import DatabaseManager


# Mapping of agent key to mock data file name under mockData/
AGENT_MOCK_FILES = {
    "iqvia": "iqvia.json",
    "exim": "exim_data.json",
    "patent": "patent_data.json",
    "clinical": "clinical_data.json",
    "internal": "internal_knowledge_data.json",
    "web_intelligence": "web_intel.json",
    "report_generator": "report_data.json",
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


def run_agents(
    db: DatabaseManager, session_id: str, agents: List[str], prompt: str, prompt_id: str
) -> None:
    """Execute all requested agents and persist their outputs per prompt."""
    agents_results = {}

    for agent_key in agents:
        key_lower = agent_key.lower()

        db.sessions.update_one(
            {"sessionId": session_id},
            {
                "$set": {
                    "workflowState.activeAgent": agent_key,
                    "workflowState.showAgentFlow": True,
                }
            },
        )

        if "clinical" in key_lower:
            data = run_clinical_agent(prompt)
        else:
            data = load_agent_data(key_lower)

        agents_results[key_lower] = data

    # Append all agent results under this prompt to agentsData
    db.append_agents_data(session_id, prompt_id, prompt, agents_results)

    db.sessions.update_one(
        {"sessionId": session_id},
        {
            "$set": {
                "workflowState.activeAgent": None,
                "workflowState.workflowComplete": True,
            }
        },
    )
