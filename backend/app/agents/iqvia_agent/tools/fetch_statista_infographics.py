from crewai.tools import tool
from crewai import LLM
import requests
import json

llm = LLM(model="groq/llama-3.3-70b-versatile", max_tokens=200)

# --------------------------------------------------
# Generate ONLY 1 optimized Statista query
# --------------------------------------------------
def _generate_statista_queries(user_prompt: str) -> list[str]:
    prompt = f"""
You are an expert Statista search optimizer.

From the user request below, generate 1 high-quality Statista search query
specifically optimized for finding INFOGRAPHICS.

Rules:
- The query should be 1-2 words
- Avoid the word "statistics"
- Prefer patterns like:
  "lung cancer mortality"
  "cancer incidence"
  "global cancer deaths"
- Return a JSON array with exactly 1 string

User request: {user_prompt}

Return only JSON.
"""
    raw = llm.call(prompt)
    try:
        return json.loads(raw)
    except Exception:
        return []


# --------------------------------------------------
# Fetch Statista Infographics
# --------------------------------------------------
def _fetch_statista_infographics_single(query: str) -> list:
    print(f"[Statista] Searching infographics for: {query}")

    url = "https://www.statista.com/serp"
    params = {
        "q": query,
        "uuid": "019bffbf-5a8f-77a8-8f8a-e24020be45df",
        "_data": "routes/_index"
    }

    headers = {
        "accept": "*/*",
        "user-agent": "Mozilla/5.0",
        "referer": f"https://www.statista.com/serp?q={query}"
    }

    response = requests.get(url, params=params, headers=headers)
    response.raise_for_status()
    data = response.json()

    results = []
    for item in data.get("searchResponse", {}).get("results", []):
        if item.get("contentType") == "infographic" and item.get("premium") is False:
            cid = item.get("contentId")
            path = item.get("urlPath")
            if cid and path:
                results.append({
                    "type": "image",
                    "content": f"https://cdn.statcdn.com/Infographic/images/normal/{cid}.jpeg",
                    "title": item.get("title"),
                    "page_url": f"https://www.statista.com{path}"
                })
    return results


# --------------------------------------------------
# CrewAI Tool (robust input handling)
# --------------------------------------------------
@tool("fetch_statista_infographics")
def fetch_statista_infographics(user_prompt: str) -> dict:
    """
    Generates 1 optimized Statista search query and returns
    non-premium infographic results.
    """

    


    print(f"[DEBUG] Parsed user_prompt: {user_prompt}")

    if not user_prompt:
        return {
            "status": "no_data",
            "results": [],
            "message": "No user prompt received."
        }

    queries = _generate_statista_queries(user_prompt)
    if not queries:
        return {
            "status": "no_data",
            "results": [],
            "message": "Query generation failed."
        }

    query = queries[0]
    results = _fetch_statista_infographics_single(query)
    print(f"[Statista] Found {len(results)} infographics for query: {query}")
    if results:
        return {
            "status": "success",
            "query_used": query,
            "results": results
        }

    return {
        "status": "no_data",
        "query_used": query,
        "results": [],
        "message": "No freely accessible Statista infographics found for this query."
    }
