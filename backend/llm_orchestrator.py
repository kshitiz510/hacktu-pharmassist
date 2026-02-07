"""
LLM Orchestrator for PharmAssist
This module handles query validation and agent orchestration using direct LLM calls,
avoiding CrewAI's Windows compatibility issues with SIGHUP signal.
"""

import os
import json
import re
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Try to initialize Groq client
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client = None

if GROQ_API_KEY:
    try:
        from groq import Groq
        # Remove quotes if present in env value
        api_key = GROQ_API_KEY.strip('"').strip("'")
        client = Groq(api_key=api_key)
        print(f"[Orchestrator] Groq client initialized (key: {api_key[:10]}...)")
    except Exception as e:
        print(f"[Orchestrator] Failed to initialize Groq client: {e}")
        client = None
else:
    print("[Orchestrator] No GROQ_API_KEY found in environment. Using keyword-based fallback.")


# Keywords for pharmaceutical query validation
PHARMA_KEYWORDS = [
    # Drug/molecule related
    "drug", "molecule", "compound", "api", "active pharmaceutical ingredient",
    "formulation", "dosage", "medicine", "pharmaceutical", "generic", "branded",
    "semaglutide", "ozempic", "wegovy", "metformin", "aspirin", "ibuprofen",
    
    # Market/business related  
    "market", "sales", "revenue", "cagr", "growth", "competition", "competitor",
    "market size", "market share", "forecast", "projection", "iqvia",
    
    # Clinical/regulatory
    "clinical trial", "trial", "phase", "fda", "ema", "regulatory", "approval",
    "indication", "disease", "condition", "patient", "therapy", "treatment",
    "efficacy", "safety", "endpoint", "moa", "mechanism",
    
    # Patent/IP
    "patent", "ip", "intellectual property", "expiry", "fto", "freedom to operate",
    "filing", "claim", "exclusivity",
    
    # Trade/supply chain
    "export", "import", "exim", "trade", "sourcing", "supply chain", "api price",
    
    # Repurposing specific
    "repurpos", "reposition", "new indication", "off-label", "unmet need",
    "pipeline", "development", "lifecycle"
]

# Invalid query patterns (non-pharmaceutical, non-greeting)
INVALID_PATTERNS = [
    r"weather",
    r"what time",
    r"who is",
    r"capital of",
    r"president",
    r"sports",
    r"movie",
    r"recipe",
    r"joke",
]

# Greeting patterns - should be answered friendly
GREETING_PATTERNS = [
    r"^(hello|hi|hey|greetings|good morning|good afternoon|good evening)[\s\!\.\?]*$",
    r"^how are you",
    r"^what('s| is) up",
    r"^thanks|^thank you",
    r"^bye|^goodbye",
]

# Greeting responses
GREETING_RESPONSES = {
    "hello": "Hello! 👋 I'm PharmAssist, your pharmaceutical intelligence assistant. I can help you analyze drug repurposing opportunities, clinical trials, patent landscapes, and market data. What would you like to explore today?",
    "hi": "Hi there! 👋 I'm PharmAssist, ready to help with pharmaceutical analysis. Ask me about drug molecules, clinical trials, patents, or market insights!",
    "hey": "Hey! 👋 Welcome to PharmAssist. I specialize in pharmaceutical drug analysis and repurposing intelligence. How can I assist you?",
    "how are you": "I'm doing great, thank you for asking! 😊 I'm here to help you with pharmaceutical intelligence - drug repurposing analysis, clinical trials, patents, and market data. What can I help you with?",
    "thanks": "You're welcome! 😊 Let me know if you have any more questions about pharmaceutical analysis.",
    "thank you": "You're welcome! 😊 Feel free to ask more about drug repurposing, clinical trials, or market analysis anytime.",
    "bye": "Goodbye! 👋 Feel free to come back whenever you need pharmaceutical intelligence assistance.",
    "goodbye": "Goodbye! 👋 It was great helping you. Come back anytime for pharmaceutical analysis!",
    "default": "Hello! 👋 I'm PharmAssist, your pharmaceutical intelligence assistant. I can help you with:\n\n• Drug repurposing opportunities\n• Clinical trial analysis\n• Patent landscape reviews\n• Market size and competition data\n\nWhat would you like to explore?"
}

# System prompt for the orchestrator
ORCHESTRATOR_SYSTEM_PROMPT = """You are the Master Agent (Conversation Orchestrator) for PharmAssist, an Agentic AI solution for a multinational generic pharmaceutical company.

## COMPANY CONTEXT
The company seeks to diversify beyond the highly competitive, low-margin generics market by:
- Repurposing approved molecules for NEW indications
- Developing alternative dosage forms
- Targeting different patient populations
- Addressing unmet medical needs

## YOUR RESPONSIBILITIES
1. Interpret user queries and validate if they relate to pharmaceutical drug repurposing/innovation
2. Break down valid queries into modular research tasks
3. Delegate tasks to domain-specific Worker Agents
4. Synthesize responses into coherent summaries

## VALID QUERY TOPICS (ACCEPT THESE)
- Drug/molecule repurposing opportunities
- Market analysis for pharmaceutical products
- Clinical trial information for drugs
- Patent landscape and expiry analysis
- Export-import trends for APIs/formulations
- Therapeutic area analysis
- Competitor analysis in pharmaceutical markets
- Unmet medical needs identification
- Drug development pipeline analysis
- Regulatory pathway questions

## INVALID QUERY TOPICS (REJECT THESE)
- General knowledge questions unrelated to pharma
- Personal health advice or diagnosis
- Non-pharmaceutical business queries
- Entertainment, sports, or casual conversation
- Coding/programming questions (unless related to pharma data)

## AVAILABLE WORKER AGENTS
- "iqvia": IQVIA Insights Agent - Market size, sales trends, CAGR, therapy competition, competitor data
- "exim": EXIM Trends Agent - Export-import trade data, API sourcing, trade volumes, import dependency
- "patent": Patent Landscape Agent - Patent filings, expiry timelines, FTO analysis, IP landscape
- "clinical": Clinical Trials Agent - Trial pipeline data, sponsor profiles, trial phases, MoA mapping
- "internal_knowledge": Internal Knowledge Agent - Strategy synthesis, internal research, comparative analysis
- "report_generator": Report Generator Agent - PDF report generation, summary compilation

## RESPONSE FORMAT
You must respond with a JSON object in this exact format:
{
    "is_valid": true/false,
    "rejection_reason": "Reason if invalid, null if valid",
    "agents_to_run": ["agent_id1", "agent_id2"],
    "task_breakdown": "Brief description of what each agent should analyze",
    "drug_name": "Extracted drug name if mentioned, or null",
    "indication": "Extracted indication/disease if mentioned, or 'general'"
}

## AGENT SELECTION LOGIC
- Market size, sales, CAGR, competition analysis → include "iqvia"
- Export-import, trade data, API sourcing → include "exim"
- Patents, IP, expiry, FTO → include "patent"
- Clinical trials, pipeline, sponsors → include "clinical"
- Internal strategy, synthesis, comparison → include "internal_knowledge"
- Always include "report_generator" at the end for comprehensive queries

## EXAMPLES

User: "What are the repurposing opportunities for Semaglutide?"
Response: {"is_valid": true, "rejection_reason": null, "agents_to_run": ["iqvia", "exim", "patent", "clinical", "internal_knowledge", "report_generator"], "task_breakdown": "Analyze market potential, trade data, patent landscape, clinical trials, and synthesize strategic opportunities", "drug_name": "semaglutide", "indication": "general"}

User: "What's the weather like today?"
Response: {"is_valid": false, "rejection_reason": "This query is not related to pharmaceutical drug repurposing or market intelligence. Please ask about drug molecules, market analysis, clinical trials, or patent landscapes.", "agents_to_run": [], "task_breakdown": null, "drug_name": null, "indication": null}

User: "Show me clinical trials for Metformin in NAFLD"
Response: {"is_valid": true, "rejection_reason": null, "agents_to_run": ["clinical", "patent", "iqvia"], "task_breakdown": "Fetch clinical trial data for Metformin in NAFLD, check patent status, and analyze market opportunity", "drug_name": "metformin", "indication": "nafld"}

IMPORTANT: Respond ONLY with the JSON object, no additional text."""


AGENT_TASK_PROMPTS = {
    "iqvia": """Analyze market data for {drug_name} with focus on {indication}:
- Global market size and growth trends
- CAGR projections
- Competitive landscape and market share
- Therapy area dynamics
Return structured data with tables and key metrics.""",

    "exim": """Analyze export-import trends for {drug_name} APIs and formulations:
- Trade volume analysis by country
- Price trends over time
- Import dependency assessment
- Sourcing risk evaluation
Return structured data with charts and trade insights.""",

    "patent": """Analyze patent landscape for {drug_name}:
- Active patent coverage and scope
- Expiry timelines
- Freedom to operate (FTO) assessment
- Competitive filing activity
Return structured data with patent tables and risk flags.""",

    "clinical": """Analyze clinical trial data for {drug_name} in {indication}:
- Active and completed trials
- Trial phase distribution
- Sponsor profiles
- Mechanism of action mapping
Return structured data with trial summaries and sponsor analysis.""",

    "internal_knowledge": """Synthesize internal knowledge for {drug_name} repurposing in {indication}:
- Strategic fit assessment
- Cross-indication comparison
- Internal research findings
- Risk-benefit analysis
Return strategic synthesis with key takeaways.""",

    "report_generator": """Generate comprehensive report for {drug_name} analysis:
- Executive summary
- Key findings from all agents
- Strategic recommendations
- Risk assessment
Return report status and section summaries."""
}


def _keyword_based_validation(user_query: str) -> Dict[str, Any]:
    """
    Fallback validation using keyword matching when LLM is unavailable.
    """
    query_lower = user_query.lower().strip()
    
    # Check for greetings first - these should be answered friendly
    for pattern in GREETING_PATTERNS:
        if re.search(pattern, query_lower):
            print(f"[Orchestrator] Query matched greeting pattern: {pattern}")
            # Find the best matching greeting response
            response_text = GREETING_RESPONSES["default"]
            for key in GREETING_RESPONSES:
                if key in query_lower:
                    response_text = GREETING_RESPONSES[key]
                    break
            return {
                "is_valid": True,
                "is_greeting": True,
                "greeting_response": response_text,
                "rejection_reason": None,
                "agents_to_run": [],
                "task_breakdown": None,
                "drug_name": None,
                "indication": "general"
            }
    
    # Check if query matches any invalid patterns
    for pattern in INVALID_PATTERNS:
        if re.search(pattern, query_lower):
            print(f"[Orchestrator] Query matched invalid pattern: {pattern}")
            return {
                "is_valid": False,
                "is_greeting": False,
                "rejection_reason": "This query doesn't appear to be related to pharmaceutical drug analysis or repurposing. Please ask about drugs, clinical trials, patents, or market analysis.",
                "agents_to_run": [],
                "task_breakdown": None,
                "drug_name": None,
                "indication": "general"
            }
    
    # Check for pharmaceutical keywords
    matched_keywords = [kw for kw in PHARMA_KEYWORDS if kw in query_lower]
    is_pharma = len(matched_keywords) > 0
    
    if is_pharma:
        print(f"[Orchestrator] Keyword match found: {matched_keywords[:5]}...")
        
        # Determine which agents to run based on keywords
        agents_to_run = []
        
        market_keywords = ["market", "sales", "revenue", "cagr", "growth", "iqvia", "forecast"]
        if any(kw in query_lower for kw in market_keywords):
            agents_to_run.append("iqvia")
        
        clinical_keywords = ["trial", "clinical", "phase", "fda", "efficacy", "safety"]
        if any(kw in query_lower for kw in clinical_keywords):
            agents_to_run.append("clinical")
        
        patent_keywords = ["patent", "ip", "expiry", "fto", "exclusivity"]
        if any(kw in query_lower for kw in patent_keywords):
            agents_to_run.append("patent")
        
        exim_keywords = ["export", "import", "exim", "trade", "sourcing", "supply"]
        if any(kw in query_lower for kw in exim_keywords):
            agents_to_run.append("exim")
        
        # Default: run all major agents if none specifically matched
        if not agents_to_run:
            agents_to_run = ["iqvia", "clinical", "patent", "exim"]
        
        # Always add report generator
        agents_to_run.append("report_generator")
        
        # Try to extract drug name from query
        drug_name = None
        known_drugs = ["semaglutide", "ozempic", "wegovy", "metformin", "aspirin", 
                      "ibuprofen", "paracetamol", "acetaminophen", "atorvastatin"]
        for drug in known_drugs:
            if drug in query_lower:
                drug_name = drug.capitalize()
                break
        
        return {
            "is_valid": True,
            "is_greeting": False,
            "rejection_reason": None,
            "agents_to_run": agents_to_run,
            "task_breakdown": f"Analyzing pharmaceutical query using {', '.join(agents_to_run[:-1])} agents",
            "drug_name": drug_name,
            "indication": "general"
        }
    else:
        return {
            "is_valid": False,
            "is_greeting": False,
            "is_valid": False,
            "rejection_reason": "This query doesn't appear to be related to pharmaceutical drug analysis. Please ask about drug repurposing, clinical trials, patent analysis, or market data.",
            "agents_to_run": [],
            "task_breakdown": None,
            "drug_name": None,
            "indication": "general"
        }


def validate_and_plan_query(user_query: str) -> Dict[str, Any]:
    """
    Validate if the query is related to pharmaceutical drug repurposing
    and plan which agents should handle it.
    """
    print(f"[Orchestrator] Validating query: {user_query[:50]}...")
    query_lower = user_query.lower().strip()
    
    # ALWAYS check for greetings first (before LLM call)
    for pattern in GREETING_PATTERNS:
        if re.search(pattern, query_lower):
            print(f"[Orchestrator] Greeting detected: {pattern}")
            # Find the best matching greeting response
            response_text = GREETING_RESPONSES["default"]
            for key in GREETING_RESPONSES:
                if key in query_lower:
                    response_text = GREETING_RESPONSES[key]
                    break
            return {
                "is_valid": True,
                "is_greeting": True,
                "greeting_response": response_text,
                "rejection_reason": None,
                "agents_to_run": [],
                "task_breakdown": None,
                "drug_name": None,
                "indication": "general"
            }
    
    # If no LLM client available, use keyword-based fallback
    if client is None:
        print("[Orchestrator] Using keyword-based validation (no LLM available)")
        return _keyword_based_validation(user_query)
    
    try:
        print("[Orchestrator] Using LLM-based validation")
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": ORCHESTRATOR_SYSTEM_PROMPT},
                {"role": "user", "content": user_query}
            ],
            temperature=0.1,
            max_tokens=500
        )
        
        result_text = response.choices[0].message.content.strip()
        print(f"[Orchestrator] LLM response received: {result_text[:100]}...")
        
        # Try to extract JSON from the response
        # Handle cases where LLM might add extra text
        if "```json" in result_text:
            result_text = result_text.split("```json")[1].split("```")[0].strip()
        elif "```" in result_text:
            result_text = result_text.split("```")[1].split("```")[0].strip()
        
        result = json.loads(result_text)
        
        # Validate the response structure
        if not isinstance(result.get("is_valid"), bool):
            raise ValueError("Invalid response structure")
        
        print(f"[Orchestrator] Validation result: is_valid={result.get('is_valid')}")
        return result
        
    except json.JSONDecodeError as e:
        print(f"[Orchestrator] JSON parse error: {e}")
        print(f"[Orchestrator] Falling back to keyword validation")
        return _keyword_based_validation(user_query)
        
    except Exception as e:
        print(f"[Orchestrator] LLM error: {e}")
        print(f"[Orchestrator] Falling back to keyword validation")
        return _keyword_based_validation(user_query)


def get_agent_task_prompt(agent_id: str, drug_name: str = "the drug", indication: str = "general") -> str:
    """Get the task prompt for a specific agent"""
    template = AGENT_TASK_PROMPTS.get(agent_id, "Analyze data for {drug_name} regarding {indication}")
    return template.format(drug_name=drug_name, indication=indication)


def run_agent_with_llm(agent_id: str, user_query: str, drug_name: str = None, indication: str = "general") -> Dict[str, Any]:
    """
    Run a single agent's analysis using the LLM.
    In production, this would call actual APIs/databases.
    For now, it returns data from JSON files with LLM enhancement.
    """
    from api import load_agent_data, AGENT_NAMES
    
    # Load the mock data
    data = load_agent_data(agent_id, indication, drug_name or "semaglutide")
    
    agent_name = AGENT_NAMES.get(agent_id, agent_id)
    
    return {
        "agent_id": agent_id,
        "agent_name": agent_name,
        "status": "success",
        "data": data,
        "task": get_agent_task_prompt(agent_id, drug_name or "semaglutide", indication)
    }


def synthesize_results(results: List[Dict], user_query: str) -> str:
    """
    Synthesize results from multiple agents into a coherent summary.
    """
    synthesis_prompt = f"""Based on the following agent results for the query: "{user_query}"

Agent Results:
{json.dumps(results, indent=2, default=str)[:3000]}  # Truncate to avoid token limits

Provide a brief executive summary (3-4 sentences) highlighting:
1. Key market insights
2. Clinical development status
3. Patent/IP considerations
4. Strategic recommendation

Be concise and actionable."""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a pharmaceutical market intelligence analyst. Provide concise, actionable summaries."},
                {"role": "user", "content": synthesis_prompt}
            ],
            temperature=0.3,
            max_tokens=300
        )
        
        return response.choices[0].message.content.strip()
    except Exception as e:
        return f"Summary generation failed: {str(e)}"


# Test function
if __name__ == "__main__":
    # Test valid query
    print("=" * 50)
    print("Testing valid pharmaceutical query...")
    result = validate_and_plan_query("What are the repurposing opportunities for Semaglutide in treating Alcohol Use Disorder?")
    print(json.dumps(result, indent=2))
    
    print("\n" + "=" * 50)
    print("Testing invalid query...")
    result = validate_and_plan_query("What's the capital of France?")
    print(json.dumps(result, indent=2))
    
    print("\n" + "=" * 50)
    print("Testing clinical trial query...")
    result = validate_and_plan_query("Show me clinical trials for Metformin")
    print(json.dumps(result, indent=2))
