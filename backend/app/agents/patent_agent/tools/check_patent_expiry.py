from crewai.tools import tool
from datetime import datetime

@tool("check_patent_expiry")
def check_patent_expiry(patent_number: str, filing_date: str) -> dict:
    """
    Calculates patent expiry information and remaining protection period.
    
    Args:
        patent_number: Patent number (e.g., "US1234567")
        filing_date: Patent filing date in YYYY-MM-DD format
    
    Returns:
        Dictionary containing expiry date, years remaining, and status
    """
    try:
        filing_dt = datetime.strptime(filing_date, "%Y-%m-%d")
        
        # Standard patent term is 20 years from filing date
        expiry_dt = filing_dt.replace(year=filing_dt.year + 20)
        
        today = datetime.now()
        days_remaining = (expiry_dt - today).days
        years_remaining = days_remaining / 365.25
        
        if days_remaining < 0:
            status = "Expired"
            years_remaining = 0
        elif days_remaining < 365:
            status = "Expiring Soon (< 1 year)"
        elif years_remaining < 5:
            status = "Near Expiry (< 5 years)"
        else:
            status = "Active"
        
        return {
            "patent_number": patent_number,
            "filing_date": filing_date,
            "expiry_date": expiry_dt.strftime("%Y-%m-%d"),
            "days_remaining": max(0, days_remaining),
            "years_remaining": round(max(0, years_remaining), 2),
            "status": status,
            "interpretation": f"Patent {patent_number} will expire on {expiry_dt.strftime('%Y-%m-%d')} ({round(max(0, years_remaining), 1)} years remaining)"
        }
    
    except Exception as e:
        return {
            "error": f"Invalid date format or calculation error: {str(e)}",
            "note": "Use YYYY-MM-DD format for filing_date"
        }
