from __future__ import annotations

import json

from crewai import Agent, LLM

from app.services.viz_builder import build_exim_visualizations
from .tools.fetch_exim_data import fetch_exim_data, _fetch_exim_data_impl

llm = LLM(model="groq/llama-3.3-70b-versatile", max_tokens=400)

exim_agent = Agent(
    role="EXIM Trends Agent",
    goal="Analyze pharmaceutical export-import trends using India TradeStats data",
    backstory="""You are an expert in international pharmaceutical trade analysis.
    
    RESPONSIBILITIES
    - Analyze export/import trade data for pharmaceutical products
    - Track trade volumes and growth trends across years
    - Identify key trading partners and market shares
    - Provide strategic sourcing insights
    
    HARD RULES (DO NOT VIOLATE)
    - NEVER invent trade values, HS codes, or country data
    - If tools return no data, clearly state: "No trade data available for this query"
    - Prefer tool outputs over model guesses; clearly label every data source
    - Separate facts (from tools) vs. analysis (your reasoning)
    
    REQUIRED OUTPUT SECTIONS
    - Trade Volume Summary (current year vs previous year)
    - Top Trading Partners (by trade value)
    - Growth Analysis (YoY growth percentages)
    - Data Sources (explicitly list which tools/APIs were used)
    
    ERROR / NO-DATA HANDLING
    - If no trade data found: clearly say "No trade data available" and explain the limitation
    - If partial data: return whatever is available; mark missing fields as "unknown"
    """,
    tools=[fetch_exim_data],
    verbose=True,
    allow_delegation=False,
    llm=llm,
)


# HSN Code mapping for pharmaceutical products
PHARMA_HSN_CODES = {
    # Bulk drugs & APIs
    "paracetamol": "29242990",
    "ibuprofen": "29163990",
    "metformin": "29252990",
    "amoxicillin": "29411090",
    "azithromycin": "29419090",
    "omeprazole": "29349990",
    "atorvastatin": "29362990",
    "ciprofloxacin": "29419090",
    "amlodipine": "29339990",
    "losartan": "29339990",
    
    # Formulations & finished drugs
    "medicines": "30049099",
    "pharmaceuticals": "30049099",
    "drugs": "30049099",
    "tablets": "30049099",
    "capsules": "30049099",
    "injections": "30049099",
    "formulations": "30049099",
    "vaccines": "30022090",
    "insulin": "30043100",
    "antibiotics": "30041090",
    
    # Generic categories
    "api": "29419090",
    "bulk drugs": "29419090",
    "active pharmaceutical ingredients": "29419090",
    "pharmaceutical intermediates": "29339990",
    
    # Default for general pharma queries
    "default": "30049099",
}


def _get_hsn_code(query: str) -> str:
    """Get HSN code from query keywords."""
    query_lower = query.lower()
    for keyword, code in PHARMA_HSN_CODES.items():
        if keyword in query_lower:
            return code
    return PHARMA_HSN_CODES["default"]


def _llm_extract_exim_params(
    user_prompt: str,
) -> tuple[str | None, str | None, str | None, str | None]:
    """Use the configured LLM to extract hs_code, year, country, trade_type from the prompt."""
    prompt = f"""You are a pharmaceutical trade data extraction expert. Your job is to extract structured information from user queries about export-import trade.

From the following query, extract EXACTLY these 4 fields:
1. product: The pharmaceutical product, drug name, or category mentioned (e.g., 'paracetamol', 'medicines', 'vaccines', 'APIs')
2. year: The financial year mentioned in format 'YYYY-YY' (e.g., '2024-25', '2023-24'). Default to '2024-25' if not specified.
3. country: The country mentioned for trade focus (e.g., 'USA', 'Germany', 'China'). Return 'null' if not specified.
4. trade_type: Either 'export' or 'import' based on the query context. Default to 'export' if not clear.

CRITICAL RULES:
- Extract ONLY what is explicitly stated in the query
- Do NOT make assumptions or invent information
- If a field is not mentioned, return 'null' for that field (except year which defaults to '2024-25' and trade_type which defaults to 'export')
- Product names should be lowercase (e.g., 'paracetamol', 'medicines')
- Year format MUST be 'YYYY-YY' (e.g., '2024-25' not '2024' or '2025')
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
            return None, "2024-25", None, "export"

    if not isinstance(raw, str):
        raw = str(raw)

    import json as _json

    start = raw.find("{")
    end = raw.rfind("}")
    if start == -1 or end == -1 or end < start:
        print(f"[ERROR] No JSON found in LLM response: {raw}")
        return None, "2024-25", None, "export"

    try:
        data = _json.loads(raw[start : end + 1])
    except Exception as e:
        print(f"[ERROR] Failed to parse JSON from LLM: {e}")
        return None, "2024-25", None, "export"

    def clean_val(val):
        if val is None or (
            isinstance(val, str) and val.lower() in ("null", "none", "")
        ):
            return None
        return val

    product = clean_val(data.get("product"))
    year = clean_val(data.get("year")) or "2024-25"
    country = clean_val(data.get("country"))
    trade_type = clean_val(data.get("trade_type")) or "export"

    print(
        f"[EXIM] LLM raw extracted: product={product}, year={year}, country={country}, trade_type={trade_type}"
    )

    return product, year, country, trade_type


def run_exim_agent(
    user_prompt: str,
    *,
    product: str | None = None,
    year: str | None = None,
    country: str | None = None,
    trade_type: str | None = None,
) -> dict:
    """Run the EXIM agent. Uses LLM-based prompt extraction and India TradeStats API."""
    print(f"[EXIM] Starting agent with prompt: {user_prompt}")

    # Use LLM extraction
    llm_product, llm_year, llm_country, llm_trade_type = _llm_extract_exim_params(user_prompt)

    print(
        f"[EXIM] LLM extracted: product={llm_product}, year={llm_year}, country={llm_country}, trade_type={llm_trade_type}"
    )

    # Prefer explicit parameters, then LLM extraction
    prod = product or llm_product or "medicines"
    yr = year or llm_year or "2024-25"
    cntry = country or llm_country
    ttype = trade_type or llm_trade_type or "export"

    # Get HSN code based on product
    hs_code = _get_hsn_code(prod)
    
    print(f"[EXIM] Using HSN code: {hs_code} for product: {prod}")

    try:
        # Fetch trade data from India TradeStats API
        print(f"[EXIM] Fetching trade data: year={yr}, hs_code={hs_code}, trade_type={ttype}")
        
        # Report type: 2 = Country-wise, 1 = Commodity-wise
        report_type = 2
        
        trade_data = _fetch_exim_data_impl(
            drug_name=prod,
            hs_code=hs_code,
            country=cntry
        )

        if "error" in trade_data:
            print(f"[EXIM] Error from fetch_trade_data: {trade_data.get('error')}")
            return {"status": "error", "message": trade_data.get("error")}

        rows = trade_data.get("rows", [])
        totals = trade_data.get("totals", {})
        columns = trade_data.get("columns", [])

        print(f"[EXIM] Found {len(rows)} trade records")

        # Process trade data for analysis
        processed_data = _process_trade_data(rows, columns, prod, hs_code, yr, ttype)

        payload = {
            "input": {
                "product": prod,
                "hs_code": hs_code,
                "year": yr,
                "country": cntry,
                "trade_type": ttype,
            },
            "trade_data": {
                "rows": rows[:20],  # Top 20 countries
                "totals": totals,
                "columns": columns,
                "total_records": len(rows),
            },
            "analysis": processed_data,
        }

        return {
            "status": "success",
            "data": payload,
            "visualizations": build_exim_visualizations(payload),
        }
    except Exception as e:
        print(f"[EXIM] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": str(e)}


def _process_trade_data(rows: list, columns: list, product: str, hs_code: str, year: str, trade_type: str) -> dict:
    """Process raw trade data into structured analysis."""
    
    # Parse year columns from headers
    # Typical columns: ['S.No.', 'HSCode', 'Commodity', 'Country', '2023 - 2024', '%Share', '2024 - 2025', '%Growth']
    # or: ['S.No.', 'HSCode', 'Commodity', '2023 - 2024', '%Share', '2024 - 2025', '%Growth']
    
    current_year_col = None
    previous_year_col = None
    growth_col = None
    share_col = None
    country_col = None
    
    for col in columns:
        col_lower = col.lower()
        if '2024' in col and '2025' in col:
            current_year_col = col
        elif '2023' in col and '2024' in col:
            previous_year_col = col
        elif 'growth' in col_lower:
            growth_col = col
        elif 'share' in col_lower:
            share_col = col
        elif 'country' in col_lower:
            country_col = col
    
    # Calculate totals and summaries
    total_current = 0.0
    total_previous = 0.0
    top_partners = []
    
    for row in rows[:20]:  # Top 20 trading partners
        try:
            current_val = float(row.get(current_year_col, '0').replace(',', '') or '0') if current_year_col else 0
            previous_val = float(row.get(previous_year_col, '0').replace(',', '') or '0') if previous_year_col else 0
            growth = float(row.get(growth_col, '0').replace(',', '') or '0') if growth_col else 0
            share = float(row.get(share_col, '0').replace(',', '') or '0') if share_col else 0
            
            partner_name = row.get(country_col) or row.get('Country') or row.get('Commodity', 'Unknown')
            
            top_partners.append({
                "name": partner_name,
                "current_value": current_val,
                "previous_value": previous_val,
                "growth": growth,
                "share": share,
            })
            
            total_current += current_val
            total_previous += previous_val
        except (ValueError, TypeError):
            continue
    
    # Calculate overall growth
    overall_growth = ((total_current - total_previous) / total_previous * 100) if total_previous > 0 else 0
    
    return {
        "summary": {
            "product": product,
            "hs_code": hs_code,
            "year": year,
            "trade_type": trade_type,
            "total_current_year": round(total_current, 2),
            "total_previous_year": round(total_previous, 2),
            "overall_growth": round(overall_growth, 2),
            "top_partners_count": len(top_partners),
        },
        "top_partners": top_partners,
        "columns_used": {
            "current_year": current_year_col,
            "previous_year": previous_year_col,
            "growth": growth_col,
            "share": share_col,
            "country": country_col,
        },
    }