"""
LLM Orchestrator for PharmAssist
Temporary stub: dispatches session to worker agents (no real execution yet)
"""

from typing import Dict, Any, List


def plan_and_run_session(session: Dict[str, Any], user_query: str, agents: List[str]) -> Dict[str, Any]:
    """
    Orchestrate based on full session state.
    For now: only return a frontend-compatible temporary response.
    """

    print("\n[ORCHESTRATOR] Session received")
    print(f"Session ID: {session['sessionId']}")
    print("Agents to run:", agents)

    # Mark all agents as queued
    agents_data = {agent: {"status": "queued"} for agent in agents}

    workflow_state = {
        "stage": "orchestration_started",
        "activeAgents": agents,
        "progress": 0,
        "finalReportReady": False
    }

    return {
        "status": "success",
        "message": (
            "Analysis has been queued. The selected worker agents "
            f"({', '.join(agent.upper() for agent in agents)}) "
            "are now processing the session context. "
            "Results will appear here as each agent completes its task."
        ),
        "session": {
            "sessionId": session["sessionId"],
            "title": session.get("title", "New Analysis"),
            "chatHistory": session["chatHistory"],
            "agentsData": agents_data,
            "workflowState": workflow_state
        },
        "meta": {
            "mode": "temporary_stub",
            "note": "Worker execution is not yet enabled. This is a placeholder response for frontend integration."
        }
    }
