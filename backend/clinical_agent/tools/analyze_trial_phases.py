from crewai.tools import tool

@tool("analyze_trial_phases")
def analyze_trial_phases(trials_data: dict) -> dict:
    """
    Analyzes clinical trial phase distribution and provides pipeline maturity insights.
    
    Args:
        trials_data: Dictionary containing clinical trials information with phase data
    
    Returns:
        Dictionary containing phase analysis, success probabilities, and pipeline insights
    """
    # Standard FDA approval success rates by phase (industry averages)
    success_rates = {
        "Phase 1": 0.63,
        "Phase 2": 0.31,
        "Phase 3": 0.58,
        "Phase 4": 0.95
    }
    
    if not isinstance(trials_data, dict) or "phase_distribution" not in trials_data:
        return {
            "error": "Invalid input format",
            "note": "Expected dictionary with 'phase_distribution' key"
        }
    
    phase_dist = trials_data.get("phase_distribution", {})
    total_trials = sum(phase_dist.values())
    
    if total_trials == 0:
        return {
            "error": "No trials found in the data",
            "note": "Phase distribution is empty"
        }
    
    # Calculate weighted pipeline maturity score
    phase_weights = {"Phase 1": 0.25, "Phase 2": 0.50, "Phase 3": 0.75, "Phase 4": 1.0}
    maturity_score = 0
    
    for phase, count in phase_dist.items():
        if phase in phase_weights:
            maturity_score += (count / total_trials) * phase_weights[phase]
    
    # Determine pipeline maturity level
    if maturity_score < 0.35:
        maturity_level = "Early Stage (High Risk)"
    elif maturity_score < 0.60:
        maturity_level = "Mid Stage (Moderate Risk)"
    else:
        maturity_level = "Late Stage (Lower Risk)"
    
    return {
        "total_trials": total_trials,
        "phase_distribution": phase_dist,
        "phase_percentages": {
            phase: round((count / total_trials) * 100, 1)
            for phase, count in phase_dist.items()
        },
        "maturity_score": round(maturity_score, 2),
        "maturity_level": maturity_level,
        "success_probability_by_phase": success_rates,
        "interpretation": f"Pipeline shows {maturity_level.lower()} with {total_trials} total trials. " +
                         f"Maturity score: {round(maturity_score * 100, 0)}%",
        "note": "Success rates are industry averages and may vary by therapeutic area"
    }
