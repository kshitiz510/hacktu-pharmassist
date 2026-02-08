import json, glob, os

debug_dir = "pharmassist/backend/debug_reports"

# Check a couple of reports for patent data structure
for f in sorted(glob.glob(os.path.join(debug_dir, "report_data_*.json")))[:3]:
    with open(f) as fh:
        data = json.load(fh)
    drug = data.get("drug_name", "?")
    patent = data.get("agents_data", {}).get("patent", {})
    if not patent:
        continue
    print(f"\n{'='*60}")
    print(f"FILE: {os.path.basename(f)} ({drug})")
    print(f"PATENT TOP-LEVEL KEYS: {list(patent.keys())}")
    
    for k, v in patent.items():
        if k in ['input', 'query_used', 'suggestedNextPrompts']:
            continue
        if isinstance(v, dict):
            print(f"\n  {k}: (dict) keys={list(v.keys())}")
            for sk, sv in v.items():
                if isinstance(sv, list):
                    print(f"    {sk}: list[{len(sv)}]", end="")
                    if sv:
                        print(f" first={json.dumps(sv[0], indent=None)[:200]}")
                    else:
                        print()
                elif isinstance(sv, dict):
                    print(f"    {sk}: dict keys={list(sv.keys())}")
                else:
                    print(f"    {sk}: {str(sv)[:150]}")
        elif isinstance(v, list):
            print(f"\n  {k}: list[{len(v)}]")
            if v:
                print(f"    first: {json.dumps(v[0], indent=None)[:250]}")
        elif isinstance(v, str):
            print(f"\n  {k}: str = {v[:200]}")
        else:
            print(f"\n  {k}: {type(v).__name__} = {v}")
    # Check two more files with patent data
    pass

# Now check a drug with actual patents
for f in sorted(glob.glob(os.path.join(debug_dir, "report_data_semaglutide*.json")))[:1]:
    with open(f) as fh:
        data = json.load(fh)
    drug = data.get("drug_name", "?")
    patent = data.get("agents_data", {}).get("patent", {})
    if not patent:
        print("No patent data for semaglutide")
        continue
    print(f"\n{'='*60}")
    print(f"FILE: {os.path.basename(f)} ({drug})")
    print(f"PATENT TOP-LEVEL KEYS: {list(patent.keys())}")
    
    for k, v in patent.items():
        if k in ['input', 'query_used', 'suggestedNextPrompts']:
            continue
        if isinstance(v, dict):
            print(f"\n  {k}: (dict) keys={list(v.keys())}")
            for sk, sv in v.items():
                if isinstance(sv, list):
                    print(f"    {sk}: list[{len(sv)}]", end="")
                    if sv:
                        print(f" first={json.dumps(sv[0], indent=None)[:300]}")
                    else:
                        print()
                elif isinstance(sv, dict):
                    print(f"    {sk}: dict keys={list(sv.keys())}")
                else:
                    print(f"    {sk}: {str(sv)[:150]}")
        elif isinstance(v, list):
            print(f"\n  {k}: list[{len(v)}]")
            if v:
                print(f"    first: {json.dumps(v[0], indent=None)[:300]}")
        elif isinstance(v, str):
            print(f"\n  {k}: str = {v[:200]}")
        else:
            print(f"\n  {k}: {type(v).__name__} = {v}")
