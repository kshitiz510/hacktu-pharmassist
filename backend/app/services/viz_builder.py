"""Helpers to standardize visualization payloads for the frontend.

All builders return lightweight dicts with a common shape so the UI can
render charts/tables/cards without agent-specific logic.

This module is designed to be:
- Modular: Each chart type has its own builder
- Generic: Works with any agent data structure
- Robust: Handles missing/null values gracefully
- Consistent: All outputs follow the same schema
"""

from __future__ import annotations

from typing import Dict, Iterable, List, Optional, Sequence

from app.models.visualization import (
    TableColumn,
    Visualization,
    VisualizationType,
    VizConfig,
)


# ============================================================================
# LABEL FORMATTING
# ============================================================================

# Special case mappings for common field names
SPECIAL_LABELS = {
    "nct_id": "NCT ID",
    "id": "ID",
    "url": "URL",
    "api": "API",
    "cagr": "CAGR",
    "roi": "ROI",
    "usd": "USD",
    "eur": "EUR",
    "gbp": "GBP",
    "fda": "FDA",
    "ema": "EMA",
    "moa": "MoA",
    "ip": "IP",
    "r_and_d": "R&D",
    "p_value": "P-Value",
    "ci": "CI",
    "hr": "HR",
    "or": "OR",
}


def _pretty_label(key: str) -> str:
    """Convert field keys to human-readable labels."""
    if not key:
        return ""

    lower = key.lower()
    if lower in SPECIAL_LABELS:
        return SPECIAL_LABELS[lower]

    # Convert snake_case and camelCase to Title Case
    return key.replace("_", " ").replace("-", " ").title()


def build_bar_chart(
    *,
    id: str,
    title: str,
    items: Iterable[dict] | dict,
    x_field: str,
    y_field: str,
    orientation: str = "vertical",
    description: str | None = None,
) -> dict:
    # Accept either a dict mapping or list of dicts
    if isinstance(items, dict):
        data = [{x_field: k, y_field: v} for k, v in items.items()]
    else:
        data = list(items)

    viz = Visualization(
        id=id,
        vizType=VisualizationType.BAR,
        title=title,
        description=description,
        data=data,
        config=VizConfig(
            xField=x_field,
            yField=y_field,
            orientation=orientation,
            legend=False,
            tooltip=True,
        ),
    )
    return viz.model_dump()


def build_pie_chart(
    *,
    id: str,
    title: str,
    items: Iterable[dict] | dict,
    label_field: str = "label",
    value_field: str = "value",
    description: str | None = None,
) -> dict:
    if isinstance(items, dict):
        data = [{label_field: k, value_field: v} for k, v in items.items()]
    else:
        data = list(items)

    viz = Visualization(
        id=id,
        vizType=VisualizationType.PIE,
        title=title,
        description=description,
        data=data,
        config=VizConfig(labelField=label_field, valueField=value_field),
    )
    return viz.model_dump()


def build_table(
    *,
    id: str,
    title: str,
    columns: Sequence[str | Dict[str, str]],
    rows: Sequence[dict],
    description: str | None = None,
    page_size: int = 15,
) -> dict:
    normalized_columns: List[TableColumn] = []
    for col in columns:
        if isinstance(col, str):
            normalized_columns.append(TableColumn(key=col, label=_pretty_label(col)))
        elif isinstance(col, dict):
            key = col.get("key") or col.get("field") or col.get("name")
            if not key:
                continue
            label = col.get("label") or _pretty_label(key)
            col_type = col.get("type")
            normalized_columns.append(TableColumn(key=key, label=label, type=col_type))

    viz = Visualization(
        id=id,
        vizType=VisualizationType.TABLE,
        title=title,
        description=description,
        data={
            "columns": [c.model_dump() for c in normalized_columns],
            "rows": list(rows),
        },
        config=VizConfig(pageSize=page_size, sortable=True),
    )
    return viz.model_dump()


def build_metric_card(
    *,
    id: str,
    title: str,
    value: float | int | str,
    delta: Optional[float] = None,
    unit: str | None = None,
) -> dict:
    viz = Visualization(
        id=id,
        vizType=VisualizationType.CARD,
        title=title,
        data={"value": value, "delta": delta, "unit": unit},
    )
    return viz.model_dump()


def build_clinical_visualizations(payload: dict) -> List[dict]:
    """Create a standard set of visualizations from the clinical agent payload."""
    viz: List[dict] = []

    trials = payload.get("trials", {}) if payload else {}
    analysis = payload.get("analysis", {}) if payload else {}

    phase_dist = trials.get("phase_distribution") or {}
    status_dist = trials.get("status_distribution") or {}
    sponsors = trials.get("top_sponsors") or []
    trials_list = trials.get("trials") or []
    enrollment_summary = trials.get("enrollment_summary") or {}
    total_trials = trials.get("total_trials") or analysis.get("total_trials")
    maturity_score = analysis.get("maturity_score")

    if phase_dist:
        viz.append(
            build_bar_chart(
                id="phase_distribution",
                title="Trial Phase Distribution",
                items=phase_dist,
                x_field="phase",
                y_field="count",
            )
        )

    if status_dist:
        viz.append(
            build_pie_chart(
                id="status_distribution",
                title="Trial Status Breakdown",
                items=status_dist,
            )
        )

    if sponsors:
        sponsor_rows = [
            {"sponsor": s.get("name"), "count": s.get("count")} for s in sponsors if s
        ]
        viz.append(
            build_bar_chart(
                id="top_sponsors",
                title="Top Sponsors",
                items=sponsor_rows,
                x_field="sponsor",
                y_field="count",
                orientation="horizontal",
            )
        )

    if trials_list:
        columns = [
            {"key": "nct_id", "label": "NCT ID"},
            {"key": "title", "label": "Trial Title"},
            {"key": "status", "label": "Status"},
            {"key": "phase", "label": "Phase"},
            {"key": "sponsor", "label": "Sponsor"},
            {"key": "enrollment", "label": "Enrollment"},
            {"key": "locations_count", "label": "Locations"},
        ]
        viz.append(
            build_table(
                id="trials_table",
                title="Clinical Trials",
                columns=columns,
                rows=trials_list,
                page_size=20,
            )
        )

    if total_trials is not None:
        viz.append(
            build_metric_card(
                id="total_trials",
                title="Total Trials",
                value=total_trials,
            )
        )

    if enrollment_summary:
        viz.append(
            build_metric_card(
                id="median_enrollment",
                title="Median Enrollment",
                value=enrollment_summary.get("median_enrollment"),
            )
        )

    if maturity_score is not None:
        viz.append(
            build_metric_card(
                id="maturity_score",
                title="Maturity Score",
                value=round(maturity_score * 100, 1)
                if isinstance(maturity_score, (int, float))
                else maturity_score,
                unit="%",
            )
        )

    return viz


def build_iqvia_visualizations(payload: dict) -> List[dict]:
    """Create a standard set of visualizations from the IQVIA agent payload."""
    viz: List[dict] = []

    market_data = payload.get("market_data", {}) if payload else {}
    cagr_analysis = payload.get("cagr_analysis", {}) if payload else {}
    infographics = payload.get("infographics", []) if payload else []

    # Extract data structure from the nested market_data response
    data_section = market_data.get("data", {}) if market_data else {}

    market_forecast = data_section.get("market_forecast") or {}
    competitive_share = data_section.get("competitive_share") or {}

    forecast_data = market_forecast.get("data", [])
    competitive_data = competitive_share.get("data", [])

    # Market Forecast Chart
    if forecast_data:
        viz.append(
            build_bar_chart(
                id="market_forecast",
                title=market_forecast.get("title", "Market Forecast"),
                items=forecast_data,
                x_field="year",
                y_field="value",
                description=f"Market size forecast for {payload.get('input', {}).get('drug_name', 'drug')}",
            )
        )

    # Competitive Share Chart
    if competitive_data:
        viz.append(
            build_pie_chart(
                id="competitive_share",
                title=competitive_share.get("title", "Competitive Market Share"),
                items=[
                    {"label": item.get("company"), "value": item.get("share")}
                    for item in competitive_data
                    if item
                ],
                label_field="label",
                value_field="value",
            )
        )

    # Market forecast table
    if forecast_data:
        columns = [
            {"key": "year", "label": "Year"},
            {"key": "value", "label": "Market Size (USD)"},
        ]
        viz.append(
            build_table(
                id="market_forecast_table",
                title="Market Forecast Details",
                columns=columns,
                rows=forecast_data,
                page_size=10,
            )
        )

    # Competitive share table
    if competitive_data:
        columns = [
            {"key": "company", "label": "Company"},
            {"key": "share", "label": "Market Share"},
        ]
        viz.append(
            build_table(
                id="competitive_share_table",
                title="Competitive Market Share Details",
                columns=columns,
                rows=competitive_data,
                page_size=10,
            )
        )

    # CAGR Metric Card
    if cagr_analysis and "cagr_percent" in cagr_analysis:
        viz.append(
            build_metric_card(
                id="cagr_growth",
                title="Compound Annual Growth Rate (CAGR)",
                value=cagr_analysis.get("cagr_percent"),
                unit="%",
            )
        )

    # Total Growth Metric Card
    if cagr_analysis and "total_growth_percent" in cagr_analysis:
        viz.append(
            build_metric_card(
                id="total_growth",
                title="Total Growth",
                value=cagr_analysis.get("total_growth_percent"),
                unit="%",
            )
        )

    # Add Statista infographics as image visualizations
    for idx, infographic in enumerate(infographics):
        viz.append(
            {
                "id": f"infographic_{idx}",
                "vizType": "image",
                "title": infographic.get("title", "Market Infographic"),
                "description": infographic.get("subtitle", ""),
                "data": {
                    "imageUrl": infographic.get("content"),
                    "caption": infographic.get("description", ""),
                    "sourceUrl": infographic.get("url", ""),
                    "source": "Statista",
                    "premium": infographic.get("premium", False),
                },
            }
        )

    return viz


def build_patent_visualizations(payload: dict) -> List[dict]:
    """Create a standard set of visualizations from the Patent FTO agent payload.
    
    Follows the same pattern as build_clinical_visualizations().
    Enhanced to support new FTO Risk Index (0-100) and multi-layer summaries.
    """
    viz: List[dict] = []

    if not payload:
        return viz

    fto = payload.get("fto", {})
    discovery = payload.get("discovery", {})
    verifications = payload.get("verifications", [])
    parsed_input = payload.get("input", {})

    # Extract data from FTO result (support both old and new fields)
    fto_risk_index = fto.get("ftoRiskIndex", 0)
    fto_risk_band = fto.get("ftoRiskBand", "LOW")
    fto_status = fto.get("ftoStatus", "UNKNOWN")
    confidence = fto.get("confidence", "LOW")
    blocking_patents = fto.get("blockingPatents", [])
    non_blocking_patents = fto.get("nonBlockingPatents", [])
    expired_patents = fto.get("expiredPatents", [])
    uncertain_patents = fto.get("uncertainPatents", [])
    earliest_freedom_date = fto.get("earliestFreedomDate")
    recommended_actions = fto.get("recommendedActions", [])
    # NOTE: Removed scoring_notes and raw_score - internal artifacts not for display

    # ----- Risk Band Card (primary metric) -----
    viz.append(
        build_metric_card(
            id="fto_risk_band",
            title="FTO Risk Level",
            value=fto_risk_band,
        )
    )

    # ----- FTO Status Card (human readable status) -----
    status_display = {
        "CLEAR": "CLEAR",
        "LOW_RISK": "LOW RISK",
        "MODERATE_RISK": "MODERATE RISK",
        "HIGH_RISK": "HIGH RISK",
    }
    viz.append(
        build_metric_card(
            id="fto_status",
            title="FTO Status",
            value=status_display.get(fto_status, fto_status),
        )
    )

    # ----- Confidence Card (simplified: HIGH/MEDIUM/LOW) -----
    viz.append(
        build_metric_card(
            id="confidence",
            title="Analysis Confidence",
            value=confidence,
        )
    )

    # ----- Patents Discovered Card (use totalFound from API, not filtered count) -----
    patents_discovered = discovery.get("totalFound", len(discovery.get("patents", [])))
    viz.append(
        build_metric_card(
            id="patents_discovered",
            title="Patents Found",
            value=patents_discovered,
        )
    )

    # ----- Earliest Freedom Date Card -----
    if earliest_freedom_date:
        viz.append(
            build_metric_card(
                id="freedom_date",
                title="Freedom Date",
                value=earliest_freedom_date,
            )
        )

    # ----- Patent Breakdown Pie Chart (Fixed: explicit labels, no NaN) -----
    # Use explicit string labels and include all categories even if zero
    patent_breakdown = {}
    
    # Always use explicit string keys (prevents NaN in legend)
    blocking_count = len(blocking_patents) if blocking_patents else 0
    non_blocking_count = len(non_blocking_patents) if non_blocking_patents else 0
    expired_count = len(expired_patents) if expired_patents else 0
    uncertain_count = len(uncertain_patents) if uncertain_patents else 0
    
    # Only add categories with non-zero counts - ensure values are integers
    if blocking_count > 0:
        patent_breakdown["Blocking"] = int(blocking_count)
    if non_blocking_count > 0:
        patent_breakdown["Non-blocking"] = int(non_blocking_count)
    if expired_count > 0:
        patent_breakdown["Expired"] = int(expired_count)
    if uncertain_count > 0:
        patent_breakdown["Uncertain"] = int(uncertain_count)
    
    # Assertion: all keys must be non-empty strings and values must be positive integers
    assert all(isinstance(k, str) and k for k in patent_breakdown.keys()), \
        "Pie chart labels must be non-empty strings"
    assert all(isinstance(v, int) and v > 0 for v in patent_breakdown.values()), \
        f"Pie chart values must be positive integers, got {patent_breakdown}"
    
    # Always render pie chart if any patents were analyzed
    total_patents = blocking_count + non_blocking_count + expired_count + uncertain_count
    if total_patents > 0:
        viz.append(
            build_pie_chart(
                id="patent_breakdown",
                title="Patent Breakdown",
                items=patent_breakdown,
                description=f"Distribution of {total_patents} analyzed patent(s) by blocking status",
            )
        )

    # ----- Blocking Patents Table (Enhanced v2: normalizedRisk, riskBand, sourceUrl) -----
    if blocking_patents:
        blocking_rows = []
        for p in blocking_patents:
            # Get normalized risk (0-100) with assertion
            normalized_risk = p.get("normalizedRisk", 50)
            assert isinstance(normalized_risk, (int, float)) and 0 <= normalized_risk <= 100, \
                f"normalizedRisk must be 0-100 integer, got {normalized_risk}"
            
            blocking_rows.append({
                "patent": p.get("patent", "Unknown"),
                "patentUrl": p.get("sourceUrl", ""),
                "title": p.get("title", "")[:50] + "..." if len(p.get("title", "")) > 50 else p.get("title", "Unknown"),
                "status": p.get("status", "Blocking"),
                "claimType": p.get("claimType", "Unknown"),
                "expiry": p.get("expectedExpiry", p.get("expiry", "Unknown")),
                "normalizedRisk": int(normalized_risk),  # 0-100 integer
                "riskBand": p.get("riskBand", "HIGH"),
                "reason": p.get("reason", "Blocks intended use"),
            })
        
        viz.append(
            build_table(
                id="blocking_patents",
                title="Blocking Patents",
                columns=[
                    {"key": "patent", "label": "Patent Number"},
                    {"key": "claimType", "label": "Claim Type"},
                    {"key": "expiry", "label": "Expiry Date"},
                    {"key": "normalizedRisk", "label": "Risk (0-100)"},
                    {"key": "riskBand", "label": "Risk Band"},
                    {"key": "reason", "label": "Reason"},
                ],
                rows=blocking_rows,
                description="Patents that may block freedom to operate",
            )
        )

    # ----- Claim Type Distribution (if blocking patents exist) -----
    if blocking_patents:
        claim_types = {}
        for p in blocking_patents:
            ct = p.get("claimType", "Unknown")
            claim_types[ct] = claim_types.get(ct, 0) + 1
        
        if claim_types:
            viz.append(
                build_pie_chart(
                    id="claim_types",
                    title="Blocking Patent Claim Types",
                    items=claim_types,
                    description="Distribution of claim types among blocking patents",
                )
            )

    # ----- Non-Blocking Patents Table (if any) -----
    if non_blocking_patents:
        non_blocking_rows = []
        for p in non_blocking_patents:
            non_blocking_rows.append({
                "patent": p.get("patent", "Unknown"),
                "patentUrl": p.get("sourceUrl", ""),
                "claimType": p.get("claimType", "Unknown"),
                "reason": p.get("reason", "Does not block intended use"),
                "expiry": p.get("expectedExpiry", p.get("expiry", "Unknown")),
            })
        
        viz.append(
            build_table(
                id="non_blocking_patents",
                title="Non-Blocking Patents",
                columns=[
                    {"key": "patent", "label": "Patent Number"},
                    {"key": "claimType", "label": "Claim Type"},
                    {"key": "expiry", "label": "Expiry Date"},
                    {"key": "reason", "label": "Reason"},
                ],
                rows=non_blocking_rows,
                description="Patents analyzed but found not to block the intended use",
            )
        )

    # ----- Recommended Actions Table (Enhanced with feasibility) -----
    if recommended_actions:
        action_rows = []
        for i, action in enumerate(recommended_actions):
            if isinstance(action, dict):
                action_rows.append({
                    "priority": i + 1,
                    "action": action.get("action", "Unknown"),
                    "rationale": action.get("rationale", "")[:100] + "..." if len(action.get("rationale", "")) > 100 else action.get("rationale", ""),
                    "feasibility": action.get("feasibility", "MEDIUM"),
                    "nextSteps": ", ".join(action.get("nextSteps", [])[:2]) if action.get("nextSteps") else "",
                })
            else:
                # Legacy string format
                action_rows.append({
                    "priority": i + 1,
                    "action": str(action),
                    "rationale": "",
                    "feasibility": "MEDIUM",
                    "nextSteps": "",
                })
        
        viz.append(
            build_table(
                id="recommended_actions",
                title="Recommended Actions",
                columns=[
                    {"key": "priority", "label": "#"},
                    {"key": "action", "label": "Action"},
                    {"key": "feasibility", "label": "Feasibility"},
                    {"key": "rationale", "label": "Rationale"},
                    {"key": "nextSteps", "label": "Next Steps"},
                ],
                rows=action_rows,
                description="Prioritized list of recommended next steps with feasibility ratings",
            )
        )

    # ----- Expired Patents Table (if any) -----
    if expired_patents:
        expired_rows = []
        for p in expired_patents:
            if isinstance(p, dict):
                expired_rows.append({
                    "patent": p.get("patent", "Unknown"),
                    "expiry": p.get("expectedExpiry", "Expired"),
                })
            else:
                expired_rows.append({"patent": str(p), "expiry": "Expired"})
        
        viz.append(
            build_table(
                id="expired_patents",
                title="Expired Patents",
                columns=[
                    {"key": "patent", "label": "Patent Number"},
                    {"key": "expiry", "label": "Expiry Date"},
                ],
                rows=expired_rows,
                description="Patents that have already expired",
            )
        )

    return viz


def build_exim_visualizations(payload: dict) -> List[dict]:
    """Create a standard set of visualizations from the EXIM agent payload."""
    viz: List[dict] = []
    
    if not payload:
        return viz
    
    input_data = payload.get("input", {})
    trade_data = payload.get("trade_data", {})
    analysis = payload.get("analysis", {})
    llm_insights = payload.get("llm_insights", {})
    
    summary = analysis.get("summary", {})
    top_partners = analysis.get("top_partners", [])
    rows = trade_data.get("rows", [])
    
    product = input_data.get("product", "Pharmaceutical")
    trade_type = input_data.get("trade_type", "export").title()
    year = input_data.get("year", "2024-25")
    hs_code = input_data.get("hs_code", "")
    data_source = payload.get("data_source", "Trade API")
    
    # Add summary description as text if available
    if llm_insights.get("summary_description"):
        viz.append({
            "id": "exim_summary",
            "vizType": "text",
            "title": f"Trade Intelligence Summary - {product.title()}",
            "description": llm_insights.get("summary_description"),
            "data": {"content": llm_insights.get("summary_description")},
        })
    
    # 1. Top Trading Partners Bar Chart
    if top_partners:
        partner_data = [
            {"partner": p.get("name", "Unknown")[:20], "value": p.get("current_value", 0)}
            for p in top_partners[:10]  # Top 10
        ]
        description = f"Trade values in USD Million for HS Code: {hs_code}"
        if llm_insights.get("trade_volume_description"):
            description += f"\n\n{llm_insights.get('trade_volume_description')}"
        viz.append(
            build_bar_chart(
                id="top_trading_partners",
                title=f"Top {trade_type} Partners for {product.title()} ({year})",
                description=description,
                items=partner_data,
                x_field="partner",
                y_field="value",
                orientation="horizontal",
            )
        )
    
    # 2. Growth Distribution Pie Chart
    if top_partners:
        # Categorize partners by growth
        positive_growth = sum(1 for p in top_partners if p.get("growth", 0) > 0)
        negative_growth = sum(1 for p in top_partners if p.get("growth", 0) < 0)
        stable = len(top_partners) - positive_growth - negative_growth
        
        growth_dist = [
            {"label": "Positive Growth", "value": positive_growth},
            {"label": "Negative Growth", "value": negative_growth},
            {"label": "Stable", "value": stable},
        ]
        viz.append(
            build_pie_chart(
                id="growth_distribution",
                title=f"{trade_type} Growth Distribution by Partner",
                description="Number of trading partners by growth category",
                items=growth_dist,
            )
        )
    
    # 3. Trade Data Table
    if rows:
        # Determine columns based on available data
        columns = []
        sample_row = rows[0] if rows else {}
        
        # Standard columns for EXIM data
        possible_columns = [
            {"key": "Country", "label": "Country"},
            {"key": "Commodity", "label": "Commodity"},
            {"key": "2023 - 2024", "label": "2023-24 (USD Mn)"},
            {"key": "2024 - 2025", "label": "2024-25 (USD Mn)"},
            {"key": "%Share", "label": "Market Share %"},
            {"key": "%Growth", "label": "YoY Growth %"},
        ]
        
        for col in possible_columns:
            if col["key"] in sample_row:
                columns.append(col)
        
        # If no standard columns found, use all keys
        if not columns:
            columns = [{"key": k, "label": k} for k in sample_row.keys() if k not in ['S.No.', 'HSCode']]
        
        viz.append(
            build_table(
                id="trade_data_table",
                title=f"{trade_type} Trade Data - {product.title()}",
                description=f"Detailed trade statistics for HS Code: {hs_code}. Data source: {data_source}",
                columns=columns,
                rows=rows[:20],  # Top 20 records
                page_size=15,
            )
        )
    
    # 4. Summary Metric Cards
    if summary:
        # Total Current Year Value
        total_current = summary.get("total_current_year", 0)
        if total_current:
            viz.append(
                build_metric_card(
                    id="total_trade_value",
                    title=f"Total {trade_type} Value ({year})",
                    value=round(total_current, 2),
                    unit="USD Mn",
                )
            )
        
        # Overall Growth
        overall_growth = summary.get("overall_growth", 0)
        if overall_growth is not None:
            viz.append(
                build_metric_card(
                    id="overall_growth",
                    title="Year-over-Year Growth",
                    value=round(overall_growth, 2),
                    unit="%",
                    delta=overall_growth,
                )
            )
        
        # Top Partners Count
        partners_count = summary.get("top_partners_count", 0)
        if partners_count:
            viz.append(
                build_metric_card(
                    id="partners_count",
                    title="Trading Partners Analyzed",
                    value=partners_count,
                )
            )
    
    # 5. Market Share Distribution (Top 5 vs Others)
    if top_partners:
        top_5_share = sum(p.get("share", 0) for p in top_partners[:5])
        others_share = 100 - top_5_share if top_5_share < 100 else 0
        
        share_data = [
            {"label": p.get("name", "Unknown")[:15], "value": p.get("share", 0)}
            for p in top_partners[:5]
        ]
        if others_share > 0:
            share_data.append({"label": "Others", "value": round(others_share, 2)})
        
        viz.append(
            build_pie_chart(
                id="market_share_distribution",
                title=f"Market Share Distribution - {trade_type}",
                description=f"Share of total {trade_type.lower()}s by top trading partners",
                items=share_data,
            )
        )
    
    # 6. Sourcing Insights (from LLM data)
    sourcing = llm_insights.get("sourcing_insights", {})
    if sourcing:
        primary_sources = sourcing.get("primary_sources", [])
        if primary_sources:
            # Sourcing table
            sourcing_rows = []
            for src in primary_sources:
                sourcing_rows.append({
                    "country": src.get("country", "Unknown"),
                    "share": f"{src.get('share_percent', 0)}%",
                    "quality": src.get("quality_rating", "Medium"),
                    "risk": src.get("risk_level", "Medium"),
                })
            
            viz.append(
                build_table(
                    id="sourcing_insights_table",
                    title="Sourcing Insights - Primary Supply Sources",
                    description=sourcing.get("description", "Analysis of primary supply sources and their risk profiles"),
                    columns=[
                        {"key": "country", "label": "Country"},
                        {"key": "share", "label": "Market Share"},
                        {"key": "quality", "label": "Quality Rating"},
                        {"key": "risk", "label": "Risk Level"},
                    ],
                    rows=sourcing_rows,
                    page_size=10,
                )
            )
        
        # Supply concentration metric
        hhi = sourcing.get("hhi_index", 0)
        if hhi:
            viz.append(
                build_metric_card(
                    id="hhi_index",
                    title="Supply Concentration (HHI Index)",
                    value=round(hhi, 0),
                    unit="",
                )
            )
        
        # Diversification recommendation as text
        if sourcing.get("diversification_recommendation"):
            viz.append({
                "id": "sourcing_recommendation",
                "vizType": "text",
                "title": "Sourcing Strategy Recommendation",
                "description": sourcing.get("diversification_recommendation"),
                "data": {"content": sourcing.get("diversification_recommendation")},
            })
    
    # 7. Import Dependency Analysis (from LLM data)
    dependency = llm_insights.get("import_dependency", {})
    if dependency:
        critical_deps = dependency.get("critical_dependencies", [])
        if critical_deps:
            # Dependency table
            dep_rows = []
            for dep in critical_deps:
                alternatives = dep.get("alternative_sources", [])
                alt_str = ", ".join(alternatives[:3]) if alternatives else "Limited options"
                dep_rows.append({
                    "country": dep.get("country", "Unknown"),
                    "import_share": f"{dep.get('import_share', 0)}%",
                    "risk": dep.get("risk", "Medium"),
                    "alternatives": alt_str,
                })
            
            viz.append(
                build_table(
                    id="import_dependency_table",
                    title="Import Dependency Analysis",
                    description=dependency.get("description", "Critical import dependencies and supply chain risk assessment"),
                    columns=[
                        {"key": "country", "label": "Country"},
                        {"key": "import_share", "label": "Import Share"},
                        {"key": "risk", "label": "Risk Level"},
                        {"key": "alternatives", "label": "Alternative Sources"},
                    ],
                    rows=dep_rows,
                    page_size=10,
                )
            )
        
        # Dependency ratio metric
        dep_ratio = dependency.get("dependency_ratio", 0)
        if dep_ratio:
            viz.append(
                build_metric_card(
                    id="dependency_ratio",
                    title="Import Dependency Ratio",
                    value=round(dep_ratio, 1),
                    unit="%",
                )
            )
        
        # Risk assessment and recommendations as text
        if dependency.get("risk_assessment"):
            viz.append({
                "id": "risk_assessment",
                "vizType": "text",
                "title": "Supply Chain Risk Assessment",
                "description": dependency.get("risk_assessment"),
                "data": {"content": dependency.get("risk_assessment")},
            })
        
        recommendations = dependency.get("recommendations", [])
        if recommendations:
            rec_text = "\n".join([f"• {rec}" for rec in recommendations])
            viz.append({
                "id": "strategic_recommendations",
                "vizType": "text",
                "title": "Strategic Recommendations",
                "description": rec_text,
                "data": {"content": rec_text},
            })
    
    return viz
