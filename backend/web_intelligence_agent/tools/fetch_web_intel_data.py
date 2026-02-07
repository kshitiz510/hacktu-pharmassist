# Tool: fetch_web_intel_data

import json
import os

def fetch_web_intel_data(prompt=None):
    """
    Loads and returns web intelligence data from mockData/web_intel.json.
    If a prompt is provided, filters the data for entries containing the prompt (case-insensitive).
    """
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    data_path = os.path.join(base_dir, 'mockData', 'web_intel.json')
    try:
        with open(data_path, 'r') as f:
            data = json.load(f)
        if prompt:
            prompt_lower = prompt.lower()
            # Filter entries where any string field contains the prompt
            def matches(entry):
                if isinstance(entry, dict):
                    return any(prompt_lower in str(v).lower() for v in entry.values())
                return prompt_lower in str(entry).lower()
            filtered = [entry for entry in data if matches(entry)]
            return {'status': 'success', 'data': filtered}
        return {'status': 'success', 'data': data}
    except Exception as e:
        return {'status': 'error', 'message': str(e)}
