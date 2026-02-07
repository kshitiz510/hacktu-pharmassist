"""
Patent FTO Analysis Agent

Purpose: Answer the critical business question:
"Can we use Drug X for Disease Y without infringing active patents?"

Architecture:
- Tool 1 (discover_patents): Find candidate patents via USPTO
- Tool 2 (verify_patent_blocking): Verify blocking status via Google Patents + LLM
- Tool 3 (fto_decision_engine): Deterministic FTO scoring and recommendations

This module follows the same pattern as clinical_agent.py for consistency.
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from crewai import Agent, LLM

from app.services.viz_builder import build_patent_visualizations
from .tools import discover_patents, verify_patent_blocking, fto_decision_engine

# LLM for prompt extraction (matches clinical_agent pattern)
llm = LLM(model="groq/llama-3.3-70b-versatile", max_tokens=400)

# Agent definition (kept for backwards compatibility)
patent_agent = Agent(
    role="Pharmaceutical Patent FTO Analyst",
    goal="""
    Determine Freedom-to-Operate (FTO) for drug-disease combinations by:
    1. Discovering relevant patents from USPTO
    2. Verifying if patents block the intended use
    3. Calculating FTO risk scores and recommending actions
    
    ALWAYS answer: "Can we use Drug X for Disease Y, and if not, when can we?"
    """,
    backstory="""
    You are a pharmaceutical intellectual property analyst specializing in 
    Freedom-to-Operate (FTO) assessments for drug repurposing.
    
    HARD RULES (DO NOT VIOLATE):
    - NEVER invent patent numbers, expiry dates, or claim language
    - If tools are unavailable or return nothing, state: "Patent data unavailable"
    - Prefer tool outputs over model guesses; clearly label every data source
    - Separate facts (from tools) vs. analysis (your reasoning)
    - Jurisdiction is US unless specified otherwise
    
    REQUIRED OUTPUT:
    - FTO Status (CLEAR / LOW_RISK / MODERATE_RISK / HIGH_RISK)
    - Blocking patents with expiry dates
    - Earliest freedom date
    - Confidence level
    - Recommended actions
    """,
    tools=[discover_patents, verify_patent_blocking, fto_decision_engine],
    verbose=True,
    allow_delegation=False,
    llm=llm,
)


# ============================================================================
# INPUT PARSING (MATCHES CLINICAL AGENT PATTERN)
# ============================================================================


def _llm_extract_prompt(
    user_prompt: str,
) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Use the configured LLM to extract drug, disease, jurisdiction from the prompt.
    
    Follows the same pattern as clinical_agent._llm_extract_prompt()
    """
    prompt = f"""You are a pharmaceutical patent data extraction expert. Your job is to extract structured information from user queries about patent analysis and freedom-to-operate.

From the following query, extract EXACTLY these 3 fields:
1. drug: The name of the pharmaceutical drug, molecule, or compound mentioned
2. disease: The disease, medical condition, or therapeutic indication mentioned
3. jurisdiction: The patent jurisdiction if mentioned (e.g., 'US', 'EU', 'JP'). Default to 'US' if not specified.

CRITICAL RULES:
- Extract ONLY what is explicitly stated in the query
- Do NOT make assumptions or invent information
- If a field is not mentioned, return 'null' for that field (except jurisdiction defaults to 'US')
- Drug names are typically single words or hyphenated (e.g., 'metformin', 'pembrolizumab', 'aspirin')
- Diseases are typically phrases (e.g., 'diabetes', 'lung cancer', 'cardiovascular disease')
- Return a valid JSON object with these exact keys

Example queries and extractions:
- "Can we use metformin for diabetes?" -> {{"drug": "metformin", "disease": "diabetes", "jurisdiction": "US"}}
- "FTO for aspirin in pain management" -> {{"drug": "aspirin", "disease": "pain", "jurisdiction": "US"}}
- "Patent risk for atorvastatin treating cholesterol" -> {{"drug": "atorvastatin", "disease": "cholesterol", "jurisdiction": "US"}}

User Query: {user_prompt}

Return ONLY a JSON object, nothing else:"""

    try:
        raw = llm.call(messages=[{"role": "user", "content": prompt}])
    except Exception as e:
        try:
            # Alternative: try direct string call
            raw = llm.call(prompt)
        except Exception as e2:
            print(f"[PATENT] LLM call failed: {e2}")
            return None, None, None

    if not isinstance(raw, str):
        raw = str(raw)

    # Try to find and parse JSON from response
    start = raw.find("{")
    end = raw.rfind("}")
    if start == -1 or end == -1 or end < start:
        print(f"[PATENT] No JSON found in LLM response: {raw}")
        return None, None, None

    try:
        data = json.loads(raw[start : end + 1])
    except Exception as e:
        print(f"[PATENT] Failed to parse JSON from LLM: {e}")
        return None, None, None

    # Helper to normalize null/empty strings
    def clean_val(val, default=None):
        if val is None or (isinstance(val, str) and val.lower() in ("null", "none", "")):
            return default
        return val

    drug = clean_val(data.get("drug"))
    disease = clean_val(data.get("disease"))
    jurisdiction = clean_val(data.get("jurisdiction"), default="US")

    print(f"[PATENT] LLM extracted: drug={drug}, disease={disease}, jurisdiction={jurisdiction}")

    return drug, disease, jurisdiction


# ============================================================================
# MAIN AGENT FUNCTION (MATCHES CLINICAL AGENT PATTERN)
# ============================================================================


def run_patent_agent(
    user_prompt: str,
    *,
    drug: Optional[str] = None,
    disease: Optional[str] = None,
    jurisdiction: Optional[str] = None,
    max_patents: int = 10,
) -> Dict[str, Any]:
    """
    Run the patent FTO agent.
    
    Uses LLM-based prompt extraction followed by a strict tool pipeline:
    discover_patents → verify_patent_blocking (×N) → fto_decision_engine
    
    Args:
        user_prompt: Natural language query from user
        drug: Override extracted drug name
        disease: Override extracted disease/indication
        jurisdiction: Override extracted jurisdiction (default: US)
        max_patents: Maximum patents to analyze (default: 10)
    
    Returns:
        Structured response matching clinical_agent output format
    """
    print(f"[PATENT] Starting agent with prompt: {user_prompt}")
    analysis_start = datetime.now()

    # -------------------------------------------------------------------------
    # STEP 1: PARSE INPUT (LLM extraction)
    # -------------------------------------------------------------------------
    llm_drug, llm_disease, llm_jurisdiction = _llm_extract_prompt(user_prompt)

    print(f"[PATENT] LLM extracted: drug={llm_drug}, disease={llm_disease}, jurisdiction={llm_jurisdiction}")

    # Prefer explicit parameters, then LLM extraction
    final_drug = drug or llm_drug
    final_disease = disease or llm_disease
    final_jurisdiction = jurisdiction or llm_jurisdiction or "US"

    # Validation: need both drug and disease for patent analysis
    if not final_drug or not final_disease:
        return {
            "agentType": "PATENT_FTO",
            "status": "error",
            "query": user_prompt,
            "parsedInput": {
                "drug": final_drug,
                "disease": final_disease,
                "jurisdiction": final_jurisdiction,
            },
            "message": "Could not extract both drug name and disease/indication from query. Please specify both.",
            "metadata": {
                "analysisDate": analysis_start.isoformat(),
                "error": "MISSING_PARAMETERS",
            },
        }

    # -------------------------------------------------------------------------
    # STEP 2: TOOL PIPELINE
    # -------------------------------------------------------------------------
    try:
        # Get tool functions (handle CrewAI tool wrappers)
        discover_fn = getattr(discover_patents, "_run", discover_patents)
        verify_fn = getattr(verify_patent_blocking, "_run", verify_patent_blocking)
        fto_fn = getattr(fto_decision_engine, "_run", fto_decision_engine)

        # ----- Tool 1: Discover Patents -----
        print(f"[PATENT] Step 1: Discovering patents for {final_drug} + {final_disease}")
        discovery_result = discover_fn(
            drug=final_drug,
            disease=final_disease,
            limit=max_patents,
        )

        patents = discovery_result.get("patents", [])
        print(f"[PATENT] Found {len(patents)} candidate patents")

        if not patents:
            # No patents found - return CLEAR status
            return _build_response(
                user_prompt=user_prompt,
                parsed_input={
                    "drug": final_drug,
                    "disease": final_disease,
                    "jurisdiction": final_jurisdiction,
                },
                fto_result={
                    "ftoStatus": "CLEAR",
                    "totalScore": 0,
                    "confidence": "LOW",
                    "blockingPatents": [],
                    "nonBlockingPatents": [],
                    "expiredPatents": [],
                    "uncertainPatents": [],
                    "earliestFreedomDate": None,
                    "recommendedActions": ["No patents found in USPTO search. Consider expanding search terms."],
                    "scoringNotes": [],
                    "summary": f"No patents found for {final_drug} in {final_disease}. FTO appears clear but recommend manual verification.",
                    "disclaimer": "This is an automated assessment. Consult qualified patent counsel for legal advice.",
                },
                discovery_result=discovery_result,
                verifications=[],
                analysis_start=analysis_start,
            )

        # ----- Tool 2: Verify Each Patent -----
        print(f"[PATENT] Step 2: Verifying {len(patents)} patents")
        verifications = []

        for i, patent_data in enumerate(patents):
            patent_number = patent_data.get("patentNumber")
            print(f"[PATENT]   [{i+1}/{len(patents)}] Verifying {patent_number}")

            try:
                verification = verify_fn(
                    patent_number=patent_number,
                    drug=final_drug,
                    disease=final_disease,
                    jurisdiction=final_jurisdiction,
                )
                verifications.append(verification)
            except Exception as e:
                print(f"[PATENT]   Error verifying {patent_number}: {e}")
                verifications.append({
                    "patent": patent_number,
                    "error": str(e),
                    "blocksUse": None,
                })

        # ----- Tool 3: FTO Decision Engine -----
        print(f"[PATENT] Step 3: Running FTO decision engine")
        fto_result = fto_fn(
            patent_verifications=verifications,
            drug=final_drug,
            disease=final_disease,
            jurisdiction=final_jurisdiction,
        )

        # ----- Build Response -----
        return _build_response(
            user_prompt=user_prompt,
            parsed_input={
                "drug": final_drug,
                "disease": final_disease,
                "jurisdiction": final_jurisdiction,
            },
            fto_result=fto_result,
            discovery_result=discovery_result,
            verifications=verifications,
            analysis_start=analysis_start,
        )

    except Exception as e:
        print(f"[PATENT] Pipeline error: {e}")
        import traceback
        traceback.print_exc()

        return {
            "agentType": "PATENT_FTO",
            "status": "error",
            "query": user_prompt,
            "parsedInput": {
                "drug": final_drug,
                "disease": final_disease,
                "jurisdiction": final_jurisdiction,
            },
            "message": f"Patent analysis pipeline error: {str(e)}",
            "metadata": {
                "analysisDate": analysis_start.isoformat(),
                "error": "PIPELINE_ERROR",
            },
        }


# ============================================================================
# RESPONSE BUILDER (MATCHES CLINICAL AGENT OUTPUT SHAPE)
# ============================================================================


def _build_response(
    user_prompt: str,
    parsed_input: Dict[str, Any],
    fto_result: Dict[str, Any],
    discovery_result: Dict[str, Any],
    verifications: List[Dict[str, Any]],
    analysis_start: datetime,
) -> Dict[str, Any]:
    """
    Build the final response in the same shape as clinical_agent output.
    
    REFINEMENTS (v2):
    - Removed internal scoring artifacts (rawScore, scoringNotes, totalScore)
    - Added Top 3 Blocking Patents summary
    - Simplified confidence logic (HIGH/MEDIUM/LOW only)
    - All risks normalized to 0-100 integers
    - Added sourceUrl for traceability
    
    Top-level keys:
    - agentType, query, parsedInput, summary, confidence
    - data (structured payload with refined fields)
    - visualizations (from viz_builder)
    - metadata (timestamps, counts, warnings)
    """
    analysis_end = datetime.now()
    duration_ms = int((analysis_end - analysis_start).total_seconds() * 1000)

    # Extract key metrics (refined schema - no rawScore/totalScore)
    fto_risk_index = fto_result.get("ftoRiskIndex", 0)
    fto_risk_band = fto_result.get("ftoRiskBand", "LOW")
    fto_status = fto_result.get("ftoStatus", "UNKNOWN")
    confidence = fto_result.get("confidence", "LOW")
    blocking_patents = fto_result.get("blockingPatents", [])
    non_blocking_patents = fto_result.get("nonBlockingPatents", [])
    expired_patents = fto_result.get("expiredPatents", [])
    uncertain_patents = fto_result.get("uncertainPatents", [])
    earliest_freedom_date = fto_result.get("earliestFreedomDate")
    recommended_actions = fto_result.get("recommendedActions", [])
    summary_obj = fto_result.get("summary", {})
    viz_payload = fto_result.get("visualizationPayload", {})

    # Build human-readable summary (use executive summary if available)
    if isinstance(summary_obj, dict):
        summary = summary_obj.get("executive", _build_summary(
            drug=parsed_input["drug"],
            disease=parsed_input["disease"],
            fto_status=fto_status,
            num_blocking=len(blocking_patents),
            earliest_freedom_date=earliest_freedom_date,
        ))
    else:
        summary = str(summary_obj) if summary_obj else _build_summary(
            drug=parsed_input["drug"],
            disease=parsed_input["disease"],
            fto_status=fto_status,
            num_blocking=len(blocking_patents),
            earliest_freedom_date=earliest_freedom_date,
        )

    # Build Top 3 Blocking Patents summary
    top_3_blocking = _build_top_3_blocking_summary(blocking_patents)

    # Build payload for visualizations
    payload = {
        "input": parsed_input,
        "discovery": discovery_result,
        "verifications": verifications,
        "fto": fto_result,
    }

    # Count warnings
    warnings = []
    if uncertain_patents:
        warnings.append(f"{len(uncertain_patents)} patent(s) could not be fully verified")
    if any(p.get("hasContinuations") for p in blocking_patents):
        warnings.append("Some blocking patents have continuations that may extend protection")
    if fto_risk_band == "CRITICAL":
        warnings.append("CRITICAL risk level - immediate legal consultation recommended")

    return {
        "agentType": "PATENT_FTO",
        "status": "success",
        "query": user_prompt,
        "parsedInput": parsed_input,
        "summary": summary,
        "confidence": confidence,
        "data": {
            # Core decision fields (no internal scores)
            "ftoRiskIndex": fto_risk_index,
            "ftoRiskBand": fto_risk_band,
            "ftoStatus": fto_status,
            
            # Patent lists (formatted for display with normalizedRisk, riskBand, sourceUrl)
            "blockingPatents": blocking_patents,
            "nonBlockingPatents": non_blocking_patents,
            "expiredPatents": expired_patents,
            "uncertainPatents": uncertain_patents,
            
            # Top 3 Blocking Patents summary (NEW)
            "top3BlockingPatents": top_3_blocking,
            
            # Decision data
            "earliestFreedomDate": earliest_freedom_date,
            "recommendedActions": recommended_actions,
            
            # Multi-layer summaries
            "summaryLayers": summary_obj if isinstance(summary_obj, dict) else {
                "executive": summary,
                "business": summary,
                "legal": "Consult qualified patent counsel for detailed legal analysis."
            },
            
            # Visualization payload (for frontend charts)
            "visualizationPayload": viz_payload,
            
            # Continuation warnings (kept for legal review)
            "continuationWarnings": fto_result.get("continuationWarnings", []),
            
            # Metadata
            "disclaimer": fto_result.get("disclaimer", "This is an automated assessment. Consult qualified patent counsel for legal advice."),
        },
        "visualizations": build_patent_visualizations(payload),
        "metadata": {
            "analysisDate": analysis_start.isoformat(),
            "completedAt": analysis_end.isoformat(),
            "durationMs": duration_ms,
            "jurisdiction": parsed_input["jurisdiction"],
            "patentsDiscovered": len(discovery_result.get("patents", [])),
            "patentsVerified": len(verifications),
            "patentsBlocking": len(blocking_patents),
            "patentsNonBlocking": len(non_blocking_patents),
            "patentsExpired": len(expired_patents),
            "patentsUncertain": len(uncertain_patents),
            "ftoRiskIndex": fto_risk_index,
            "ftoRiskBand": fto_risk_band,
            "warnings": warnings,
        },
    }


def _build_top_3_blocking_summary(blocking_patents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Build Top 3 Blocking Patents summary for executive review.
    
    Sorted by normalizedRisk (descending) to highlight highest-risk patents.
    
    Returns list of simplified patent objects:
        [
            {
                "patent": "US12345678B2",
                "claimType": "Composition",
                "normalizedRisk": 85,
                "riskBand": "CRITICAL",
                "reason": "Composition claim covers API; blocks core use.",
                "sourceUrl": "https://patents.google.com/patent/US12345678B2"
            }
        ]
    """
    if not blocking_patents:
        return []
    
    # Sort by normalizedRisk descending
    sorted_patents = sorted(
        blocking_patents,
        key=lambda p: p.get("normalizedRisk", 0),
        reverse=True
    )
    
    # Take top 3
    top_3 = sorted_patents[:3]
    
    # Return simplified summary
    return [
        {
            "patent": p.get("patent", "Unknown"),
            "claimType": p.get("claimType", "Unknown"),
            "normalizedRisk": p.get("normalizedRisk", 0),
            "riskBand": p.get("riskBand", "HIGH"),
            "reason": p.get("reason", "Blocks intended use"),
            "sourceUrl": p.get("sourceUrl", ""),
        }
        for p in top_3
    ]


def _build_summary(
    drug: str,
    disease: str,
    fto_status: str,
    num_blocking: int,
    earliest_freedom_date: Optional[str],
) -> str:
    """Build a human-readable summary of the FTO analysis."""
    
    status_descriptions = {
        "CLEAR": f"No blocking patents identified for {drug} in {disease}. Freedom to operate appears clear.",
        "LOW_RISK": f"Minor patent risks identified for {drug} in {disease}. Proceed with caution and monitor patent landscape.",
        "MODERATE_RISK": f"Moderate patent risks for {drug} in {disease}. {num_blocking} blocking patent(s) identified. Recommend consulting patent counsel.",
        "HIGH_RISK": f"High patent risk for {drug} in {disease}. {num_blocking} blocking patent(s) create significant barriers. Licensing likely required.",
    }
    
    summary = status_descriptions.get(fto_status, f"Patent analysis completed for {drug} in {disease}.")
    
    if earliest_freedom_date and fto_status in ("MODERATE_RISK", "HIGH_RISK"):
        summary += f" Earliest potential freedom date: {earliest_freedom_date}."
    
    return summary


# ============================================================================
# EXPORTS
# ============================================================================

__all__ = ["patent_agent", "run_patent_agent"]
