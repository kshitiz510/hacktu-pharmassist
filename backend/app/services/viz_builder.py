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
