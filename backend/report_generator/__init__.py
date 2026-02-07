# Conditional import to avoid dependency issues when only using tools
try:
    from report_generator.report_generator_agent import report_generator_agent
    __all__ = ["report_generator_agent"]
except ImportError:
    # Allow import of tools submodule without agent dependencies
    __all__ = []
