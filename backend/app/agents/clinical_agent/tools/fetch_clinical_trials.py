from crewai.tools import tool
from app.apis.clinical_trials_api import ClinicalTrialsGovClient


@tool("fetch_clinical_trials")
def fetch_clinical_trials(
    drug_name: str, condition: str = None, indication: str = None, phase: str = None
) -> dict:
    """
    Fetches clinical trial data from ClinicalTrials.gov v2 API for a specific drug or condition.

    Args:
        drug_name: Name of the drug or intervention (required)
        condition: Medical condition being studied (optional)
        indication: Specific indication focus (optional, e.g., "AUD", "general") - currently unused
        phase: Trial phase filter (optional: "Phase 1", "Phase 2", "Phase 3", "Phase 4")

    Returns:
        Dictionary with normalized trials, phase distribution, and aggregates for analysis
    """
    try:
        client = ClinicalTrialsGovClient()

        # Search trials with provided filters
        result = client.search_trials(
            drug_name=drug_name,
            condition=condition,
            phase=phase,
            page_size=200,
            max_records=300,
        )

        if not result["trials"]:
            return {
                "drug_name": drug_name,
                "condition": condition,
                "phase_filter": phase,
                "error": f"No clinical trials found for {drug_name}",
                "data_source": "ClinicalTrials.gov v2 API",
                "trials": [],
                "phase_distribution": {},
            }

        # Extract phase distribution in format expected by analyze_trial_phases
        phase_dist = {}
        for item in result["aggregates"]["phase_distribution"]:
            # Convert API phase names (PHASE1, PHASE2, etc.) to readable format
            phase_name = item["name"]
            if phase_name == "NA":
                phase_name = "Not Applicable"
            elif phase_name.startswith("PHASE"):
                phase_num = phase_name.replace("PHASE", "")
                phase_name = f"Phase {phase_num}"

            phase_dist[phase_name] = item["count"]

        # Prepare trial list with key fields for display
        trials_list = []
        for trial in result["trials"][:50]:  # Limit to first 50 for readability
            trials_list.append(
                {
                    "nct_id": trial.get("nct_id"),
                    "title": trial.get("brief_title"),
                    "status": trial.get("overall_status"),
                    "phase": trial.get("phase"),
                    "sponsor": trial.get("sponsors", {}).get("lead", {}).get("name"),
                    "enrollment": trial.get("enrollment", {}).get("count"),
                    "locations_count": len(trial.get("locations", [])),
                }
            )

        return {
            "drug_name": drug_name,
            "condition": condition,
            "phase_filter": phase,
            "total_trials": result["total_returned"],
            "trials": trials_list,
            "phase_distribution": phase_dist,
            "status_distribution": {
                item["name"]: item["count"]
                for item in result["aggregates"]["status_distribution"]
            },
            "top_sponsors": [
                {"name": item["name"], "count": item["count"]}
                for item in result["aggregates"]["sponsor_counts"][:5]
            ],
            "enrollment_summary": result["aggregates"]["enrollment"],
            "data_source": "ClinicalTrials.gov v2 API (Live)",
        }
    except ValueError as e:
        return {
            "error": str(e),
            "drug_name": drug_name,
            "data_source": "ClinicalTrials.gov v2 API",
        }
    except Exception as e:
        return {
            "error": f"Failed to fetch clinical trials: {str(e)}",
            "drug_name": drug_name,
            "data_source": "ClinicalTrials.gov v2 API",
        }
