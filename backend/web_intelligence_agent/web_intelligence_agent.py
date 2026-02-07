# Web Intelligence Agent

from .tools.fetch_web_intel_data import fetch_web_intel_data

class WebIntelligenceAgent:
    def __init__(self):
        pass

    def fetch_web_intel_data(self, prompt=None):
        """
        Fetches web intelligence data from mockData/web_intel.json using the tool.
        If a prompt is provided, filters the data accordingly.
        """
        return fetch_web_intel_data(prompt)
