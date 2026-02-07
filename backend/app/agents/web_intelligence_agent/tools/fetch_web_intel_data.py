"""Tool: fetch_web_intel_data"""

import json
from pathlib import Path

from app.core.config import MOCK_DATA_DIR


def fetch_web_intel_data(prompt=None):
    """
    Loads and returns web intelligence data from mockData/web_intel.json.
    If a prompt is provided, filters the data for entries containing the prompt (case-insensitive).
    """
    data_path = Path(MOCK_DATA_DIR) / "web_intel.json"
    try:
        with data_path.open("r", encoding="utf-8") as f:
            data = json.load(f)
        if prompt:
            prompt_lower = prompt.lower()

            # Filter entries where any string field contains the prompt
            def matches(entry):
                if isinstance(entry, dict):
                    return any(prompt_lower in str(v).lower() for v in entry.values())
                return prompt_lower in str(entry).lower()

            filtered = [entry for entry in data if matches(entry)]
            return {"status": "success", "data": filtered}
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}
