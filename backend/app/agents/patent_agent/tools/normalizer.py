"""
FTO Score Normalizer

Translates raw FTO scores into a stable 0-100 FTO Risk Index with risk bands.

SCORING NORMALIZATION:
- Raw scores vary based on number of patents analyzed
- Normalized index provides consistent 0-100 scale for UI/comparisons
- Risk bands give clear human-readable risk levels

ALGORITHM:
- perPatentCap = 12 (matches fto_decision_engine per-patent cap)
- max_possible_raw = perPatentCap * max(1, num_patents)
- ftoIndex = round(min(raw_total / max_possible_raw * 100, 100))

BAND MAPPING:
- 0-20:   LOW       - Minor or no blocking concerns
- 21-40:  MODERATE  - Some blocking patents, counsel recommended
- 41-70:  HIGH      - Significant blocking, licensing likely needed
- 71-100: CRITICAL  - Multiple severe blockers, licensing required
"""

from typing import Dict, Any

# Per-patent score cap (matches fto_decision_engine)
PER_PATENT_CAP = 12

# Risk band thresholds
RISK_BANDS = {
    "LOW": (0, 20),
    "MODERATE": (21, 40),
    "HIGH": (41, 70),
    "CRITICAL": (71, 100),
}


def normalize_raw_score(raw_total: float, num_patents: int) -> Dict[str, Any]:
    """
    Normalize raw FTO score to a 0-100 index with risk band.
    
    Args:
        raw_total: Raw score sum from fto_decision_engine
        num_patents: Number of patents analyzed
    
    Returns:
        {
            "ftoIndex": int (0-100),
            "band": str ("LOW", "MODERATE", "HIGH", "CRITICAL"),
            "details": {
                "rawScore": float,
                "numPatents": int,
                "maxPossibleRaw": float,
                "perPatentCap": int,
                "formula": str
            }
        }
    
    Edge Cases:
        - num_patents == 0: returns ftoIndex=0, band="LOW"
        - raw_total == 0: returns ftoIndex=0, band="LOW"
    """
    # Edge case: no patents
    if num_patents <= 0 or raw_total <= 0:
        return {
            "ftoIndex": 0,
            "band": "LOW",
            "details": {
                "rawScore": raw_total,
                "numPatents": num_patents,
                "maxPossibleRaw": 0,
                "perPatentCap": PER_PATENT_CAP,
                "formula": "No patents analyzed - default LOW risk"
            }
        }
    
    # Calculate max possible raw score
    max_possible_raw = PER_PATENT_CAP * max(1, num_patents)
    
    # Normalize to 0-100 scale
    fto_index = round(min((raw_total / max_possible_raw) * 100, 100))
    
    # Determine risk band
    band = _determine_band(fto_index)
    
    return {
        "ftoIndex": fto_index,
        "band": band,
        "details": {
            "rawScore": raw_total,
            "numPatents": num_patents,
            "maxPossibleRaw": max_possible_raw,
            "perPatentCap": PER_PATENT_CAP,
            "formula": f"round(min({raw_total}/{max_possible_raw}*100, 100)) = {fto_index}"
        }
    }


def _determine_band(fto_index: int) -> str:
    """Map FTO index to risk band."""
    for band_name, (low, high) in RISK_BANDS.items():
        if low <= fto_index <= high:
            return band_name
    return "CRITICAL"  # Default for anything >= 71


def get_band_description(band: str) -> str:
    """Get human-readable description for a risk band."""
    descriptions = {
        "LOW": "Minor or no blocking patent concerns identified. Proceed with standard IP monitoring.",
        "MODERATE": "Some blocking patents present. Recommend detailed FTO opinion from patent counsel.",
        "HIGH": "Significant blocking patents identified. Licensing negotiations likely required.",
        "CRITICAL": "Multiple severe blocking patents. Licensing required before proceeding.",
    }
    return descriptions.get(band, "Unknown risk level")


def get_band_color(band: str) -> str:
    """Get UI color for risk band (for visualization)."""
    colors = {
        "LOW": "#22c55e",      # Green
        "MODERATE": "#f59e0b", # Amber
        "HIGH": "#f97316",     # Orange
        "CRITICAL": "#ef4444", # Red
    }
    return colors.get(band, "#6b7280")  # Gray default


__all__ = [
    "normalize_raw_score",
    "get_band_description",
    "get_band_color",
    "PER_PATENT_CAP",
    "RISK_BANDS",
]
