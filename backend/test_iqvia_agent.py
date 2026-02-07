"""Test the full IQVIA agent flow."""

from app.agents.iqvia_agent.iqvia_agent import run_iqvia_agent
import json


def test_full_iqvia_agent():
    print("=" * 60)
    print("Testing Full IQVIA Agent")
    print("=" * 60)

    result = run_iqvia_agent("give me market analysis of breast cancer")

    print(f"\nStatus: {result.get('status')}")

    if result.get("status") == "success":
        data = result.get("data", {})
        infographics = data.get("infographics", [])
        visualizations = result.get("visualizations", [])

        print(f"\nInfographics count: {len(infographics)}")
        print(f"Visualizations count: {len(visualizations)}")

        if infographics:
            print("\nInfographics found:")
            for i, info in enumerate(infographics[:3]):
                print(f"  {i + 1}. {info.get('title', 'N/A')[:50]}")
                print(f"      Image URL: {info.get('content', 'N/A')[:60]}...")

        if visualizations:
            print("\nVisualizations generated:")
            for viz in visualizations[:5]:
                print(f"  - {viz.get('vizType')}: {viz.get('title', 'N/A')[:40]}")
    else:
        print(f"Error: {result.get('message')}")

    return result


if __name__ == "__main__":
    test_full_iqvia_agent()
