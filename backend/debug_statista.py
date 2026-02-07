"""Debug script to see raw Statista API response."""

import json
from app.apis.iqvia_api import fetch_statista_search


def debug_statista():
    print("=" * 60)
    print("Debugging Statista API Response")
    print("=" * 60)

    # Test with different queries
    queries = [
        ("breast cancer", "infographics"),
        ("pharmaceutical", "infographics"),
        ("oncology", "infographics"),
        ("cancer", None),  # No content type filter
    ]

    for query, content_type in queries:
        print(f"\n--- Query: '{query}', Content Type Filter: '{content_type}' ---")

        try:
            raw = fetch_statista_search(
                query=query, content_type=content_type, page=1, sort="relevance"
            )

            data = json.loads(raw)
            results = data.get("searchResponse", {}).get("results", [])

            print(f"Total results: {len(results)}")

            # Count by content type
            content_types = {}
            for item in results:
                ct = item.get("contentType", "unknown")
                premium = item.get("premium", True)
                key = f"{ct} (premium={premium})"
                content_types[key] = content_types.get(key, 0) + 1

            print("Content types breakdown:")
            for ct, count in sorted(content_types.items()):
                print(f"  {ct}: {count}")

            # Show first few items
            print("\nFirst 3 items:")
            for i, item in enumerate(results[:3]):
                print(
                    f"  {i + 1}. Type: {item.get('contentType')}, Premium: {item.get('premium')}"
                )
                print(f"      Title: {item.get('title', 'N/A')[:60]}")
                print(f"      ContentId: {item.get('contentId', 'N/A')}")

        except Exception as e:
            print(f"Error: {e}")


if __name__ == "__main__":
    debug_statista()
