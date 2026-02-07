from crewai import Agent, LLM
from exim_agent.tools.fetch_exim_data import fetch_exim_data
from exim_agent.tools.analyze_trade_volumes import analyze_trade_volumes
from exim_agent.tools.extract_sourcing_insights import extract_sourcing_insights
from exim_agent.tools.generate_import_dependency_tables import generate_import_dependency_tables

llm = LLM(
    model="groq/llama-3.3-70b-versatile",
    max_tokens=4096
)

exim_agent = Agent(
    role="EXIM Trends Agent",
    goal="Analyze export-import trends for APIs and formulations across countries, generate trade volume charts, sourcing insights, and import dependency analysis",
    backstory="""You are an expert in international trade and pharmaceutical supply chain analysis. 
    Your expertise includes:
    - Analyzing trade volume patterns and market dynamics
    - Identifying supplier concentration risks and opportunities
    - Evaluating import dependencies and supply chain resilience
    - Providing strategic sourcing recommendations
    
    You leverage real trade data to provide actionable insights for pharmaceutical companies.""",
    tools=[
        fetch_exim_data,
        analyze_trade_volumes,
        extract_sourcing_insights,
        generate_import_dependency_tables
    ],
    verbose=True,
    allow_delegation=False,
    llm=llm
)

# from crewai import LLM
# import json

# llm = LLM(
#     model="groq/llama-3.3-70b-versatile",
#     max_tokens=200
# )

# CLASSIFIER_SYSTEM_PROMPT = """
# You are a pharmaceutical AI query classifier.

# Your job is to classify the user input into exactly ONE of the following:

# 1. greeting
#    - Any form of greeting, small talk, casual conversation.
#    - Examples: "hi", "hello", "good morning", "how are you", "what's up"

# 2. irrelevant
#    - Completely outside medical / pharmaceutical / healthcare domain.
#    - Examples: sports, movies, music, food, weather, coding, politics, etc.

# 3. actionable
#    - ANY medical, pharmaceutical, healthcare, biology, disease, drug, clinical, market, patent, or guideline related query.
#    - Even vague medical terms like "cancer", "heart disease", "diabetes" are actionable.

# Return STRICT JSON only:

# For greeting:
# {
#   "type": "greeting",
#   "message": "Warm friendly response",
#   "drug": null,
#   "indication": null
# }

# For irrelevant:
# {
#   "type": "irrelevant",
#   "message": "Polite refusal stating pharmaceutical scope",
#   "drug": null,
#   "indication": null
# }

# For actionable:
# {
#   "type": "actionable",
#   "message": "",
#   "drug": "<drug name or null if not mentioned>",
#   "indication": "<disease/indication or null if not mentioned>"
# }

# Rules:
# - Always return valid JSON.
# - No markdown.
# - No explanations.
# - No extra text.
# - Only the JSON object.
# """

# def e(user_prompt: str) -> dict:
#     messages = [
#         {"role": "system", "content": CLASSIFIER_SYSTEM_PROMPT},
#         {"role": "user", "content": user_prompt}
#     ]

#     response = llm.call(messages)
#     try:
#         return json.loads(response)
#     except Exception:
#         # Safe fallback (never break pipeline)
#         return {
#             "type": "actionable",
#             "message": "",
#             "drug": None,
#             "indication": None
#         }
