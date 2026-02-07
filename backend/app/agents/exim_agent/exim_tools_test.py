#!/usr/bin/env python3
"""
Quick test to verify EXIM tools work with dummy data
"""

import sys
import os

# Add backend path
sys.path.insert(
    0, "/Users/guranshchugh/Desktop/PROJECTS/Pharmassist/pharmassist/backend"
)

from .tools.fetch_exim_data import fetch_exim_data
from .tools.analyze_trade_volumes import analyze_trade_volumes
from .tools.extract_sourcing_insights import extract_sourcing_insights
from .tools.generate_import_dependency_tables import generate_import_dependency_tables

print("=" * 70)
print("EXIM AGENT TOOLS - DUMMY DATA VERIFICATION TEST")
print("=" * 70)

drug_name = "semaglutide"

print(f"\n1️⃣ Testing fetch_exim_data('{drug_name}')...")
result1 = fetch_exim_data(drug_name)
if result1.get("error"):
    print(f"   ❌ ERROR: {result1['error']}")
else:
    print(f"   ✅ SUCCESS - Got data for {result1.get('drug_name')}")
    print(f"   Data keys: {list(result1.get('data', {}).keys())}")

print(f"\n2️⃣ Testing analyze_trade_volumes('{drug_name}')...")
result2 = analyze_trade_volumes(drug_name)
if result2.get("status") == "error":
    print(f"   ❌ ERROR: {result2['message']}")
else:
    print(f"   ✅ SUCCESS - Trade volume analysis complete")
    if result2.get("summary"):
        print(f"   Top supplier: {result2['summary'].get('top_supplier_country')}")
        print(f"   Total Q3 volume: {result2['summary'].get('total_q3_volume')}")

print(f"\n3️⃣ Testing extract_sourcing_insights('{drug_name}')...")
result3 = extract_sourcing_insights(drug_name)
if result3.get("status") == "error":
    print(f"   ❌ ERROR: {result3['message']}")
else:
    print(f"   ✅ SUCCESS - Sourcing analysis complete")
    if result3.get("suppliers"):
        print(f"   Top supplier: {result3['suppliers'][0].get('country')}")
        print(f"   HHI Index: {result3['supply_concentration'].get('hhi_index')}")

print(f"\n4️⃣ Testing generate_import_dependency_tables('{drug_name}')...")
result4 = generate_import_dependency_tables(drug_name)
if result4.get("status") == "error":
    print(f"   ❌ ERROR: {result4['message']}")
else:
    print(f"   ✅ SUCCESS - Import dependency analysis complete")
    if result4.get("supply_chain_resilience"):
        print(
            f"   Resilience score: {result4['supply_chain_resilience'].get('resilience_score')}"
        )
        print(
            f"   Overall risk: {result4['import_risk_assessment'].get('overall_risk_level')}"
        )

print("\n" + "=" * 70)
print("TEST COMPLETE")
print("=" * 70)
