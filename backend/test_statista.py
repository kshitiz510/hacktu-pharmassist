"""Test script for Statista infographics integration."""

from app.agents.iqvia_agent.tools.fetch_statista_infographics import (
    fetch_statista_infographics,
)


def test_breast_cancer():
    print("=" * 60)
    print("Testing: breast cancer market analysis")
    print("=" * 60)

    # Get the actual function from the tool wrapper
    func = getattr(fetch_statista_infographics, "func", fetch_statista_infographics)
    result = func("give me market analysis of breast cancer")

    print(f"\nStatus: {result.get('status')}")
    print(f"Count: {result.get('count', 0)}")
    print(f"Query used: {result.get('query_used')}")
    print(f"Message: {result.get('message', 'N/A')}")

    infographics = result.get("results", [])
    if infographics:
        print(f"\nFound {len(infographics)} infographics:")
        for i, info in enumerate(infographics[:5]):
            print(f"  {i + 1}. {info.get('title', 'No title')[:60]}")
            print(f"      URL: {info.get('content', 'N/A')[:80]}")
            print(f"      Premium: {info.get('premium', 'N/A')}")
    else:
        print("\nNo infographics found.")

    return result


if __name__ == "__main__":
    test_breast_cancer()
