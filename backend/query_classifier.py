from crewai import LLM
import json

llm = LLM(
    model="groq/llama-3.3-70b-versatile",
    max_tokens=300
)

CLASSIFIER_SYSTEM_PROMPT = """
You are a pharmaceutical AI query classifier.

Classify the user input into exactly ONE of:
1. greeting – casual hello, no question
2. vague – broad medical term with no clear task
3. actionable – specific pharmaceutical analysis request

Rules:
- If greeting: respond naturally and friendly.
- If vague: 
  - Give 2-3 line medical definition
  - Ask what the user wants (market, clinical, patents, drug repurposing, etc.)
- If actionable:
  - Extract: drug name, indication
  - Decide required agents: iqvia, exim, patent, clinical
  - Output agents as JSON array ONLY.

Output format (STRICT JSON):
{
  "type": "greeting" | "vague" | "actionable",
  "message": "...",
  "followup": "...",
  "agents": ["iqvia"],
  "drug": "string or null",
  "indication": "string or null"
}
"""

def classify_query(user_prompt: str):
    messages = [
        {"role": "system", "content": CLASSIFIER_SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt}
    ]

    response = llm.call(messages)

    try:
        return json.loads(response)
    except Exception:
        return {
            "type": "vague",
            "message": "Could you please clarify what you want to know?",
            "followup": "Are you looking for market size, clinical trials, patents, or drug repurposing insights?",
            "agents": [],
            "drug": None,
            "indication": None
        }
