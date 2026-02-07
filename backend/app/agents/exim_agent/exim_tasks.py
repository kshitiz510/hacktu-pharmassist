"""
EXIM Trends Agent Task - Comprehensive Trade Analysis
======================================================

This module defines analysis tasks for the EXIM Trends Agent.
"""

from crewai import Task
from .exim_agent import exim_agent


def create_trade_volume_analysis_task(drug_name: str) -> Task:
    """
    Creates a task to analyze trade volume patterns for a specific drug.

    Args:
        drug_name: Name of the drug or API to analyze

    Returns:
        Task configured for trade volume analysis
    """
    return Task(
        description=f"""
        Analyze trade volume patterns for {drug_name} across all sourcing countries.
        
        Tasks to complete:
        1. Use analyze_trade_volumes tool to fetch detailed trade data
        2. Generate trade volume charts showing Q2 vs Q3 2024 comparison
        3. Calculate QoQ growth rates and market expansion trends
        4. Identify the top trading countries by volume
        5. Provide insights on market momentum and growth patterns
        
        Format the output with clear charts and statistics.
        """,
        agent=exim_agent,
        expected_output="""
        Comprehensive trade volume analysis including:
        - Trade volume comparison (Q2 vs Q3 2024)
        - QoQ growth percentages by country
        - Market share distribution
        - Top 3 supplier countries with volumes
        - Overall market momentum and trends
        """,
    )


def create_sourcing_insights_task(drug_name: str) -> Task:
    """
    Creates a task to extract and analyze sourcing insights.

    Args:
        drug_name: Name of the drug or API to analyze

    Returns:
        Task configured for sourcing analysis
    """
    return Task(
        description=f"""
        Extract sourcing insights and supply chain patterns for {drug_name}.
        
        Tasks to complete:
        1. Use extract_sourcing_insights tool to analyze supplier data
        2. Assess supply chain concentration and diversification
        3. Calculate HHI (Herfindahl-Hirschman Index) to measure concentration
        4. Analyze geographic distribution of suppliers
        5. Provide strategic sourcing recommendations
        
        Focus on:
        - Supplier diversity and concentration risks
        - Regional sourcing patterns
        - Supply chain resilience metrics
        - Recommendations for supplier diversification
        """,
        agent=exim_agent,
        expected_output="""
        Detailed sourcing insights including:
        - Primary suppliers and their market share
        - Supply chain concentration level (HHI index)
        - Geographic breakdown by region
        - Top 3 suppliers with market share
        - Strategic recommendations for supplier diversification
        - Risk assessment and mitigation strategies
        """,
    )


def create_import_dependency_task(drug_name: str) -> Task:
    """
    Creates a task to analyze import dependencies and risks.

    Args:
        drug_name: Name of the drug or API to analyze

    Returns:
        Task configured for import dependency analysis
    """
    return Task(
        description=f"""
        Generate import dependency analysis and risk assessment for {drug_name}.
        
        Tasks to complete:
        1. Use generate_import_dependency_tables tool to create detailed tables
        2. Build country-wise import dependency breakdown
        3. Analyze price trends over 2022-2024 period
        4. Assess import concentration risks
        5. Evaluate supply chain resilience
        6. Identify critical risk countries
        
        Create structured tables showing:
        - Import volume by country
        - Import dependency percentages
        - Price trends and volatility
        - Risk classifications
        - Supply chain resilience scores
        """,
        agent=exim_agent,
        expected_output="""
        Comprehensive import dependency analysis including:
        - Import dependency table (country-wise breakdown)
        - Risk classification for each supplier
        - Price trend analysis (2022-2024)
        - Concentration index and overall risk level
        - Supply chain resilience assessment
        - Critical risk countries requiring attention
        - Recommendations for risk mitigation
        """,
    )


def create_comprehensive_exim_analysis_task(drug_name: str) -> Task:
    """
    Creates a comprehensive task combining all EXIM analyses.

    Args:
        drug_name: Name of the drug or API to analyze

    Returns:
        Task configured for comprehensive analysis
    """
    return Task(
        description=f"""
        Perform comprehensive EXIM analysis for {drug_name} combining all perspectives.
        
        Execute these analyses in sequence:
        1. Trade Volume Analysis: Analyze market volumes and growth patterns
        2. Sourcing Insights: Assess supplier diversity and concentration
        3. Import Dependency: Evaluate risks and resilience
        
        Then synthesize all findings to provide:
        - Executive summary with key metrics
        - Trade volume charts with trend analysis
        - Sourcing landscape with top suppliers
        - Import dependency matrix with risk ratings
        - Consolidated strategic recommendations
        
        Focus on actionable insights for sourcing and supply chain decisions.
        """,
        agent=exim_agent,
        expected_output="""
        Complete EXIM Trends Report including:
        
        EXECUTIVE SUMMARY
        - Key metrics and market overview
        
        TRADE VOLUME ANALYSIS
        - Market volumes and growth trends
        - Top suppliers and market concentration
        
        SOURCING INSIGHTS
        - Supplier diversification assessment
        - Geographic sourcing patterns
        - Concentration risks and opportunities
        
        IMPORT DEPENDENCY ANALYSIS
        - Country-wise dependency breakdown
        - Price trends and volatility
        - Supply chain resilience score
        
        STRATEGIC RECOMMENDATIONS
        - Supplier diversification opportunities
        - Risk mitigation strategies
        - Market expansion opportunities
        """,
    )
