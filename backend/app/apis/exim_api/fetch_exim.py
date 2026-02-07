import requests
from bs4 import BeautifulSoup

def fetch_trade_data(year: str, hs_code: str, report_type: int = 2, commodity_type: str = "specific"):
    base_url = "https://tradestat.commerce.gov.in"
    endpoint = "/eidb/commodity_wise_export"

    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0",
        "Referer": base_url,
        "Origin": base_url
    })

    # 1. Get page to obtain CSRF token + cookies
    r = session.get(base_url + endpoint, timeout=20)
    r.raise_for_status()

    soup = BeautifulSoup(r.text, "html.parser")
    token_input = soup.find("input", {"name": "_token"})
    if not token_input:
        raise RuntimeError("CSRF token not found")

    csrf_token = token_input["value"]

    # 2. Submit POST with same session
    payload = {
        "_token": csrf_token,
        "EidbYearCwe": year,
        "commodityType": commodity_type,
        "Eidb_hscodeCwe":   ,
        "Eidb_ReportCwe": report_type
    }

    response = session.post(base_url + endpoint, data=payload, timeout=30)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")
    table = soup.find("table", {"id": "example1"})
    if not table:
        raise RuntimeError("Trade table not found – check HS code / year")

    # Headers
    headers = [th.get_text(strip=True) for th in table.thead.find_all("th")]

    # Body rows
    rows = []
    for tr in table.tbody.find_all("tr"):
        cols = [td.get_text(strip=True).replace(",", "") for td in tr.find_all("td")]
        rows.append(dict(zip(headers, cols)))

    # Footer totals
    totals = {}
    if table.tfoot:
        footer_cols = [td.get_text(strip=True).replace(",", "") for td in table.tfoot.find_all("td")]
        totals = dict(zip(headers, footer_cols))

    return {
        "query": {
            "year": year,
            "hs_code": hs_code,
            "report_type": report_type
        },
        "columns": headers,
        "rows": rows,
        "totals": totals
    }


