"""
FTO Output Formatter

Transforms raw patent analysis data into human-friendly, UI-ready output.

RESPONSIBILITIES:
- Humanize field names (snake_case → Title Case)
- Format patent entries for display (normalizedRisk, riskBand, reason)
- Build visualization payload for frontend charts
- Generate multi-layer summary texts (executive, business, legal)

REFINEMENTS (v2):
- Remove internal scoring artifacts (score, confidence, rawScore)
- Normalize all risk values to 0-100 integers
- Add sourceUrl (Google Patents link) for traceability
- Add requiresManualReview flag for uncertain patents
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from .normalizer import get_band_color, get_band_description, PER_PATENT_CAP


# ============================================================================
# FIELD NAME HUMANIZATION
# ============================================================================

SPECIAL_LABELS = {
    "fto": "FTO",
    "ftoStatus": "FTO Status",
    "ftoRiskIndex": "FTO Risk Index",
    "ftoRiskBand": "Risk Band",
    "nct_id": "NCT ID",
    "patent": "Patent Number",
    "blocksUse": "Blocks Use",
    "claimType": "Claim Type",
    "expectedExpiry": "Expected Expiry",
    "hasContinuations": "Has Continuations",
    "riskScore": "Risk Score",
    "api": "API",
    "ip": "IP",
}


def humanize_field_name(internal_name: str) -> str:
    """
    Convert internal field names to human-readable labels.
    
    Examples:
        "expectedExpiry" → "Expected Expiry"
        "blocksUse" → "Blocks Use"
        "claim_type" → "Claim Type"
    """
    if not internal_name:
        return ""
    
    # Check special cases first
    if internal_name in SPECIAL_LABELS:
        return SPECIAL_LABELS[internal_name]
    
    # Convert camelCase to Title Case
    result = ""
    for i, char in enumerate(internal_name):
        if char.isupper() and i > 0:
            result += " "
        result += char
    
    # Also handle snake_case
    result = result.replace("_", " ")
    
    return result.title()


# ============================================================================
# PATENT ENTRY FORMATTING
# ============================================================================

STATUS_LABELS = {
    True: "Blocking",
    False: "Non-blocking",
    None: "Uncertain",
    "EXPIRED": "Expired",
}

CLAIM_TYPE_LABELS = {
    "COMPOSITION": "Composition",
    "METHOD_OF_TREATMENT": "Method of Treatment",
    "FORMULATION": "Formulation",
    "PROCESS": "Process",
    "OTHER": "Other",
}


def format_patent_entry(verification: Dict[str, Any]) -> Dict[str, Any]:
    """
    Format a single patent verification result for display.
    
    Input (verification object from verify_patent_blocking):
        {
            "patent": "US12345678B2",
            "title": "Metformin compositions...",
            "assignee": "Company X",
            "expectedExpiry": "2039-01-31",
            "blocksUse": true,
            "claimType": "COMPOSITION",
            "hasContinuations": true,
            "riskScore": 12  # if scored
        }
    
    Output (display-friendly format - v2 REFINED):
        {
            "patent": "US12345678B2",
            "title": "Metformin compositions...",
            "assignee": "Company X",
            "status": "Blocking",
            "claimType": "Composition",
            "expectedExpiry": "2039-01-31",
            "normalizedRisk": 85,        # NEW: 0-100 scale
            "riskBand": "CRITICAL",      # NEW: LOW/MODERATE/HIGH/CRITICAL
            "reason": "Composition claim covers API; blocks core use.",
            "requiresManualReview": false, # NEW: flags uncertain patents
            "sourceUrl": "https://patents.google.com/patent/US12345678B2"  # NEW
        }
    
    REMOVED from v1: score, confidence (internal artifacts)
    """
    patent_num = verification.get("patent", "Unknown")
    blocks_use = verification.get("blocksUse")
    claim_type = verification.get("claimType", "OTHER")
    has_continuations = verification.get("hasContinuations", False)
    expiry = verification.get("expectedExpiry")
    raw_score = verification.get("riskScore", 0)
    
    # Determine status
    if verification.get("status") == "EXPIRED" or _is_expired(expiry):
        status = "Expired"
    else:
        status = STATUS_LABELS.get(blocks_use, "Uncertain")
    
    # Normalize risk score to 0-100 scale for this patent
    normalized_risk, risk_band = _normalize_patent_risk(raw_score, blocks_use, status)
    
    # Build human-readable reason
    reason = _build_reason(blocks_use, claim_type, has_continuations, expiry, verification.get("error"))
    
    # Flag for manual review
    requires_manual_review = blocks_use is None or status == "Uncertain"
    
    # Build Google Patents source URL
    source_url = _build_source_url(patent_num)
    
    return {
        "patent": patent_num,
        "title": verification.get("title", "Unknown Title"),
        "assignee": verification.get("assignee", "Unknown"),
        "status": status,
        "claimType": CLAIM_TYPE_LABELS.get(claim_type, claim_type),
        "expectedExpiry": _format_date(expiry),
        "normalizedRisk": normalized_risk,  # 0-100 integer
        "riskBand": risk_band,              # LOW/MODERATE/HIGH/CRITICAL
        "reason": reason,
        "requiresManualReview": requires_manual_review,
        "sourceUrl": source_url,
    }


def _normalize_patent_risk(raw_score: float, blocks_use: Optional[bool], status: str) -> tuple:
    """
    Normalize a single patent's risk score to 0-100 scale.
    
    Returns: (normalizedRisk: int, riskBand: str)
    """
    # Expired or non-blocking patents have 0 risk
    if status == "Expired" or blocks_use is False:
        return (0, "LOW")
    
    # Uncertain patents get moderate default
    if blocks_use is None or status == "Uncertain":
        return (35, "MODERATE")
    
    # For blocking patents, normalize raw score (capped at PER_PATENT_CAP)
    if raw_score <= 0:
        return (50, "HIGH")  # Blocking but no score = default HIGH
    
    # Scale: 0-12 raw → 0-100 normalized
    normalized = round(min((raw_score / PER_PATENT_CAP) * 100, 100))
    
    # Determine band
    if normalized <= 20:
        band = "LOW"
    elif normalized <= 40:
        band = "MODERATE"
    elif normalized <= 70:
        band = "HIGH"
    else:
        band = "CRITICAL"
    
    return (normalized, band)


def _build_source_url(patent_num: str) -> str:
    """Build Google Patents URL for patent traceability."""
    if not patent_num or patent_num == "Unknown":
        return ""
    # Clean patent number (remove spaces, ensure valid format)
    clean_num = patent_num.replace(" ", "").upper()
    return f"https://patents.google.com/patent/{clean_num}"


def _is_expired(expiry: Optional[str]) -> bool:
    """Check if patent is expired based on expiry date."""
    if not expiry:
        return False
    try:
        expiry_dt = datetime.strptime(expiry[:10], "%Y-%m-%d")
        return expiry_dt < datetime.now()
    except:
        return False


def _format_date(date_str: Optional[str]) -> str:
    """Format date string for display."""
    if not date_str:
        return "Unknown"
    try:
        return date_str[:10]  # Return YYYY-MM-DD portion
    except:
        return "Unknown"


def _build_reason(
    blocks_use: Optional[bool],
    claim_type: str,
    has_continuations: bool,
    expiry: Optional[str],
    error: Optional[str] = None,
) -> str:
    """Build human-readable reason for patent status with actionable context."""
    if error:
        return f"Analysis error: {error}. Manual review required to assess blocking status."
    
    parts = []
    
    # Claim type explanation with business impact
    claim_explanations = {
        "COMPOSITION": "Composition claim covers the active pharmaceutical ingredient (API) - this is the strongest form of patent protection and typically cannot be designed around",
        "METHOD_OF_TREATMENT": "Method-of-treatment claim covers the therapeutic use for specific indication - may be avoided by targeting different indications",
        "FORMULATION": "Formulation claim covers specific drug delivery or dosage form - alternative formulations may provide design-around opportunities",
        "PROCESS": "Process claim covers manufacturing method - alternative synthesis routes may be viable",
        "OTHER": "Claim scope requires expert analysis to determine impact",
    }
    parts.append(claim_explanations.get(claim_type, "Claim type requires analysis"))
    
    # Blocking status with recommendation hint
    if blocks_use is True:
        parts.append("This patent blocks the intended commercial use")
    elif blocks_use is False:
        parts.append("This patent does not block the intended use based on claim analysis")
    else:
        parts.append("Blocking status could not be determined automatically - manual claim review needed")
    
    # Continuation warning with context
    if has_continuations:
        parts.append("Patent family includes continuations that may extend protection beyond listed expiry")
    
    # Near-expiry note with timeline
    if expiry:
        try:
            years = _years_until_expiry(expiry)
            if years is not None:
                if years < 1:
                    parts.append(f"Expires in less than 1 year - wait strategy highly viable")
                elif years < 3:
                    parts.append(f"Expires in {years:.1f} years - delay strategy may be cost-effective")
                elif years < 5:
                    parts.append(f"Expires in {years:.1f} years - licensing or design-around recommended")
        except:
            pass
    
    return ". ".join(parts) + "."


def _years_until_expiry(expiry: str) -> Optional[float]:
    """Calculate years until patent expiry."""
    try:
        expiry_dt = datetime.strptime(expiry[:10], "%Y-%m-%d")
        days = (expiry_dt - datetime.now()).days
        return max(0, days / 365.25)
    except:
        return None


# ============================================================================
# VISUALIZATION PAYLOAD BUILDER
# ============================================================================


def build_visualization_payload(
    verifications: List[Dict[str, Any]],
    normalized_result: Dict[str, Any],
    blocking_patents: List[Dict[str, Any]],
    non_blocking_patents: List[Dict[str, Any]],
    expired_patents: List[Dict[str, Any]],
    uncertain_patents: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Build structured visualization payload for frontend rendering.
    
    Returns:
        {
            "ftoGauge": { "value": 82, "band": "CRITICAL", "color": "#ef4444" },
            "expiryTimeline": [ { "patent": "US...", "expiryDate": "2039-01-31", "status": "Blocking" } ],
            "counts": { "blocking": 3, "nonBlocking": 2, "expired": 1, "uncertain": 1 },
            "claimTypeDistribution": { "COMPOSITION": 2, "METHOD_OF_TREATMENT": 1 },
            "riskPerPatent": [ { "patent": "US...", "score": 12 } ]
        }
    """
    fto_index = normalized_result.get("ftoIndex", 0)
    band = normalized_result.get("band", "LOW")
    
    # FTO Gauge data
    fto_gauge = {
        "value": fto_index,
        "band": band,
        "color": get_band_color(band),
        "description": get_band_description(band),
    }
    
    # Expiry timeline (all patents with expiry dates)
    expiry_timeline = []
    for v in verifications:
        expiry = v.get("expectedExpiry")
        if expiry:
            status = "Blocking" if v.get("blocksUse") else "Non-blocking"
            if _is_expired(expiry):
                status = "Expired"
            expiry_timeline.append({
                "patent": v.get("patent", "Unknown"),
                "expiryDate": expiry[:10] if expiry else None,
                "status": status,
                "claimType": v.get("claimType", "OTHER"),
            })
    
    # Sort by expiry date
    expiry_timeline.sort(key=lambda x: x.get("expiryDate") or "9999-12-31")
    
    # Counts for pie chart
    counts = {
        "blocking": len(blocking_patents),
        "nonBlocking": len(non_blocking_patents),
        "expired": len(expired_patents),
        "uncertain": len(uncertain_patents),
    }
    
    # Claim type distribution
    claim_type_dist = {}
    for v in verifications:
        ct = v.get("claimType", "OTHER")
        claim_type_dist[ct] = claim_type_dist.get(ct, 0) + 1
    
    # Risk per patent (for blocking patents)
    risk_per_patent = []
    for p in blocking_patents:
        risk_per_patent.append({
            "patent": p.get("patent", "Unknown"),
            "score": p.get("riskScore", p.get("score", 0)),
            "claimType": p.get("claimType", "OTHER"),
        })
    
    return {
        "ftoGauge": fto_gauge,
        "expiryTimeline": expiry_timeline,
        "counts": counts,
        "claimTypeDistribution": claim_type_dist,
        "riskPerPatent": risk_per_patent,
    }


# ============================================================================
# SUMMARY TEXT BUILDERS
# ============================================================================


def build_summary_texts(
    verifications: List[Dict[str, Any]],
    normalized_result: Dict[str, Any],
    drug: str,
    disease: str,
    blocking_patents: List[Dict[str, Any]],
    earliest_freedom_date: Optional[str],
    recommended_actions: List[Dict[str, Any]],
) -> Dict[str, str]:
    """
    Build multi-layer summary texts for different audiences.
    
    Returns:
        {
            "executive": "1-2 sentence C-suite summary",
            "business": "3-6 line business interpretation",
            "legal": "Detailed legal rationale (expandable)"
        }
    """
    fto_index = normalized_result.get("ftoIndex", 0)
    band = normalized_result.get("band", "LOW")
    num_blocking = len(blocking_patents)
    
    # Build executive summary (1-2 sentences)
    executive = _build_executive_summary(
        drug, disease, fto_index, band, num_blocking, earliest_freedom_date
    )
    
    # Build business summary (3-6 lines)
    business = _build_business_summary(
        drug, disease, fto_index, band, blocking_patents, 
        earliest_freedom_date, recommended_actions
    )
    
    # Build legal rationale (expandable)
    legal = _build_legal_rationale(
        drug, disease, blocking_patents, verifications
    )
    
    return {
        "executive": executive,
        "business": business,
        "legal": legal,
    }


def _build_executive_summary(
    drug: str,
    disease: str,
    fto_index: int,
    band: str,
    num_blocking: int,
    earliest_freedom_date: Optional[str],
) -> str:
    """Build 1-2 sentence executive summary."""
    if band == "LOW":
        return f"FTO assessment for {drug} in {disease}: LOW RISK. No significant patent barriers identified. Recommend standard IP monitoring."
    
    elif band == "MODERATE":
        return f"FTO assessment for {drug} in {disease}: MODERATE RISK (Index: {fto_index}/100). {num_blocking} blocking patent(s) require attention. Recommend patent counsel review before proceeding."
    
    elif band == "HIGH":
        freedom_note = f" Earliest freedom date: {earliest_freedom_date}." if earliest_freedom_date else ""
        return f"FTO assessment for {drug} in {disease}: HIGH RISK (Index: {fto_index}/100). {num_blocking} blocking patent(s) create significant barriers.{freedom_note} Licensing negotiations recommended."
    
    else:  # CRITICAL
        freedom_note = f" Earliest freedom date: {earliest_freedom_date}." if earliest_freedom_date else ""
        return f"CRITICAL FTO RISK for {drug} in {disease} (Index: {fto_index}/100). {num_blocking} blocking patent(s) prevent commercialization.{freedom_note} Licensing required before proceeding."


def _build_business_summary(
    drug: str,
    disease: str,
    fto_index: int,
    band: str,
    blocking_patents: List[Dict[str, Any]],
    earliest_freedom_date: Optional[str],
    recommended_actions: List[Dict[str, Any]],
) -> str:
    """Build 3-6 line business interpretation."""
    lines = []
    
    # Opening assessment
    lines.append(f"Freedom-to-Operate assessment for {drug} in {disease} indicates {band} risk (Index: {fto_index}/100).")
    
    if not blocking_patents:
        lines.append("No blocking patents identified in USPTO search.")
        lines.append("Recommended: Proceed with development while maintaining IP monitoring.")
        return " ".join(lines)
    
    # Blocking patent impact
    composition_blockers = [p for p in blocking_patents if p.get("claimType") == "COMPOSITION"]
    method_blockers = [p for p in blocking_patents if p.get("claimType") == "METHOD_OF_TREATMENT"]
    
    if composition_blockers:
        lines.append(f"{len(composition_blockers)} composition patent(s) directly cover the API, making design-around difficult.")
    
    if method_blockers:
        lines.append(f"{len(method_blockers)} method-of-treatment patent(s) cover the therapeutic indication.")
    
    # Timeline impact
    if earliest_freedom_date:
        lines.append(f"All blocking patents expire by {earliest_freedom_date}.")
    
    # Options summary
    if recommended_actions:
        top_actions = recommended_actions[:2]
        action_summary = ", ".join([a.get("action", "") for a in top_actions if a.get("action")])
        if action_summary:
            lines.append(f"Primary options: {action_summary}.")
    
    # Trade-offs
    if band in ("HIGH", "CRITICAL"):
        lines.append("Trade-offs: Licensing provides fastest path to market but increases costs. Waiting for expiry delays launch significantly.")
    
    return " ".join(lines)


def _build_legal_rationale(
    drug: str,
    disease: str,
    blocking_patents: List[Dict[str, Any]],
    verifications: List[Dict[str, Any]],
) -> str:
    """Build detailed legal rationale (expandable section)."""
    lines = []
    
    lines.append(f"FTO Legal Analysis: {drug} for {disease}")
    lines.append("")
    
    if not blocking_patents:
        lines.append("No blocking patents identified. However, recommend:")
        lines.append("• Manual review of related patent families")
        lines.append("• Monitor continuation applications")
        lines.append("• Review international patent landscape")
        return "\n".join(lines)
    
    lines.append("BLOCKING PATENT ANALYSIS:")
    lines.append("")
    
    for i, p in enumerate(blocking_patents[:5], 1):
        patent_num = p.get("patent", "Unknown")
        claim_type = p.get("claimType", "OTHER")
        expiry = p.get("expectedExpiry", "Unknown")
        confidence = p.get("confidence", "LOW")
        
        lines.append(f"{i}. {patent_num}")
        lines.append(f"   • Claim Type: {CLAIM_TYPE_LABELS.get(claim_type, claim_type)}")
        lines.append(f"   • Expected Expiry: {expiry}")
        lines.append(f"   • Analysis Confidence: {confidence}")
        
        if p.get("hasContinuations"):
            lines.append("   • WARNING: Continuation applications may extend protection")
        
        lines.append("")
    
    lines.append("RECOMMENDED FOCUS FOR COUNSEL:")
    lines.append("• Detailed claim charting against proposed product")
    lines.append("• Review prosecution history for claim scope limitations")
    lines.append("• Assess validity challenges (prior art search)")
    lines.append("• Evaluate continuation application status")
    lines.append("")
    lines.append("INFORMATION GAPS:")
    lines.append("• Full claim text not analyzed (automated summary only)")
    lines.append("• Prosecution history estoppel not evaluated")
    lines.append("• Related foreign patents not searched")
    
    return "\n".join(lines)


__all__ = [
    "humanize_field_name",
    "format_patent_entry",
    "build_visualization_payload",
    "build_summary_texts",
]
