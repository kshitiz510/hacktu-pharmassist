# Import tools directly - agent is lazily loaded to avoid LLM initialization issues
from .tools.fetch_exim_data import fetch_exim_data
from .tools.analyze_trade_volumes import analyze_trade_volumes
from .tools.extract_sourcing_insights import extract_sourcing_insights
from .tools.generate_import_dependency_tables import generate_import_dependency_tables

__all__ = [
    "fetch_exim_data",
    "analyze_trade_volumes",
    "extract_sourcing_insights",
    "generate_import_dependency_tables",
]


# Agent is available but not auto-imported to avoid LLM initialization
def get_exim_agent():
    """Lazily load the EXIM agent. Only call this when you have LiteLLM configured."""
    from .exim_agent import exim_agent

    return exim_agent
