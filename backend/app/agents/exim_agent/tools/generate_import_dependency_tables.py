from crewai.tools import tool
import json
from pathlib import Path
from typing import Dict, List, Any

from app.core.config import DATA_DIR

DATA_FILE = Path(DATA_DIR) / "exim_data.json"


@tool("generate_import_dependency_tables")
def generate_import_dependency_tables(drug_name: str) -> Dict[str, Any]:
    """
    Generates import dependency tables showing import concentration,
    risk assessments, and price trend analysis.

    Args:
        drug_name: Name of the drug or API (e.g., "metformin_cancer")

    Returns:
        Dictionary containing:
        - import dependency table (country-wise breakdown)
        - price trend analysis
        - import risk assessment
        - supply chain resilience metrics
    """
    try:
        with DATA_FILE.open("r", encoding="utf-8") as f:
            data = json.load(f)

        drug_key = drug_name.lower().replace(" ", "_")

        if drug_key not in data:
            return {
                "status": "error",
                "message": f"No dependency data available for {drug_name}",
            }

        drug_data = data[drug_key]

        # Extract trade volume data
        trade_volume_info = drug_data.get("trade_volume", {})
        if not trade_volume_info or "data" not in trade_volume_info:
            return {"status": "error", "message": "No trade volume data available"}

        # Extract price trends - handle both field names (price_trends and price_trend)
        price_trends_info = drug_data.get(
            "price_trends", drug_data.get("price_trend", {})
        )
        price_data = price_trends_info.get("data", [])

        # Extract import risks - handle both field names (import_risks and import_dependency)
        import_risks_info = drug_data.get(
            "import_risks", drug_data.get("import_dependency", {})
        )

        # Build import dependency table
        trade_data = trade_volume_info.get("data", [])
        total_volume = sum(item.get("q3_2024", 0) for item in trade_data)

        dependency_table = []
        for item in trade_data:
            volume_q3 = item.get("q3_2024", 0)
            dependency_percent = (
                (volume_q3 / total_volume * 100) if total_volume > 0 else 0
            )

            # Risk classification based on dependency
            if dependency_percent > 50:
                dependency_risk = "CRITICAL"
            elif dependency_percent > 30:
                dependency_risk = "HIGH"
            elif dependency_percent > 15:
                dependency_risk = "MEDIUM"
            else:
                dependency_risk = "LOW"

            dependency_table.append(
                {
                    "country": item["country"],
                    "import_volume_q3_2024": volume_q3,
                    "import_volume_q2_2024": item.get("q2_2024", 0),
                    "dependency_percent": round(dependency_percent, 1),
                    "dependency_risk": dependency_risk,
                    "qoq_growth": item.get("qoq_growth", "0%"),
                    "stability_score": calculate_stability_score(
                        item.get("qoq_growth", "0%")
                    ),
                }
            )

        # Price trend analysis
        price_analysis = {
            "title": price_trends_info.get("title", "Price Trends"),
            "data": price_data,
            "trend": calculate_price_trend(price_data),
        }

        # Calculate price volatility
        if len(price_data) > 1:
            prices = [p["price"] for p in price_data]
            price_change = prices[-1] - prices[0]
            price_change_percent = (
                (price_change / prices[0] * 100) if prices[0] > 0 else 0
            )
            price_volatility = (
                "HIGH"
                if abs(price_change_percent) > 10
                else "MODERATE"
                if abs(price_change_percent) > 5
                else "LOW"
            )
        else:
            price_volatility = "INSUFFICIENT DATA"

        # Supply chain resilience metrics
        resilience_score = calculate_resilience_score(len(trade_data), dependency_table)

        # Calculate concentration index for imports
        concentration_index = sum(
            (item["dependency_percent"] ** 2) for item in dependency_table
        )

        return {
            "status": "success",
            "drug_name": drug_name,
            "import_dependency_table": dependency_table,
            "price_analysis": {**price_analysis, "volatility_level": price_volatility},
            "import_risk_assessment": {
                "title": import_risks_info.get("title", "Import Risk Assessment"),
                "details": import_risks_info.get(
                    "details", "No risk details available"
                ),
                "concentration_index": round(concentration_index, 1),
                "top_risk_countries": [
                    d
                    for d in dependency_table
                    if d["dependency_risk"] in ["CRITICAL", "HIGH"]
                ],
                "overall_risk_level": assess_overall_risk(
                    concentration_index, len(trade_data)
                ),
            },
            "supply_chain_resilience": {
                "resilience_score": resilience_score,
                "num_suppliers": len(trade_data),
                "primary_supplier_dependency": max(
                    [d["dependency_percent"] for d in dependency_table]
                ),
                "supply_diversity": "EXCELLENT"
                if len(trade_data) >= 5
                else "GOOD"
                if len(trade_data) >= 3
                else "LIMITED"
                if len(trade_data) == 2
                else "SINGLE SOURCE",
                "growth_momentum": calculate_growth_momentum(dependency_table),
            },
        }

    except FileNotFoundError:
        return {"status": "error", "message": "EXIM data file not found"}
    except json.JSONDecodeError:
        return {"status": "error", "message": "Error decoding EXIM data file"}
    except Exception as e:
        return {"status": "error", "message": f"Unexpected error: {str(e)}"}


def calculate_stability_score(growth_str: str) -> str:
    """Calculate stability based on growth rate."""
    try:
        growth = float(growth_str.replace("%", "").replace("+", ""))
        if growth > 30:
            return "HIGHLY VOLATILE"
        elif growth > 20:
            return "VOLATILE"
        elif growth > 10:
            return "MODERATELY STABLE"
        else:
            return "STABLE"
    except (ValueError, AttributeError):
        return "UNKNOWN"


def calculate_price_trend(price_data: List[Dict]) -> str:
    """Determine price trend direction. Handles both year and quarter formats."""
    if len(price_data) < 2:
        return "INSUFFICIENT DATA"

    try:
        prices = [p["price"] for p in price_data if "price" in p]
        if not prices or len(prices) < 2:
            return "INSUFFICIENT DATA"

        if prices[-1] > prices[0]:
            return "UPWARD"
        elif prices[-1] < prices[0]:
            return "DOWNWARD"
        else:
            return "STABLE"
    except (KeyError, TypeError):
        return "INSUFFICIENT DATA"


def calculate_resilience_score(num_suppliers: int, dependency_table: List[Dict]) -> str:
    """Calculate supply chain resilience score."""
    # Factor 1: Number of suppliers
    supplier_score = min(100, (num_suppliers / 5) * 100)

    # Factor 2: Distribution evenness
    avg_dependency = 100 / num_suppliers if num_suppliers > 0 else 0
    actual_dependency = (
        dependency_table[0]["dependency_percent"] if dependency_table else 100
    )
    distribution_score = (
        min(100, (avg_dependency / actual_dependency) * 100)
        if actual_dependency > 0
        else 0
    )

    # Combined resilience
    combined_score = (supplier_score + distribution_score) / 2

    if combined_score >= 75:
        return "EXCELLENT"
    elif combined_score >= 60:
        return "GOOD"
    elif combined_score >= 40:
        return "FAIR"
    else:
        return "POOR"


def assess_overall_risk(concentration_index: float, num_suppliers: int) -> str:
    """Assess overall import risk level."""
    if concentration_index > 5000:
        return "CRITICAL RISK"
    elif concentration_index > 3000:
        return "HIGH RISK"
    elif concentration_index > 2000:
        return "MEDIUM RISK"
    else:
        return "LOW RISK"


def calculate_growth_momentum(dependency_table: List[Dict]) -> str:
    """Calculate overall growth momentum."""
    growth_rates = []
    for item in dependency_table:
        growth_str = item["qoq_growth"].replace("%", "").replace("+", "")
        try:
            growth = float(growth_str) if growth_str != "∞" else 50
            growth_rates.append(growth)
        except ValueError:
            pass

    if not growth_rates:
        return "NO DATA"

    avg_growth = sum(growth_rates) / len(growth_rates)

    if avg_growth > 25:
        return "RAPID EXPANSION"
    elif avg_growth > 15:
        return "STRONG GROWTH"
    elif avg_growth > 5:
        return "MODERATE GROWTH"
    else:
        return "STABLE/FLAT"
