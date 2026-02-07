from crewai.tools import tool
from datetime import datetime, timedelta

from crewai.tools import tool
import requests
import os
from typing import Optional, Dict, Any

USPTO_SEARCH_URL = "https://ppubs.uspto.gov/api/searches/generic"

@tool("fetch_patent_data")
def fetch_patent_data(
    drug_name: str,
    cursor_marker: str = "*",
    page_size: int = 50
) -> Dict[str, Any]:
    """
    Fetch real patent data from USPTO PPUBS search API.

    Args:
        drug_name: Drug / compound / keyword to search (e.g. "penicillin AND fever")
        cursor_marker: Cursor marker for pagination (default "*")
        page_size: Number of records per page (default 50)

    Returns:
        Raw USPTO response containing:
        - cursorMarker
        - numFound
        - docs[]
    """
    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "origin": "https://ppubs.uspto.gov",
        "referer": "https://ppubs.uspto.gov/pubwebapp/static/pages/ppubsbasic.html",
        "user-agent": "Mozilla/5.0",
        "X-Access-Token": "eyJzdWIiOiIzYTFkMjQ0Yi1iMGI3LTQzNjUtYThhMS0zNzEyN2FhOGViZjQiLCJ2ZXIiOiIwOTYwZGU2OC1kOWRmLTRmZWMtYTA0OS0wNTk0OThjZjI1MDMiLCJleHAiOjB9"
    }

    payload = {
        "cursorMarker": cursor_marker,
        "databaseFilters": [
            {"databaseName": "USPAT"},
            {"databaseName": "US-PGPUB"},
            {"databaseName": "USOCR"}
        ],
        "fields": [
            "documentId",
            "patentNumber",
            "title",
            "datePublished",
            "inventors",
            "pageCount",
            "type"
        ],
        "op": "AND",
        "pageSize": page_size,
        "q": drug_name,
        "searchType": 0,
        "sort": "date_publ desc"
    }

    try:
        response = requests.post(
            USPTO_SEARCH_URL,
            headers=headers,
            json=payload,
            timeout=30
        )
        response.raise_for_status()
        return response.json()

    except requests.exceptions.RequestException as e:
        return {
            "error": "USPTO_API_REQUEST_FAILED",
            "message": str(e),
            "query": drug_name
        }
