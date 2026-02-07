from crewai.tools import tool
import json
import os
from typing import Dict, List, Any

DATA_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "dummyData", "exim_data.json")

@tool("analyze_trade_volumes")
def analyze_trade_volumes(drug_name: str) -> Dict[str, Any]:
    """
    Analyzes and generates trade volume charts for APIs/formulations across countries.
    
    Args:
        drug_name: Name of the drug or API (e.g., "metformin_cancer")
    
    Returns:
        Dictionary containing:
        - trade volume data with QoQ growth
        - chart-ready data structure
        - top trading countries
        - market trends
    """
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        drug_key = drug_name.lower().replace(" ", "_")
        
        if drug_key not in data:
            return {
                "status": "error",
                "message": f"No trade volume data available for {drug_name}"
            }
        
        drug_data = data[drug_key]
        trade_volume_info = drug_data.get("trade_volume", {})
        
        if not trade_volume_info or "data" not in trade_volume_info:
            return {
                "status": "error",
                "message": f"No trade volume data structure for {drug_name}"
            }
        
        trade_data = trade_volume_info.get("data", [])
        
        # Calculate summary statistics
        total_q3_volume = sum(item.get("q3_2024", 0) for item in trade_data)
        total_q2_volume = sum(item.get("q2_2024", 0) for item in trade_data)
        
        # Extract growth rates
        growth_rates = []
        for item in trade_data:
            growth_str = item.get("qoq_growth", "0%").replace("%", "").replace("+", "")
            try:
                growth_rates.append(float(growth_str))
            except ValueError:
                pass
        
        avg_growth = sum(growth_rates) / len(growth_rates) if growth_rates else 0
        
        # Rank countries by volume
        sorted_countries = sorted(trade_data, key=lambda x: x.get("q3_2024", 0), reverse=True)
        
        return {
            "status": "success",
            "drug_name": drug_name,
            "title": trade_volume_info.get("title", "API Trade Volume Analysis"),
            "chart_data": {
                "countries": [item["country"] for item in trade_data],
                "q2_2024": [item.get("q2_2024", 0) for item in trade_data],
                "q3_2024": [item.get("q3_2024", 0) for item in trade_data],
                "qoq_growth": [item.get("qoq_growth", "0%") for item in trade_data]
            },
            "summary": {
                "total_q3_volume": total_q3_volume,
                "total_q2_volume": total_q2_volume,
                "volume_growth": f"+{((total_q3_volume - total_q2_volume) / total_q2_volume * 100):.1f}%" if total_q2_volume > 0 else "N/A",
                "average_qoq_growth": f"{avg_growth:.1f}%",
                "top_supplier_country": sorted_countries[0]["country"] if sorted_countries else "N/A",
                "top_supplier_volume": sorted_countries[0].get("q3_2024", 0) if sorted_countries else 0
            },
            "raw_data": trade_data
        }
    
    except FileNotFoundError:
        return {
            "status": "error",
            "message": "EXIM data file not found"
        }
    except json.JSONDecodeError:
        return {
            "status": "error",
            "message": "Error decoding EXIM data file"
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Unexpected error: {str(e)}"
        }
