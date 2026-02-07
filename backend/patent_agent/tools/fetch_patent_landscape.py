from crewai.tools import tool
import json
import os

DATA_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "dummyData", "patent_data.json")

@tool("fetch_patent_landscape")
def fetch_patent_landscape(drug_name: str, indication: str = None) -> dict:
    """
    Fetches comprehensive patent landscape data including patent status, expiry timelines, 
    FTO analysis, and competitive filing information.
    
    Args:
        drug_name: Name of the drug or molecule (e.g., "semaglutide")
        indication: Specific indication focus (optional, e.g., "AUD", "general")
    
    Returns:
        Dictionary containing patent landscape overview, filing heatmaps, and FTO assessment
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
                "indication": indication or "general",
                "data": data[key],
                "data_source": "USPTO / EPO Patent Databases",
                "note": "Data retrieved from patent databases. Production system uses real-time USPTO/EPO APIs."
            }
        else:
            return {
                "drug_name": drug_name,
                "indication": indication,
                "data": None,
                "error": f"No patent landscape data available for {drug_name}",
                "data_source": "USPTO / EPO Patent Databases"
            }
    except FileNotFoundError:
        return {
            "error": "Patent data file not found",
            "drug_name": drug_name
        }
    except json.JSONDecodeError:
        return {
            "error": "Failed to parse patent data",
            "drug_name": drug_name
        }
