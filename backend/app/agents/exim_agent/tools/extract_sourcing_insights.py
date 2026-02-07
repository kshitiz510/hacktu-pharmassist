from crewai.tools import tool
import json
from pathlib import Path
from typing import Dict, List, Any
from collections import Counter

from app.core.config import DATA_DIR

DATA_FILE = Path(DATA_DIR) / "exim_data.json"


@tool("extract_sourcing_insights")
def extract_sourcing_insights(drug_name: str) -> Dict[str, Any]:
    """
    Extracts sourcing insights from EXIM data including supplier concentration,
    supply chain diversity, and sourcing patterns.

    Args:
        drug_name: Name of the drug or API (e.g., "metformin_cancer")

    Returns:
        Dictionary containing:
        - primary suppliers
        - supply chain concentration analysis
        - geographic diversification
        - sourcing recommendations
    """
    try:
        with DATA_FILE.open("r", encoding="utf-8") as f:
            data = json.load(f)

        drug_key = drug_name.lower().replace(" ", "_")

        if drug_key not in data:
            return {
                "status": "error",
                "message": f"No sourcing data available for {drug_name}",
            }

        drug_data = data[drug_key]
        trade_volume_info = drug_data.get("trade_volume", {})

        if not trade_volume_info or "data" not in trade_volume_info:
            return {
                "status": "error",
                "message": f"No trade volume data for sourcing analysis",
            }

        trade_data = trade_volume_info.get("data", [])

        # Extract supplier data
        suppliers = []
        for item in trade_data:
            suppliers.append(
                {
                    "country": item["country"],
                    "volume_q3_2024": item.get("q3_2024", 0),
                    "volume_q2_2024": item.get("q2_2024", 0),
                    "growth": item.get("qoq_growth", "0%"),
                }
            )

        # Calculate supply concentration
        total_volume = sum(s["volume_q3_2024"] for s in suppliers)
        supplier_share = []
        for supplier in suppliers:
            share = (
                (supplier["volume_q3_2024"] / total_volume * 100)
                if total_volume > 0
                else 0
            )
            supplier_share.append(
                {
                    "country": supplier["country"],
                    "market_share_percent": round(share, 1),
                    "volume": supplier["volume_q3_2024"],
                }
            )

        # Sort by market share
        supplier_share_sorted = sorted(
            supplier_share, key=lambda x: x["market_share_percent"], reverse=True
        )

        # Herfindahl index (supply concentration: 0=diverse, 10000=monopoly)
        hhi_index = sum((s["market_share_percent"] ** 2) for s in supplier_share)

        # Determine concentration level
        if hhi_index > 5000:
            concentration_level = "HIGH RISK - Concentrated supply chain"
        elif hhi_index > 2500:
            concentration_level = "MEDIUM RISK - Moderate concentration"
        else:
            concentration_level = "LOW RISK - Diversified supply chain"

        # Geographic analysis
        regions = {
            "Asia": ["India", "China", "Thailand", "Vietnam"],
            "Europe": ["Germany", "UK", "France", "Belgium", "Netherlands"],
            "Americas": ["USA", "Mexico", "Brazil", "Canada"],
            "Others": [],
        }

        regional_breakdown = {}
        for region, countries in regions.items():
            if region != "Others":
                volume = sum(
                    s["volume_q3_2024"]
                    for s in suppliers
                    if any(c in s["country"] for c in countries)
                )
                if volume > 0:
                    regional_breakdown[region] = {
                        "volume": volume,
                        "share_percent": round((volume / total_volume * 100), 1)
                        if total_volume > 0
                        else 0,
                        "countries": [
                            s["country"]
                            for s in suppliers
                            if any(c in s["country"] for c in countries)
                        ],
                    }

        # Sourcing recommendations
        recommendations = []

        if hhi_index > 5000:
            recommendations.append(
                "CRITICAL: Diversify supplier base to reduce supply chain risk"
            )

        top_supplier_share = (
            supplier_share_sorted[0]["market_share_percent"]
            if supplier_share_sorted
            else 0
        )
        if top_supplier_share > 50:
            recommendations.append(
                f"Explore alternative suppliers - Top supplier has {top_supplier_share}% market share"
            )

        if len(suppliers) == 1:
            recommendations.append(
                "Single-source dependency - Establish backup suppliers"
            )

        # Identify fastest growing suppliers
        growth_data = []
        for supplier in suppliers:
            growth_str = supplier["growth"].replace("%", "").replace("+", "")
            try:
                growth_val = float(growth_str) if growth_str != "∞" else 100
                growth_data.append((supplier["country"], growth_val))
            except ValueError:
                pass

        if growth_data:
            fastest_growing = max(growth_data, key=lambda x: x[1])
            recommendations.append(
                f"Fastest growing market: {fastest_growing[0]} ({fastest_growing[1]:.1f}% QoQ growth)"
            )

        return {
            "status": "success",
            "drug_name": drug_name,
            "suppliers": supplier_share_sorted,
            "total_suppliers": len(suppliers),
            "supply_concentration": {
                "hhi_index": round(hhi_index, 1),
                "level": concentration_level,
                "description": "HHI index measures market concentration (0=perfect competition, 10000=monopoly)",
            },
            "regional_breakdown": regional_breakdown,
            "top_3_suppliers": supplier_share_sorted[:3],
            "sourcing_recommendations": recommendations,
        }

    except FileNotFoundError:
        return {"status": "error", "message": "EXIM data file not found"}
    except json.JSONDecodeError:
        return {"status": "error", "message": "Error decoding EXIM data file"}
    except Exception as e:
        return {"status": "error", "message": f"Unexpected error: {str(e)}"}
