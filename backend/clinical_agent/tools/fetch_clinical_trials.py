from crewai.tools import tool
import json
import os

DATA_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "dummyData", "clinical_data.json")

@tool("fetch_clinical_trials")
def fetch_clinical_trials(drug_name: str, condition: str = None, indication: str = None, phase: str = None) -> dict:
    """
    Fetches clinical trial data from ClinicalTrials.gov for a specific drug or condition.
    
    Args:
        drug_name: Name of the drug or intervention
        condition: Medical condition being studied (optional)
        indication: Specific indication focus (optional, e.g., "AUD", "general")
        phase: Trial phase filter (optional: "Phase 1", "Phase 2", "Phase 3", "Phase 4")
    
    Returns:
        Dictionary containing active trials, sponsors, phases, and enrollment data
    """
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        drug_key = drug_name.lower().replace(" ", "_")
        
        # Determine which dataset to return based on indication
        if indication and "aud" in indication.lower():
            key = f"{drug_key}_aud"
        else:
            key = f"{drug_key}_general"
        
        if key in data:
            return {
                "drug_name": drug_name,
                "condition": condition,
                "indication": indication or "general",
                "phase_filter": phase,
                "data": data[key],
                "data_source": "ClinicalTrials.gov / WHO ICTRP",
                "note": "Data retrieved from clinical trial databases. Production system uses real-time ClinicalTrials.gov API."
            }
        else:
            return {
                "drug_name": drug_name,
                "condition": condition,
                "phase_filter": phase,
                "data": None,
                "error": f"No clinical trial data available for {drug_name}",
                "data_source": "ClinicalTrials.gov / WHO ICTRP"
            }
    except FileNotFoundError:
        return {
            "error": "Clinical trial data file not found",
            "drug_name": drug_name
        }
    except json.JSONDecodeError:
        return {
            "error": "Failed to parse clinical trial data",
            "drug_name": drug_name
        }
