from crewai.tools import tool
import json
import os

DATA_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "dummyData", "iqvia_data.json")

@tool("fetch_market_data")
def fetch_market_data(drug_name: str, therapy_area: str = None, indication: str = None, region: str = "Global") -> dict:
    """
    Fetches pharmaceutical market data including market size, sales trends, and competitive landscape.
    
    Args:
        drug_name: Name of the drug or molecule
        therapy_area: Therapeutic area (e.g., "Oncology", "Diabetes", "Cardiovascular")
        indication: Specific indication focus (optional, e.g., "AUD", "general")
        region: Geographic region (default: "Global", options: "US", "EU", "Asia", "Global")
    
    Returns:
        Dictionary containing market size, CAGR, top competitors, and sales trends
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
                "therapy_area": therapy_area,
                "indication": indication or "general",
                "region": region,
                "data": data[key],
                "data_source": "IQVIA Market Intelligence",
                "note": "Data retrieved from IQVIA datasets. Production system uses real-time IQVIA API."
            }
        else:
            return {
                "drug_name": drug_name,
                "therapy_area": therapy_area,
                "region": region,
                "data": None,
                "error": f"No IQVIA data available for {drug_name}",
                "data_source": "IQVIA Market Intelligence"
            }
    except FileNotFoundError:
        return {
            "error": "IQVIA data file not found",
            "drug_name": drug_name
        }
    except json.JSONDecodeError:
        return {
            "error": "Failed to parse IQVIA data",
            "drug_name": drug_name
        }
