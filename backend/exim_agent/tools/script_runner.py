import subprocess
from crewai.tools import tool

@tool("run_python_script")
def run_python_script(script_path: str) -> str:
    """
    Executes a Python script on the local system.
    Input should be the absolute or relative path of the script.
    """
    try:
        result = subprocess.run(
            ["python", script_path],
            capture_output=True,
            text=True,
            timeout=120
        )

        if result.returncode != 0:
            return f"❌ Script failed:\n{result.stderr}"

        return f"✅ Script executed successfully:\n{result.stdout}"

    except Exception as e:
        return f"🔥 Execution error: {str(e)}"



