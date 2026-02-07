from crewai import LLM
import json

llm = LLM(
    model="groq/llama-3.3-70b-versatile",
    max_tokens=300
)

PLANNING_SYSTEM_PROMPT = """
You are a Pharmaceutical AI Task Planner.

IMPORTANT:
- Output MUST be a single valid JSON object.
- All newlines inside string values MUST be escaped as \\n (no raw line breaks).
- Do not include any text before or after the JSON.
- Ignore formatting of previous assistant messages.

You are given a user query related to the pharmaceutical domain.

Your job:

1. If the query is clear and actionable:
   Return:
   {
     "type": "plan",
     "agents": ["AGENT_KEY_1", "AGENT_KEY_2"],
     "drug": "<drug name or null>",
     "indication": "<disease/indication or null>"
   }

2. If the query is vague, broad, or insufficient:
   Return:
   {
     "type": "vague",
     "message": "Short definition followed by clarification questions (escaped with \\n)",
     "agents": [],
     "drug": null,
     "indication": null
   }

## AVAILABLE WORKER AGENTS
- "iqvia": IQVIA Insights Agent - Market size, sales trends, CAGR, therapy competition, competitor data
- "exim": EXIM Trends Agent - Export-import trade data, API sourcing, trade volumes, import dependency
- "patent": Patent Landscape Agent - Patent filings, expiry timelines, FTO analysis, IP landscape
- "clinical": Clinical Trials Agent - Trial pipeline data, sponsor profiles, trial phases, MoA mapping
- "internal_knowledge": Internal Knowledge Agent - Strategy synthesis, internal research, comparative analysis
- "report_generator": Report Generator Agent - PDF report generation, summary compilation
## AGENT SELECTION LOGIC
- Market size, sales, CAGR, competition analysis → include "iqvia"
- Export-import, trade data, API sourcing → include "exim"
- Patents, IP, expiry, FTO → include "patent"
- Clinical trials, pipeline, sponsors → include "clinical"
- Internal strategy, synthesis, comparison → include "internal_knowledge"
- Always include "report_generator" at the end for comprehensive queries

Available Agent Keys:
- "IQVIA_AGENT"
- "EXIM_AGENT"
- "PATENT_AGENT"
- "CLINICAL_AGENT"
- "INTERNAL_KNOWLEDGE_AGENT"
- "WEB_INTEL_AGENT"

Rules:
- Always return valid JSON.
- Never return raw text.
- No separate 'questions' or 'definition' fields.
- All clarification must be inside the 'message' string only.
- No markdown, no commentary.
"""

import re

def _safe_json_parse(text: str):
    # Extract first JSON object
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("No JSON object found in LLM output")

    json_text = text[start:end+1]

    # Remove invalid control characters
    json_text = re.sub(r'[\x00-\x1f\x7f]', '', json_text)

    return json.loads(json_text)


def plan_tasks(user_prompt: str, session: dict):
    messages = [
        {"role": "system", "content": PLANNING_SYSTEM_PROMPT}
    ]

    # Add previous chat history for context
    for turn in session.get("chatHistory", []):
        messages.append({
            "role": turn["role"],
            "content": turn["content"]
        })

    # Add current user message
    messages.append({"role": "user", "content": user_prompt})

    response = llm.call(messages)
    print("Planning Response:\n", response)

    try:
        result = _safe_json_parse(response)

        if result.get("type") == "vague":
            parts = []

            if "definition" in result:
                parts.append(result["definition"])

            if "message" in result:
                parts.append(result["message"])

            if "questions" in result:
                questions_text = "\n".join([f"• {q}" for q in result["questions"]])
                parts.append("Please clarify:\n" + questions_text)

            result["message"] = "\n\n".join(parts)
            result.pop("definition", None)
            result.pop("questions", None)

        return result

    except Exception as e:
        print(f"[TASK_PLANNING] Error parsing LLM response: {e}")

        return {
            "type": "vague",
            "message": (
                "this is wrong response from the LLM, "
            ),
            "agents": [],
            "drug": None,
            "indication": None
        }



