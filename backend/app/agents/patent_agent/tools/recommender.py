"""
FTO Recommendation Engine

Generates actionable, feasibility-rated recommendations based on FTO analysis.

RECOMMENDATION RULES:
- Composition blocking → License (HIGH), Design-around (LOW)
- Method near expiry (<5y) → Wait/Monitor (HIGH), File improvements (MEDIUM)
- Multiple uncertain → Manual review (HIGH)
- HIGH/CRITICAL band → Always add "Engage patent counsel immediately"
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional


# ============================================================================
# RECOMMENDATION TEMPLATES
# ============================================================================

RECOMMENDATION_TEMPLATES = {
    "license": {
        "action": "License",
        "rationale_template": "Composition claims block API; licensing provides fastest path to market",
        "feasibility": "HIGH",
        "nextSteps": [
            "Contact patent counsel to assess licensing options",
            "Prepare Letter of Intent (LOI) for patent holder",
            "Conduct financial analysis of licensing costs vs. delay costs",
            "Identify key contact at assignee company"
        ],
    },
    "design_around": {
        "action": "Design-Around",
        "rationale_template": "Modify formulation or delivery to avoid claim coverage",
        "feasibility": "LOW",
        "nextSteps": [
            "Consult R&D on alternative formulation strategies",
            "Commission freedom-to-operate opinion for proposed modifications",
            "Evaluate regulatory implications of formulation changes",
            "Assess timeline and cost impact"
        ],
    },
    "wait_monitor": {
        "action": "Wait / Monitor",
        "rationale_template": "Blocking patents expire within {years} years; delay may be cost-effective",
        "feasibility": "HIGH",
        "nextSteps": [
            "Monitor patent status and any continuation filings",
            "Track competitor activity for same indication",
            "Prepare launch plan for post-expiry date",
            "Consider Paragraph IV filing if generics pathway applies"
        ],
    },
    "indication_shift": {
        "action": "Indication Shift",
        "rationale_template": "Consider alternative therapeutic indication not covered by method claims",
        "feasibility": "MEDIUM",
        "nextSteps": [
            "Review clinical data for off-label uses",
            "Assess market potential for alternative indications",
            "Consult regulatory affairs on indication change implications",
            "Commission IP search for alternative indication coverage"
        ],
    },
    "file_improvements": {
        "action": "File Improvement Patents",
        "rationale_template": "Secure IP position for formulation or process improvements",
        "feasibility": "MEDIUM",
        "nextSteps": [
            "Identify patentable formulation or delivery improvements",
            "Conduct prior art search for improvement concepts",
            "Prepare provisional patent applications",
            "Develop IP strategy for improvement portfolio"
        ],
    },
    "manual_review": {
        "action": "Manual Review Required",
        "rationale_template": "Multiple patents with uncertain status require expert analysis",
        "feasibility": "HIGH",
        "nextSteps": [
            "Engage patent counsel for detailed claim analysis",
            "Request full patent documents for uncertain patents",
            "Commission formal freedom-to-operate opinion",
            "Prepare claim charts for key patents"
        ],
    },
    "engage_counsel": {
        "action": "Engage Patent Counsel Immediately",
        "rationale_template": "Risk level requires immediate professional legal guidance",
        "feasibility": "HIGH",
        "nextSteps": [
            "Contact IP/patent counsel within 48 hours",
            "Prepare summary of FTO analysis for counsel review",
            "Request preliminary opinion on licensing vs. litigation risk",
            "Schedule follow-up meeting to discuss options"
        ],
    },
    "proceed_clear": {
        "action": "Proceed with Standard Monitoring",
        "rationale_template": "No significant blocking patents identified; maintain IP vigilance",
        "feasibility": "HIGH",
        "nextSteps": [
            "Set up patent monitoring alerts for drug and indication",
            "Review patent landscape quarterly",
            "Document FTO analysis for regulatory files",
            "Monitor competitor patent filings"
        ],
    },
}


# ============================================================================
# MAIN RECOMMENDATION FUNCTION
# ============================================================================


def recommend_actions(
    verifications: List[Dict[str, Any]],
    fto_index: int,
    band: str,
    blocking_patents: List[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    """
    Generate actionable recommendations based on FTO analysis.
    
    Args:
        verifications: All patent verifications from analysis
        fto_index: Normalized FTO risk index (0-100)
        band: Risk band ("LOW", "MODERATE", "HIGH", "CRITICAL")
        blocking_patents: List of blocking patents with details
    
    Returns:
        List of recommendation dicts, each containing:
        - action: Short action name
        - rationale: One-sentence reason tied to patents/claims
        - feasibility: HIGH / MEDIUM / LOW
        - nextSteps: Array of 2-4 practical next steps
    """
    if blocking_patents is None:
        blocking_patents = []
    
    recommendations = []
    
    # Analyze patent characteristics
    composition_blockers = [p for p in blocking_patents if p.get("claimType") == "COMPOSITION"]
    method_blockers = [p for p in blocking_patents if p.get("claimType") == "METHOD_OF_TREATMENT"]
    formulation_blockers = [p for p in blocking_patents if p.get("claimType") == "FORMULATION"]
    
    # Count uncertain patents
    uncertain_count = sum(1 for v in verifications if v.get("blocksUse") is None and not v.get("error"))
    error_count = sum(1 for v in verifications if v.get("error"))
    
    # Find near-expiry blocking patents
    near_expiry_blockers = _get_near_expiry_patents(blocking_patents, years_threshold=5)
    
    # =========================================================================
    # RULE 1: LOW risk band - proceed with monitoring + additional actions
    # =========================================================================
    if band == "LOW":
        recommendations.append(_build_recommendation("proceed_clear"))
        # Don't return early - add more recommendations below
    
    # =========================================================================
    # RULE 2: COMPOSITION blocking patents → License + Design-around
    # =========================================================================
    if composition_blockers:
        # License recommendation (HIGH feasibility)
        license_rec = _build_recommendation("license")
        license_rec["rationale"] = f"{len(composition_blockers)} composition patent(s) cover the API; licensing provides fastest path to market"
        recommendations.append(license_rec)
        
        # Design-around (LOW feasibility for composition claims)
        design_rec = _build_recommendation("design_around")
        design_rec["rationale"] = "Composition claims typically difficult to design around; modification unlikely to avoid coverage"
        design_rec["feasibility"] = "LOW"
        recommendations.append(design_rec)
    
    # =========================================================================
    # RULE 3: METHOD_OF_TREATMENT near expiry → Wait/Monitor + File improvements
    # =========================================================================
    method_near_expiry = [p for p in near_expiry_blockers if p.get("claimType") == "METHOD_OF_TREATMENT"]
    if method_near_expiry:
        years = _min_years_to_expiry(method_near_expiry)
        
        # Wait/Monitor (HIGH feasibility)
        wait_rec = _build_recommendation("wait_monitor")
        wait_rec["rationale"] = f"Method-of-treatment patents expire within {years:.1f} years; waiting may be cost-effective"
        recommendations.append(wait_rec)
        
        # File improvement patents (MEDIUM feasibility)
        improve_rec = _build_recommendation("file_improvements")
        improve_rec["rationale"] = "Secure IP position for formulation improvements before blocking patents expire"
        recommendations.append(improve_rec)
    
    # =========================================================================
    # RULE 4: FORMULATION blockers without composition → Design-around viable
    # =========================================================================
    if formulation_blockers and not composition_blockers:
        design_rec = _build_recommendation("design_around")
        design_rec["rationale"] = "Formulation claims may be designable around with alternative delivery mechanisms"
        design_rec["feasibility"] = "MEDIUM"
        recommendations.append(design_rec)
    
    # =========================================================================
    # RULE 5: Multiple uncertain patents → Manual review required
    # =========================================================================
    if uncertain_count >= 2 or error_count >= 1:
        review_rec = _build_recommendation("manual_review")
        review_rec["rationale"] = f"{uncertain_count} patent(s) with uncertain status and {error_count} analysis error(s) require expert review"
        recommendations.append(review_rec)
    
    # =========================================================================
    # RULE 6: HIGH/CRITICAL band → Always add "Engage patent counsel"
    # =========================================================================
    if band in ("HIGH", "CRITICAL"):
        # Add as first recommendation
        counsel_rec = _build_recommendation("engage_counsel")
        counsel_rec["rationale"] = f"FTO Risk Index {fto_index}/100 ({band}) requires immediate professional legal guidance"
        recommendations.insert(0, counsel_rec)
    
    # =========================================================================
    # RULE 7: Indication shift option for method claims
    # =========================================================================
    if method_blockers and not composition_blockers:
        shift_rec = _build_recommendation("indication_shift")
        shift_rec["rationale"] = "Method-of-treatment claims are indication-specific; alternative indication may avoid coverage"
        recommendations.append(shift_rec)
    
    # Deduplicate by action name
    seen_actions = set()
    unique_recommendations = []
    for rec in recommendations:
        if rec["action"] not in seen_actions:
            seen_actions.add(rec["action"])
            unique_recommendations.append(rec)
    
    # Ensure at least 5 recommendations by adding context-aware fallback actions
    fallback_sequence = [
        ("file_improvements", "Secure competitive advantage by patenting formulation or delivery improvements around existing IP"),
        ("indication_shift", "Explore alternative therapeutic applications that may not be covered by existing claims"),
        ("wait_monitor", "Monitor patent landscape for expiries, abandonments, or invalidation opportunities"),
        ("proceed_clear", "Risk level permits proceeding with development while maintaining IP vigilance"),
        ("manual_review", "Complex patent landscape warrants detailed expert analysis of claim scope and validity"),
        ("design_around", "Evaluate alternative formulations or delivery mechanisms to avoid claim coverage"),
    ]
    
    for template_key, rationale in fallback_sequence:
        if len(unique_recommendations) >= 5:
            break
        
        template = RECOMMENDATION_TEMPLATES.get(template_key, {})
        action_name = template.get("action", "Unknown")
        
        if action_name not in seen_actions:
            rec = _build_recommendation(template_key)
            rec["rationale"] = rationale
            unique_recommendations.append(rec)
            seen_actions.add(action_name)
    
    return unique_recommendations


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================


def _build_recommendation(template_key: str) -> Dict[str, Any]:
    """Build a recommendation dict from a template."""
    template = RECOMMENDATION_TEMPLATES.get(template_key, {})
    return {
        "action": template.get("action", "Unknown Action"),
        "rationale": template.get("rationale_template", ""),
        "feasibility": template.get("feasibility", "MEDIUM"),
        "nextSteps": template.get("nextSteps", [])[:4],  # Max 4 steps
    }


def _get_near_expiry_patents(patents: List[Dict[str, Any]], years_threshold: float = 5) -> List[Dict[str, Any]]:
    """Get patents expiring within threshold years."""
    near_expiry = []
    for p in patents:
        expiry = p.get("expectedExpiry")
        if expiry:
            years = _years_until_expiry(expiry)
            if years is not None and years < years_threshold:
                near_expiry.append(p)
    return near_expiry


def _years_until_expiry(expiry: str) -> Optional[float]:
    """Calculate years until patent expiry."""
    try:
        expiry_dt = datetime.strptime(expiry[:10], "%Y-%m-%d")
        days = (expiry_dt - datetime.now()).days
        return max(0, days / 365.25)
    except:
        return None


def _min_years_to_expiry(patents: List[Dict[str, Any]]) -> float:
    """Get minimum years to expiry among patents."""
    min_years = float("inf")
    for p in patents:
        expiry = p.get("expectedExpiry")
        if expiry:
            years = _years_until_expiry(expiry)
            if years is not None and years < min_years:
                min_years = years
    return min_years if min_years != float("inf") else 0


__all__ = ["recommend_actions"]
