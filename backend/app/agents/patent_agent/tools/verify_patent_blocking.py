"""
Tool 2: Patent Verification & Blocking Analysis

Scrapes Google Patents to verify if a patent blocks a drug-disease use case.
Uses LLM for claim interpretation with strict governance rules.
"""

from crewai.tools import tool
from crewai import LLM
import requests
import re
import json
from typing import Dict, Any, Optional
from datetime import datetime

# Google Patents URL template
GOOGLE_PATENTS_URL = "https://patents.google.com/patent/{patent_number}"

# Headers for Google Patents scraping
SCRAPE_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
}

# LLM initialized lazily to avoid import-time errors
_claim_llm = None

def _get_claim_llm():
    """Lazy initialization of LLM for claim analysis."""
    global _claim_llm
    if _claim_llm is None:
        _claim_llm = LLM(model="groq/llama-3.3-70b-versatile", temperature=0.2, max_tokens=800)
    return _claim_llm

# Claim type to blocking severity mapping
SEVERITY_MAP = {
    "COMPOSITION": "ABSOLUTE",
    "METHOD_OF_TREATMENT": "STRONG", 
    "FORMULATION": "WEAK",
    "PROCESS": "WEAK",
    "OTHER": "WEAK",
}


def _scrape_google_patent(patent_number: str) -> Dict[str, Any]:
    """
    Scrape patent data from Google Patents.
    
    Extracts:
    - Title
    - Assignee (Current Assignee)
    - Expected expiry (with fallback calculation)
    - Claims text (independent claim 1)
    - CPC codes
    - Family/continuation info
    - Jurisdiction
    
    CRITICAL: expectedExpiry must NEVER be null for active patents.
    If scraping fails, compute fallback: filing_date + 20 years
    """
    # Normalize patent number for URL
    clean_num = patent_number.upper().replace(" ", "").replace("-", "")
    if not clean_num.startswith("US"):
        clean_num = f"US{clean_num}"
    
    url = GOOGLE_PATENTS_URL.format(patent_number=clean_num)
    
    try:
        resp = requests.get(url, headers=SCRAPE_HEADERS, timeout=20)
        resp.raise_for_status()
        html = resp.text
        
        result = {
            "patentNumber": clean_num,
            "url": url,
            "scraped": True,
        }
        
        # Extract title from <meta name="DC.title">
        title_match = re.search(r'<meta name="DC\.title" content="([^"]+)"', html)
        result["title"] = title_match.group(1) if title_match else ""
        
        # Extract assignee - look for "Current Assignee" section
        assignee_match = re.search(
            r'Current Assignee.*?<dd[^>]*>([^<]+)</dd>',
            html, re.DOTALL | re.IGNORECASE
        )
        if assignee_match:
            result["assignee"] = assignee_match.group(1).strip()
        else:
            # Fallback: look for assignee meta tag
            assignee_meta = re.search(r'<meta name="DC\.contributor" content="([^"]+)"', html)
            result["assignee"] = assignee_meta.group(1) if assignee_meta else "Unknown"
        
        # ====================================================================
        # EXPIRY EXTRACTION - CRITICAL SECTION
        # ====================================================================
        # Google Patents uses both "Expected expiration" and "Anticipated expiration"
        # HTML structure: <time datetime="YYYY-MM-DD">YYYY-MM-DD</time> followed by <span>Anticipated expiration</span>
        # CRITICAL: The time tag comes BEFORE the label, but may have other tags in between
        expiry_date = None
        expiry_confidence = "HIGH"
        expiry_source = "scraped"
        
        # Pattern 1: Find "Anticipated expiration" or "Expected expiration" label first,
        # then look BACKWARDS for the nearest <time> tag (robust approach)
        expiry_label_pos = -1
        for label in ["Anticipated expiration", "Expected expiration"]:
            pos = html.find(label)
            if pos != -1:
                expiry_label_pos = pos
                break
        
        if expiry_label_pos != -1:
            # Look backwards up to 300 chars for <time datetime="YYYY-MM-DD">
            search_start = max(0, expiry_label_pos - 300)
            snippet = html[search_start:expiry_label_pos]
            time_match = re.search(r'<time[^>]*datetime="(\d{4}-\d{2}-\d{2})"', snippet)
            if time_match:
                expiry_date = time_match.group(1)
                expiry_confidence = "HIGH"
                expiry_source = "scraped"
        
        # Pattern 2: Fallback - search forward from expiration label (old format)
        if not expiry_date:
            expiry_match = re.search(
                r'(Expected expiration|Anticipated expiration)[^0-9]{0,100}(\d{4}-\d{2}-\d{2})',
                html, re.IGNORECASE
            )
            if expiry_match:
                expiry_date = expiry_match.group(2)
                expiry_confidence = "MEDIUM"
                expiry_source = "scraped"
        
        # ====================================================================
        # FALLBACK EXPIRY CALCULATION - NEVER RETURN NULL
        # ====================================================================
        # If scraping failed, compute expiry from filing/priority date
        # Standard patent term: priority_date + 20 years (35 U.S.C. § 154)
        if not expiry_date:
            # Extract filing date from meta tags or HTML
            filing_date = None
            
            # Try <meta name="DC.date"> first (publication date)
            date_meta = re.search(r'<meta name="DC\.date" content="(\d{4}-\d{2}-\d{2})"', html)
            if date_meta:
                filing_date = date_meta.group(1)
            
            # Try priority date from priority claims section
            if not filing_date:
                priority_match = re.search(
                    r'priority[^0-9]{0,100}(\d{4}-\d{2}-\d{2})',
                    html, re.IGNORECASE
                )
                if priority_match:
                    filing_date = priority_match.group(1)
            
            # Try application filing date
            if not filing_date:
                filing_match = re.search(
                    r'filing[^0-9]{0,100}(\d{4}-\d{2}-\d{2})',
                    html, re.IGNORECASE
                )
                if filing_match:
                    filing_date = filing_match.group(1)
            
            # Compute expiry: filing_date + 20 years
            if filing_date:
                try:
                    filing_dt = datetime.strptime(filing_date, "%Y-%m-%d")
                    # Add 20 years to get expiry (standard utility patent term)
                    expiry_dt = filing_dt.replace(year=filing_dt.year + 20)
                    expiry_date = expiry_dt.strftime("%Y-%m-%d")
                    expiry_confidence = "LOW"
                    expiry_source = "computed_from_filing_date"
                except Exception as e:
                    # If computation fails, use a very distant date with warning
                    expiry_date = "2099-12-31"
                    expiry_confidence = "VERY_LOW"
                    expiry_source = "fallback_default"
        
        # Store expiry results
        result["expectedExpiry"] = expiry_date
        result["expiryConfidence"] = expiry_confidence
        result["expirySource"] = expiry_source
        
        # If still no expiry found, add warning but don't set to null
        if not expiry_date or expiry_confidence == "VERY_LOW":
            result["expiryWarning"] = "Could not reliably extract or compute expiry date"
        
        # Extract claims - look for claims section
        claims_match = re.search(
            r'<section itemprop="claims"[^>]*>(.*?)</section>',
            html, re.DOTALL
        )
        if claims_match:
            claims_html = claims_match.group(1)
            # Get first/independent claim
            claim1_match = re.search(
                r'<div[^>]*class="claim"[^>]*>(.*?)</div>',
                claims_html, re.DOTALL
            )
            if claim1_match:
                claim_text = re.sub(r'<[^>]+>', ' ', claim1_match.group(1))
                claim_text = re.sub(r'\s+', ' ', claim_text).strip()
                result["claim1"] = claim_text[:2000]  # Limit length
            else:
                result["claim1"] = None
        else:
            result["claim1"] = None
        
        # Extract CPC codes
        cpc_matches = re.findall(r'<meta scheme="cpc" content="([^"]+)"', html)
        result["cpcCodes"] = list(set(cpc_matches)) if cpc_matches else []
        
        # Detect continuations/family - look for "Family" or continuation mentions
        has_family = bool(re.search(
            r'(Family|Continuation|Divisional|Parent Application)',
            html, re.IGNORECASE
        ))
        result["hasContinuations"] = has_family
        
        # Extract jurisdiction from patent number
        if clean_num.startswith("US"):
            result["jurisdiction"] = "US"
        elif clean_num.startswith("EP"):
            result["jurisdiction"] = "EP"
        elif clean_num.startswith("WO"):
            result["jurisdiction"] = "WO"
        else:
            result["jurisdiction"] = "UNKNOWN"
        
        # Check if patent is expired based on expiry date
        if result.get("expectedExpiry"):
            try:
                expiry_dt = datetime.strptime(result["expectedExpiry"][:10], "%Y-%m-%d")
                result["isExpired"] = expiry_dt < datetime.now()
            except:
                result["isExpired"] = None
        else:
            result["isExpired"] = None
        
        return result
        
    except requests.exceptions.RequestException as e:
        return {
            "patentNumber": patent_number,
            "scraped": False,
            "error": f"Failed to fetch Google Patents: {str(e)}",
        }
    except Exception as e:
        return {
            "patentNumber": patent_number,
            "scraped": False,
            "error": f"Scraping error: {str(e)}",
        }


def _analyze_claim_with_llm(
    claim_text: str,
    drug: str,
    disease: str
) -> Dict[str, Any]:
    """
    Use LLM to analyze if claim blocks the drug-disease use.
    
    LLM Governance Rules:
    - Temperature ≤ 0.2 (deterministic)
    - Must quote claim language as evidence
    - Return UNCERTAIN if ambiguous
    - Only reason over provided claim text
    """
    if not claim_text:
        return {
            "claimType": "UNKNOWN",
            "blocksUse": None,
            "confidence": "LOW",
            "reasoning": "No claim text available for analysis",
        }
    
    prompt = f"""You are a patent claim analyst. Analyze the following patent claim to determine if it blocks the use of a specific drug for a specific disease.

DRUG: {drug}
DISEASE: {disease}

CLAIM TEXT:
{claim_text[:1500]}

INSTRUCTIONS:
1. Classify the claim type as ONE of: COMPOSITION, METHOD_OF_TREATMENT, FORMULATION, PROCESS, OTHER
2. Determine if this claim explicitly covers using "{drug}" for treating "{disease}"
3. If the claim language is ambiguous, return "UNCERTAIN" for blocksUse
4. Quote the specific claim language that supports your determination

Return ONLY valid JSON (no markdown, no explanation outside JSON):
{{
    "claimType": "COMPOSITION|METHOD_OF_TREATMENT|FORMULATION|PROCESS|OTHER",
    "blocksUse": true|false|null,
    "confidence": "HIGH|MEDIUM|LOW",
    "reasoning": "Brief explanation with quoted claim language"
}}"""

    try:
        response = _get_claim_llm().call(messages=[{"role": "user", "content": prompt}])
        
        # Parse JSON from response
        json_match = re.search(r'\{[^{}]*\}', response, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
            # Validate required fields
            if "claimType" not in result:
                result["claimType"] = "OTHER"
            if "blocksUse" not in result:
                result["blocksUse"] = None
            if "confidence" not in result:
                result["confidence"] = "LOW"
            return result
        else:
            return {
                "claimType": "OTHER",
                "blocksUse": None,
                "confidence": "LOW",
                "reasoning": "Failed to parse LLM response",
            }
    except Exception as e:
        return {
            "claimType": "OTHER",
            "blocksUse": None,
            "confidence": "LOW",
            "reasoning": f"LLM analysis failed: {str(e)}",
        }


@tool("verify_patent_blocking")
def verify_patent_blocking(
    patent_number: str,
    drug: str,
    disease: str,
    jurisdiction: str = "US"
) -> Dict[str, Any]:
    """
    Verify if a patent blocks a specific drug-disease use case.
    
    Scrapes Google Patents for claims, expiry, and assignee, then uses
    LLM to classify claim type and determine blocking status.
    
    Args:
        patent_number: Patent to verify (e.g., "US11723898")
        drug: Target drug name
        disease: Target disease/indication
        jurisdiction: Jurisdiction filter (default "US")
    
    Returns:
        Verification result with:
        - patent: Patent number
        - assignee: Current patent owner
        - expectedExpiry: Expiry date from Google Patents
        - claimType: COMPOSITION, METHOD_OF_TREATMENT, etc.
        - blocksUse: true/false/null
        - blockingSeverity: ABSOLUTE/STRONG/WEAK
        - confidence: HIGH/MEDIUM/LOW
        - hasContinuations: Boolean flag for patent family
        - evidence: Claim excerpt and reasoning
    """
    # Step 1: Scrape Google Patents
    scraped = _scrape_google_patent(patent_number)
    
    if not scraped.get("scraped"):
        return {
            "patent": patent_number,
            "error": scraped.get("error", "Scraping failed"),
            "blocksUse": None,
            "confidence": "LOW",
            "requiresManualReview": True,
        }
    
    # Step 2: Check jurisdiction filter
    if scraped.get("jurisdiction") != jurisdiction and jurisdiction != "ALL":
        return {
            "patent": patent_number,
            "assignee": scraped.get("assignee"),
            "expectedExpiry": scraped.get("expectedExpiry"),
            "jurisdiction": scraped.get("jurisdiction"),
            "skipped": True,
            "reason": f"Patent jurisdiction {scraped.get('jurisdiction')} does not match filter {jurisdiction}",
            "blocksUse": False,
            "confidence": "HIGH",
        }
    
    # Step 3: Check if already expired
    if scraped.get("isExpired"):
        return {
            "patent": patent_number,
            "assignee": scraped.get("assignee"),
            "expectedExpiry": scraped.get("expectedExpiry"),
            "jurisdiction": scraped.get("jurisdiction"),
            "claimType": "N/A",
            "blocksUse": False,
            "blockingSeverity": "NONE",
            "confidence": "HIGH",
            "status": "EXPIRED",
            "hasContinuations": scraped.get("hasContinuations", False),
            "evidence": {"note": "Patent has expired"},
        }
    
    # Step 4: Analyze claim with LLM
    claim_analysis = _analyze_claim_with_llm(
        scraped.get("claim1"),
        drug,
        disease
    )
    
    # Step 5: Determine blocking severity
    claim_type = claim_analysis.get("claimType", "OTHER")
    blocking_severity = SEVERITY_MAP.get(claim_type, "WEAK")
    
    # Step 6: Build final result
    result = {
        "patent": patent_number,
        "url": scraped.get("url"),
        "title": scraped.get("title"),
        "assignee": scraped.get("assignee", "Unknown"),
        "expectedExpiry": scraped.get("expectedExpiry"),
        "expiryConfidence": scraped.get("expiryConfidence", "MEDIUM"),
        "expirySource": scraped.get("expirySource", "unknown"),
        "isExpired": scraped.get("isExpired", False),
        "jurisdiction": scraped.get("jurisdiction", "US"),
        "claimType": claim_type,
        "blocksUse": claim_analysis.get("blocksUse"),
        "blockingSeverity": blocking_severity if claim_analysis.get("blocksUse") else "NONE",
        "confidence": claim_analysis.get("confidence", "LOW"),
        "hasContinuations": scraped.get("hasContinuations", False),
        "cpcCodes": scraped.get("cpcCodes", []),
        "evidence": {
            "claimExcerpt": (scraped.get("claim1") or "")[:500],
            "reasoning": claim_analysis.get("reasoning", ""),
        },
    }
    
    # Flag if manual review needed
    if claim_analysis.get("blocksUse") is None or claim_analysis.get("confidence") == "LOW":
        result["requiresManualReview"] = True
    
    # Flag if expiry confidence is low (computed vs scraped)
    if scraped.get("expiryConfidence") in ("LOW", "VERY_LOW"):
        result["requiresManualReview"] = True
        result["expiryWarning"] = scraped.get("expiryWarning", "Expiry date computed from filing date, not scraped from Google Patents")
    
    # Add continuation warning
    if scraped.get("hasContinuations"):
        result["continuationWarning"] = "Patent family detected - protection may extend beyond listed expiry"
    
    return result
