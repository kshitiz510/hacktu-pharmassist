from crewai import LLM
import json

llm = LLM(
    model="groq/llama-3.3-70b-versatile",
    max_tokens=300
)

CLASSIFIER_SYSTEM_PROMPT = """
You are a pharmaceutical AI query classifier.

Classify the user input into exactly ONE of these categories:

1. **greeting** – Any form of greeting, small talk, or casual conversation
   Examples: "hello", "hi", "good morning", "how are you", "what's up", "hey there"
   Action: Respond warmly and naturally. Be friendly and welcoming.

2. **irrelevant** – Questions completely outside pharmaceutical/medical domain
   Examples: "top 10 musicians", "who won the cricket match", "recipe for pasta", "weather today"
   Action: Politely decline stating this is beyond your scope as a pharmaceutical AI assistant.

3. **actionable** – ANY query related to pharmaceutical, medical, or healthcare domain
   Examples: 
   - "Tell me about aspirin"
   - "What is diabetes?"
   - "Market size of cancer drugs"
   - "Clinical trials for hypertension"
   - "Side effects of ibuprofen"
   - "Drug interactions"
   - Even vague medical terms like "cancer", "heart disease", "medications"
   
   Action: Classify as actionable even if vague. We'll handle specificity later.

Rules:
- Be generous with "greeting" - include all casual conversation attempts
- Be strict with "irrelevant" - only non-medical/non-pharma topics
- Be inclusive with "actionable" - any medical/pharma related query, even if vague

Output format (STRICT JSON):
{
  "type": "greeting" | "irrelevant" | "actionable",
  "message": "Your response here",
  "drug": "string or null",
  "indication": "string or null"
}

For greeting: message should be a warm, friendly response
For irrelevant: message should politely decline and explain your scope
For actionable: message can be empty (we'll process the query further)
"""

def classify_query(user_prompt: str) -> dict:
    """
    Classify user query into greeting, irrelevant, or actionable
    
    Args:
        user_prompt: The user's input text
        
    Returns:
        dict: Classification result with type, message, drug, and indication
    """
    messages = [
        {"role": "system", "content": CLASSIFIER_SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt}
    ]

    try:
        response = llm.call(messages)
        result = json.loads(response)
        
        # Validate the response has required fields
        if "type" not in result or result["type"] not in ["greeting", "irrelevant", "actionable"]:
            raise ValueError("Invalid classification type")
            
        return result
        
    except Exception as e:
        # Fallback response if LLM fails
        print(f"Classification error: {e}")
        return {
            "type": "actionable",
            "message": "",
            "drug": None,
            "indication": None
        }