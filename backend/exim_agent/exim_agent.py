from crewai import Agent, LLM
from exim_agent.tools.fetch_exim_data import fetch_exim_data
llm = LLM(
    model="groq/llama-3.3-70b-versatile",
    max_tokens=400
)
exim_agent = Agent(
    role="EXIM Trends Agent",
    goal="Analyze export-import trends for APIs and formulations",
    backstory="You analyze real trade data using provided tools.",
    tools=[fetch_exim_data],
    verbose=True,
    allow_delegation=False,
    llm=llm
)