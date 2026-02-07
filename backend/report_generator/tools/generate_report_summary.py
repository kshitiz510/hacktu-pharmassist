from crewai.tools import tool
import json
import os

DATA_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "dummyData", "report_data.json")

@tool("generate_report_summary")
def generate_report_summary(drug_name: str, indication: str = None) -> dict:
    """
    Generates a comprehensive report summary by aggregating insights from all agents.
    
    Args:
        drug_name: Name of the drug or molecule
        indication: Specific indication focus (optional, e.g., "AUD", "general")
    
    Returns:
        Dictionary containing report sections, status, and compilation progress
    """
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        drug_key = drug_name.lower().replace(" ", "_")
        
        # Determine which report template to use
        if indication and "aud" in indication.lower():
            key = f"{drug_key}_aud"
        else:
            key = f"{drug_key}_general"
        
        if key in data:
            return {
                "drug_name": drug_name,
                "indication": indication or "general",
                "report": data[key],
                "data_source": "Report Generator",
                "note": "Report compiled from all agent outputs."
            }
        else:
            return {
                "drug_name": drug_name,
                "indication": indication,
                "report": None,
                "error": f"No report template available for {drug_name}",
                "data_source": "Report Generator"
            }
    except FileNotFoundError:
        return {
            "error": "Report data file not found",
            "drug_name": drug_name
        }
    except json.JSONDecodeError:
        return {
            "error": "Failed to parse report data",
            "drug_name": drug_name
        }
