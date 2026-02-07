from __future__ import annotations

from crewai import Agent, LLM

from app.services.viz_builder import build_iqvia_visualizations
from .tools.fetch_market_data import fetch_market_data
from .tools.calculate_cagr import calculate_cagr
from .tools.fetch_statista_infographics import fetch_statista_infographics

llm = LLM(model="groq/llama-3.3-70b-versatile", max_tokens=400)

iqvia_agent = Agent(
    role="IQVIA Market Intelligence Agent",
    goal="Analyze pharmaceutical market dynamics, sales trends, competitive landscape, and growth forecasts",
    backstory="""
    You are an expert pharmaceutical market intelligence analyst specializing in market sizing and competitive dynamics.
    
    RESPONSIBILITIES
    - Analyze drug/therapy market size and growth trends
    - Track market share and competitive positioning
    - Assess market forecasts and CAGR
    - Identify market trends and opportunities
    
    HARD RULES (DO NOT VIOLATE)
    - NEVER invent market data, URLs, chart titles, or sources
    - If tools return no data, clearly state: "No market data available for this drug/therapy"
    - Prefer tool outputs over model guesses; clearly label every data source
    - Separate facts (from tools) vs. analysis (your reasoning)
    - Use fetch_market_data for market size, sales, and competitive share
    - Use calculate_cagr for growth rate calculations
    - Use fetch_statista_infographics for visual evidence and trends
    
    REQUIRED OUTPUT SECTIONS
    - Market Size & Forecast (with historical and projected data)
    - Competitive Landscape (market share, key players)
    - Growth Analysis (CAGR, trends, opportunities)
    - Visual Evidence (charts, infographics if available)
    - Data Sources (explicitly list which tools/files were used)
    
    ERROR / NO-DATA HANDLING
    - If no market data found: clearly say "No market data available" and explain the limitation
    - If partial data: return whatever is available; mark missing fields as "unknown"
    """,
    tools=[fetch_market_data, calculate_cagr, fetch_statista_infographics],
    verbose=True,
    allow_delegation=False,
    llm=llm,
)


def _llm_extract_prompt(
    user_prompt: str,
) -> tuple[str | None, str | None, str | None]:
    """Use the configured LLM to extract search_term, therapy_area, indication from the prompt."""
    prompt = f"""You are a pharmaceutical market analysis data extraction expert. Your job is to extract structured information from user queries about pharmaceutical markets.

From the following query, extract EXACTLY these 3 fields:
1. search_term: The main search term - this could be a drug name (e.g., 'pembrolizumab'), a disease/condition (e.g., 'breast cancer', 'lung cancer'), or a therapy area (e.g., 'oncology')
2. therapy_area: The therapeutic area (e.g., 'Oncology', 'Cardiovascular', 'Neurodegenerative')
3. indication: Specific indication or disease focus if mentioned

CRITICAL RULES:
- Extract ONLY what is explicitly stated in the query
- The search_term should be the PRIMARY subject of the query - either a drug OR a disease/condition
- If user asks about "breast cancer market", search_term = "breast cancer"
- If user asks about "pembrolizumab sales", search_term = "pembrolizumab"
- Therapy areas should be capitalized (e.g., 'Oncology', 'Cardiovascular')
- Return a valid JSON object with these exact keys

User Query: {user_prompt}

Return ONLY a JSON object, nothing else:"""

    try:
        raw = llm.call(messages=[{"role": "user", "content": prompt}])
    except Exception:
        try:
            raw = llm.call(prompt)
        except Exception as e2:
            print(f"[ERROR] LLM call failed: {e2}")
            return None, None, None

    if not isinstance(raw, str):
        raw = str(raw)

    import json as _json

    start = raw.find("{")
    end = raw.rfind("}")
    if start == -1 or end == -1 or end < start:
        print(f"[ERROR] No JSON found in LLM response: {raw}")
        return None, None, None

    try:
        data = _json.loads(raw[start : end + 1])
    except Exception as e:
        print(f"[ERROR] Failed to parse JSON from LLM: {e}")
        return None, None, None

    # Helper to normalize null/empty strings
    def clean_val(val):
        if val is None or (
            isinstance(val, str) and val.lower() in ("null", "none", "")
        ):
            return None
        return val

    search_term = clean_val(data.get("search_term"))
    therapy_area = clean_val(data.get("therapy_area"))
    indication = clean_val(data.get("indication"))

    print(
        f"[IQVIA] LLM raw extracted: search_term={search_term}, therapy_area={therapy_area}, indication={indication}"
    )

    return search_term, therapy_area, indication


def run_iqvia_agent(
    user_prompt: str,
    *,
    search_term: str | None = None,
    therapy_area: str | None = None,
    indication: str | None = None,
) -> dict:
    """
    Run the IQVIA agent.
    
    If search_term/therapy_area are provided by orchestrator, use them directly.
    Otherwise, fall back to LLM extraction for backward compatibility.
    """
    print(f"[IQVIA] Starting agent with prompt: {user_prompt}")

    # If parameters provided by orchestrator, use them directly
    if search_term or indication:
        print(f"[IQVIA] Using orchestrator-provided params: search_term={search_term}, therapy_area={therapy_area}, indication={indication}")
        llm_search_term = search_term
        llm_therapy_area = therapy_area
        llm_indication = indication
    else:
        # Fallback to LLM extraction for backward compatibility
        print("[IQVIA] No params from orchestrator, falling back to LLM extraction...")
        llm_search_term, llm_therapy_area, llm_indication = _llm_extract_prompt(user_prompt)

    print(
        f"[IQVIA] Final params: search_term={llm_search_term}, therapy_area={llm_therapy_area}, indication={llm_indication}"
    )

    # Prefer explicit parameters, then LLM extraction
    search = search_term or llm_search_term
    therapy = therapy_area or llm_therapy_area
    ind = indication or llm_indication

    # For IQVIA, we can work with search_term OR indication - we need at least one
    query_term = search or ind or therapy

    if not query_term:
        return {
            "status": "error",
            "message": "Could not extract search term from query. Please provide a drug name, disease, or therapy area.",
        }

    try:
        # Fetch Statista infographics for visual evidence - this is the primary data source
        print(f"[IQVIA] Fetching Statista infographics for: {user_prompt}")
        infographics_fn = getattr(
            fetch_statista_infographics, "func", fetch_statista_infographics
        )
        infographics_data = infographics_fn(user_prompt)

        print(f"[IQVIA] Statista response status: {infographics_data.get('status')}")

        infographics = (
            infographics_data.get("results", [])
            if infographics_data.get("status") == "success"
            else []
        )

        print(f"[IQVIA] Found {len(infographics)} infographics")

        # Try to fetch market data from local files (optional - may not have data for all queries)
        fetch_fn = getattr(fetch_market_data, "func", fetch_market_data)
        market_data = fetch_fn(
            drug_name=search or "generic",
            therapy_area=therapy,
            indication=ind,
            region="Global",
        )

        # Extract market data for CAGR calculation (if available)
        data_section = (
            market_data.get("data", {})
            if market_data and "error" not in market_data
            else {}
        )
        market_forecast = data_section.get("market_forecast", {})
        competitive_share = data_section.get("competitive_share", {})
        forecast_data = market_forecast.get("data", [])

        cagr_data = None
        if len(forecast_data) >= 2:
            start_val = forecast_data[0].get("value")
            end_val = forecast_data[-1].get("value")
            years = len(forecast_data) - 1

            if start_val and end_val and years > 0:
                cagr_fn = getattr(calculate_cagr, "func", calculate_cagr)
                cagr_data = cagr_fn(
                    start_value=start_val, end_value=end_val, years=years
                )

        # Build the payload - even if market data is missing, we have infographics
        payload = {
            "market_forecast": market_forecast,
            "competitive_share": competitive_share,
            "input": {
                "search_term": search,
                "therapy_area": therapy,
                "indication": ind,
            },
            "cagr_analysis": cagr_data,
            "infographics": infographics,
            "query_used": infographics_data.get("query_used", query_term),
        }

        return {
            "status": "success",
            "data": payload,
            "visualizations": build_iqvia_visualizations(
                {
                    "input": payload["input"],
                    "market_data": market_data if "error" not in market_data else {},
                    "cagr_analysis": cagr_data,
                    "infographics": infographics,
                }
            ),
        }
    except Exception as e:
        print(f"[IQVIA] Error: {str(e)}")
        import traceback

        traceback.print_exc()
        return {"status": "error", "message": str(e)}
