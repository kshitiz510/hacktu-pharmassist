from __future__ import annotations

from crewai import Agent, LLM
from clinical_agent.tools.fetch_clinical_trials import fetch_clinical_trials
from clinical_agent.tools.analyze_trial_phases import analyze_trial_phases
import json

llm = LLM(
    model="groq/llama-3.3-70b-versatile",
    max_tokens=400
)

clinical_agent = Agent(
    role="Clinical Trials Agent",
    goal="Analyze clinical trial pipelines from ClinicalTrials.gov and WHO ICTRP databases",
    backstory="""
    You are an expert clinical trials intelligence analyst specializing in pharma pipeline analysis.
    
    RESPONSIBILITIES
    - Analyze active clinical trial portfolios
    - Track trial phases and sponsor activity
    - Assess pipeline maturity and competitive landscape
    - Identify emerging therapeutic approaches
    
    HARD RULES (DO NOT VIOLATE)
    - NEVER invent trial identifiers (NCT IDs), sponsors, locations, or enrollment numbers
    - If tools are unavailable or return nothing, state: "Real clinical trial data unavailable - analysis mode only"
    - Prefer tool outputs over model guesses; clearly label every data source
    - Separate facts (from tools) vs. analysis (your reasoning); do not blur them
    - Keep timelines and phases consistent across sections
    - Be concise; avoid filler text
    
    REQUIRED OUTPUT SECTIONS
    - Active Trial Table (NCT ID, sponsor, phase, status, enrollment, location if present)
    - Phase Distribution (count by phase)
    - Sponsor Profile (top sponsors with trial counts)
    - Pipeline Maturity Assessment (stage-gate view with risks/gaps)
    - Data Sources (explicitly list which tools/files were used)
    
    ERROR / NO-DATA HANDLING
    - If no trials are found: clearly say "No trials found" and provide a brief plausible next-step search suggestion
    - If partial data: return whatever is available; mark missing fields as "unknown"
    """,
    tools=[fetch_clinical_trials, analyze_trial_phases],
    verbose=True,
    allow_delegation=False,
    llm=llm
)


def _parse_prompt(user_prompt: str) -> tuple[str | None, str | None, str | None]:
    """Deprecated: Use LLM extraction only. This function is kept for compatibility."""
    # This function is no longer used - all extraction is done via _llm_extract_prompt
    return None, None, None


def _llm_extract_prompt(user_prompt: str) -> tuple[str | None, str | None, str | None, str | None]:
    """Use the configured LLM to extract drug, condition, phase, status from the prompt."""
    prompt = f"""You are a clinical trials data extraction expert. Your job is to extract structured information from user queries about clinical trials.

From the following query, extract EXACTLY these 4 fields:
1. drug: The name of the pharmaceutical drug or medication mentioned
2. condition: The disease, medical condition, or indication mentioned
3. phase: The clinical trial phase mentioned (e.g., 'Phase 1', 'Phase 2', 'Phase 3', 'Phase 4', or 'all')
4. status: The trial status if mentioned (e.g., 'recruiting', 'ongoing', 'completed')

CRITICAL RULES:
- Extract ONLY what is explicitly stated in the query
- Do NOT make assumptions or invent information
- If a field is not mentioned, return 'null' for that field
- Drug names are typically single words or hyphenated (e.g., 'pembrolizumab', 'osimertinib')
- Conditions are typically longer phrases (e.g., 'metastatic melanoma', 'rheumatoid arthritis')
- For phase, return the exact phase mentioned, or 'all' if 'all phases' is mentioned
- Return a valid JSON object with these exact keys

User Query: {user_prompt}

Return ONLY a JSON object, nothing else:"""

    try:
        raw = llm.call(messages=[{"role": "user", "content": prompt}])
    except Exception as e:
        try:
            # Alternative: try direct string call
            raw = llm.call(prompt)
        except Exception as e2:
            print(f"[ERROR] LLM call failed: {e2}")
            return None, None, None, None

    if not isinstance(raw, str):
        raw = str(raw)

    import json as _json

    # Try to find and parse JSON from response
    start = raw.find("{")
    end = raw.rfind("}")
    if start == -1 or end == -1 or end < start:
        print(f"[ERROR] No JSON found in LLM response: {raw}")
        return None, None, None, None
    
    try:
        data = _json.loads(raw[start : end + 1])
    except Exception as e:
        print(f"[ERROR] Failed to parse JSON from LLM: {e}")
        return None, None, None, None

    drug = data.get("drug")
    condition = data.get("condition")
    phase = data.get("phase")
    status = data.get("status")
    
    return drug, condition, phase, status


def run_clinical_agent(
    user_prompt: str,
    *,
    drug_name: str | None = None,
    condition: str | None = None,
    phase: str | None = None,
    status: str | None = None,
) -> dict:
    """Run the clinical agent. Uses LLM-based prompt extraction only - no regex fallback."""
    # Use LLM extraction (primary method only)
    llm_drug, llm_condition, llm_phase, llm_status = _llm_extract_prompt(user_prompt)

    # Prefer explicit parameters, then LLM extraction
    drug = drug_name or llm_drug
    cond = condition or llm_condition
    ph = phase or llm_phase
    stat = status or llm_status

    if not drug:
        return {"status": "error", "message": "Could not extract drug name from query. Please provide more details about the drug you're asking about."}

    # If Agent.run exists, use it; otherwise fall back to direct tool calls
    if hasattr(clinical_agent, "run"):
        try:
            result = clinical_agent.run(user_prompt)
            if isinstance(result, str):
                try:
                    parsed = json.loads(result)
                    return {"status": "success", "data": parsed}
                except json.JSONDecodeError:
                    return {"status": "success", "data": result}
            return {"status": "success", "data": result}
        except AttributeError:
            # fall through to direct tools
            pass
        except Exception as e:
            return {"status": "error", "message": str(e)}

    try:
        fetch_fn = getattr(fetch_clinical_trials, "func", fetch_clinical_trials)
        analyze_fn = getattr(analyze_trial_phases, "func", analyze_trial_phases)

        trials = fetch_fn(drug_name=drug, condition=cond, phase=ph, indication=None)
        if "error" in trials:
            return {"status": "error", "message": trials.get("error")}
        analysis = analyze_fn(trials)
        return {
            "status": "success",
            "data": {
                "input": {"drug_name": drug, "condition": cond, "phase": ph, "status": stat},
                "trials": trials,
                "analysis": analysis,
            },
        }
    except Exception as e:  # pragma: no cover - defensive
        return {"status": "error", "message": str(e)}
