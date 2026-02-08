#!/usr/bin/env python3
import json, glob, os

debug_dir = os.path.join(os.path.dirname(__file__), 'backend', 'debug_reports')

# Check multiple drugs for patent data
for pattern in ['*semaglutide*', '*atezolizumab*', '*Doxorubicin*']:
    files = sorted(glob.glob(os.path.join(debug_dir, f'report_data_{pattern}.json')))
    if not files:
        continue
    f = files[-1]  # latest
    with open(f) as fh:
        data = json.load(fh)
    drug = data.get('drug_name', '?')
    patent = data.get('agents_data', {}).get('patent', {})
    if not patent:
        print(f"No patent data for {drug}")
        continue
    
    print(f"\n{'='*60}")
    print(f"DRUG: {drug}")
    print(f"PATENT KEYS: {list(patent.keys())}")
    print(f"ftoStatus: {patent.get('ftoStatus')}")
    print(f"patentsFound: {patent.get('patentsFound')}")
    print(f"normalizedRiskInternal: {patent.get('normalizedRiskInternal')}")
    print(f"ftoDate: {patent.get('ftoDate')}")
    print(f"disclaimer: {str(patent.get('disclaimer',''))[:100]}")
    
    bps = patent.get('blockingPatentsSummary', {})
    print(f"blockingPatentsSummary: {json.dumps(bps)}")
    
    bp = patent.get('blockingPatents', [])
    print(f"blockingPatents: count={len(bp)}")
    for i, p in enumerate(bp[:2]):
        print(f"  [{i}] keys={list(p.keys())}")
        print(f"      patentNumber={p.get('patentNumber')}")
        print(f"      title={str(p.get('title',''))[:100]}")
        print(f"      expiryDate={p.get('expiryDate')}")
        print(f"      claimType={p.get('claimType')}")
        print(f"      riskLevel={p.get('riskLevel')}")
        print(f"      jurisdiction={p.get('jurisdiction')}")
    
    ra = patent.get('recommendedActions', [])
    print(f"recommendedActions: count={len(ra)}")
    for i, a in enumerate(ra[:3]):
        print(f"  [{i}] {json.dumps(a)[:200]}")
    
    sl = patent.get('summaryLayers', {})
    print(f"summaryLayers:")
    for k, v in sl.items():
        print(f"  {k}: {str(v)[:200]}")
    
    er = patent.get('expandedResults', {})
    print(f"expandedResults:")
    for k, v in er.items():
        print(f"  {k}: count={len(v)}")
        if v:
            print(f"    first keys: {list(v[0].keys())}")
            print(f"    first: {json.dumps(v[0])[:300]}")
    
    cw = patent.get('continuationWarnings', [])
    print(f"continuationWarnings: count={len(cw)}")
    if cw:
        print(f"  first: {json.dumps(cw[0])[:200]}")
    
    print()
