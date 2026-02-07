import json
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import LLM orchestrator for query validation (optional for PDF generation)
try:
    from llm_orchestrator import validate_and_plan_query, synthesize_results
    HAS_LLM_ORCHESTRATOR = True
except ImportError:
    HAS_LLM_ORCHESTRATOR = False
    validate_and_plan_query = None
    synthesize_results = None

# Import PDF generation function
try:
    from report_generator.tools.generate_pdf_report import create_pdf_report
    HAS_PDF_GENERATOR = True
except ImportError:
    HAS_PDF_GENERATOR = False
    create_pdf_report = None

app = FastAPI(
    title="PharmAssist Intelligence API",
    description="Multi-agent pharmaceutical intelligence system for drug repurposing analysis",
    version="1.0.0"
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Agent name mapping (for display purposes)
AGENT_NAMES = {
    "iqvia": "IQVIA Insights Agent",
    "exim": "EXIM Trends Agent",
    "patent": "Patent Landscape Agent",
    "clinical": "Clinical Trials Agent",
    "internal_knowledge": "Internal Knowledge Agent",
    "report_generator": "Report Generator Agent"
}

# Data files mapping
DATA_DIR = os.path.join(os.path.dirname(__file__), "dummyData")
MOCK_DATA_DIR = os.path.join(os.path.dirname(__file__), "mockData")
DATA_FILES = {
    "iqvia": "iqvia_data.json",
    "exim": "exim_data.json",
    "patent": "patent_data.json",
    "clinical": "clinical_data.json",
    "internal_knowledge": "internal_knowledge_data.json",
    "report_generator": "report_data.json"
}

# Agent ID to agent name mapping for mockData
AGENT_KEY_MAPPING = {
    "iqvia": "IQVIA Insights Agent",
    "exim": "EXIM Trade Agent",
    "patent": "Patent Landscape Agent",
    "clinical": "Clinical Trials Agent",
    "internal_knowledge": "Internal Knowledge Agent",
    "report_generator": "Report Generator Agent"
}


class AnalysisRequest(BaseModel):
    prompt: str
    drug_name: Optional[str] = "semaglutide"
    indication: Optional[str] = None  # "general" or "aud"
    prompt_index: Optional[int] = 1  # 1 for first prompt, 2+ for follow-ups


class AgentResponse(BaseModel):
    agent_id: str
    agent_name: str
    status: str
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class AnalysisResponse(BaseModel):
    request_id: str
    prompt: str
    indication: str
    agents_executed: List[str]
    results: List[AgentResponse]


def detect_indication(prompt: str) -> str:
    """Detect if the prompt is about AUD or general analysis"""
    aud_keywords = ["aud", "alcohol", "addiction", "drinking", "craving", "reward"]
    prompt_lower = prompt.lower()
    
    for keyword in aud_keywords:
        if keyword in prompt_lower:
            return "aud"
    return "general"


def load_agent_data(agent_id: str, indication: str, drug_name: str = "semaglutide") -> Dict[str, Any]:
    """
    Load data from JSON file for a specific agent.
    Tries mockData first (for multiple drugs), then falls back to dummyData (for semaglutide).
    """
    if agent_id not in DATA_FILES:
        return {"error": f"Unknown agent: {agent_id}"}
    
    drug_key = drug_name.lower().replace(" ", "_").replace("-", "_")
    indication_key = indication.lower().replace(" ", "_") if indication else "general"
    
    # First try mockData with temp.json structure
    mock_data_file = os.path.join(MOCK_DATA_DIR, "temp.json")
    if os.path.exists(mock_data_file):
        try:
            with open(mock_data_file, "r", encoding="utf-8") as f:
                mock_data = json.load(f)
            
            # Create composite key: drug_indication (e.g., "metformin_cancer")
            composite_key = f"{drug_key}_{indication_key}"
            
            # Try to find data for this drug-indication combo
            if composite_key in mock_data:
                agent_name = AGENT_KEY_MAPPING.get(agent_id, agent_id)
                if agent_name in mock_data[composite_key]:
                    print(f"[API] Found {agent_id} data in mockData for {composite_key}")
                    return mock_data[composite_key][agent_name]
            
            # If not found, try just the drug key
            for key in mock_data.keys():
                if key.startswith(drug_key):
                    agent_name = AGENT_KEY_MAPPING.get(agent_id, agent_id)
                    if agent_name in mock_data[key]:
                        print(f"[API] Found {agent_id} data in mockData for {key}")
                        return mock_data[key][agent_name]
        except Exception as e:
            print(f"[API] Error loading mockData: {e}")
    
    # Fallback to dummyData (original structure for semaglutide)
    data_file = os.path.join(DATA_DIR, DATA_FILES[agent_id])
    
    try:
        with open(data_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        # For exim agent, there's no indication split
        if agent_id == "exim":
            result = data.get(drug_key, {})
            if result:
                print(f"[API] Found {agent_id} data in dummyData for {drug_key}")
                return result
        
        # For other agents, check indication
        if indication_key == "aud":
            key = f"{drug_key}_aud"
        else:
            key = f"{drug_key}_general"
        
        result = data.get(key, data.get(f"{drug_key}_general", {}))
        if result:
            print(f"[API] Found {agent_id} data in dummyData for {key}")
        return result
    
    except FileNotFoundError:
        print(f"[API] Data file not found for {agent_id}")
        return {"error": f"Data file not found for {agent_id}"}
    except json.JSONDecodeError:
        print(f"[API] Invalid JSON in {agent_id} data file")
        return {"error": f"Invalid JSON in {agent_id} data file"}


@app.get("/")
async def root():
    return {
        "message": "PharmAssist Intelligence API",
        "version": "1.0.0",
        "endpoints": {
            "/analyze": "POST - Run full analysis pipeline",
            "/agents": "GET - List available agents",
            "/agent/{agent_id}": "POST - Run specific agent",
            "/data/{agent_id}": "GET - Get raw data for agent"
        }
    }


@app.get("/agents")
async def list_agents():
    """List all available agents"""
    return {
        "agents": [
            {"id": "iqvia", "name": "IQVIA Insights Agent", "description": "Market size, sales trends, competitive analysis"},
            {"id": "exim", "name": "EXIM Trends Agent", "description": "Export-import trade data, API pricing"},
            {"id": "patent", "name": "Patent Landscape Agent", "description": "Patent status, FTO analysis, IP strategy"},
            {"id": "clinical", "name": "Clinical Trials Agent", "description": "Trial pipeline, phase distribution, sponsors"},
            {"id": "internal_knowledge", "name": "Internal Knowledge Agent", "description": "Strategic insights, internal documents"},
            {"id": "report_generator", "name": "Report Generator Agent", "description": "Compiled reports, executive summaries"}
        ]
    }


@app.get("/data/{agent_id}")
async def get_agent_data(
    agent_id: str, 
    indication: str = "general",
    drug_name: str = "semaglutide"
):
    """Get raw data for a specific agent without running the agent"""
    if agent_id not in DATA_FILES:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")
    
    data = load_agent_data(agent_id, indication, drug_name)
    
    return {
        "agent_id": agent_id,
        "drug_name": drug_name,
        "indication": indication,
        "data": data
    }


@app.post("/agent/{agent_id}")
async def run_single_agent(agent_id: str, request: AnalysisRequest):
    """Run a single agent and return its output"""
    if agent_id not in DATA_FILES:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")
    
    indication = request.indication or detect_indication(request.prompt)
    
    # Load the data directly (simulating agent API call)
    data = load_agent_data(agent_id, indication, request.drug_name)
    
    return AgentResponse(
        agent_id=agent_id,
        agent_name=AGENT_NAMES.get(agent_id, agent_id),
        status="completed",
        data=data
    )


@app.post("/analyze")
async def run_analysis(request: AnalysisRequest):
    """Run the full analysis pipeline with all agents"""
    import uuid
    
    request_id = str(uuid.uuid4())[:8]
    
    # Use LLM orchestrator to determine agents if available
    if HAS_LLM_ORCHESTRATOR and validate_and_plan_query:
        validation_result = validate_and_plan_query(request.prompt)
        
        # Use orchestrator's agent selection
        agent_sequence = validation_result.get("agents_to_run", [])
        indication = request.indication or validation_result.get("indication", "general")
        drug_name = request.drug_name or validation_result.get("drug_name", "semaglutide")
        
        # If orchestrator didn't return agents, use defaults
        if not agent_sequence:
            agent_sequence = ["iqvia", "exim", "patent", "clinical", "internal_knowledge", "report_generator"]
    else:
        # Fallback: use all agents
        agent_sequence = ["iqvia", "exim", "patent", "clinical", "internal_knowledge", "report_generator"]
        indication = request.indication or detect_indication(request.prompt)
        drug_name = request.drug_name
    
    results = []
    
    for agent_id in agent_sequence:
        data = load_agent_data(agent_id, indication, drug_name)
        
        results.append(AgentResponse(
            agent_id=agent_id,
            agent_name=AGENT_NAMES.get(agent_id, agent_id),
            status="completed",
            data=data
        ))
    
    return AnalysisResponse(
        request_id=request_id,
        prompt=request.prompt,
        indication=indication,
        agents_executed=agent_sequence,
        results=results
    )


@app.post("/analyze/stream")
async def run_analysis_stream(request: AnalysisRequest):
    """
    Run analysis with LLM-powered query validation and orchestration.
    Handles:
    - Greetings (LLM replies, no agents)
    - Vague medical topics (definition + clarification)
    - Actionable pharma queries (full agent pipeline)
    """
    import uuid
    
    request_id = str(uuid.uuid4())[:8]
    
    # Check if LLM orchestrator is available
    if not HAS_LLM_ORCHESTRATOR or validate_and_plan_query is None:
        print(f"[API] LLM orchestrator not available, using default agent sequence")
        # Fallback: run all agents
        agent_sequence = ["iqvia", "exim", "patent", "clinical", "internal_knowledge", "report_generator"]
        drug_name = request.drug_name or "semaglutide"
        indication = request.indication or detect_indication(request.prompt)
        
        # Execute agents and return
        agents_data = {}
        for agent_id in agent_sequence:
            if agent_id in DATA_FILES:
                data = load_agent_data(agent_id, indication, drug_name)
                agents_data[agent_id] = {
                    "agent_id": agent_id,
                    "agent_name": AGENT_NAMES.get(agent_id, agent_id),
                    "status": "completed",
                    "data": data
                }
        
        return {
            "request_id": request_id,
            "prompt": request.prompt,
            "is_valid": True,
            "rejection_reason": None,
            "indication": indication,
            "drug_name": drug_name,
            "agent_sequence": agent_sequence,
            "agents": agents_data,
            "summary": None
        }
    
    # Step 1: Validate query with LLM orchestrator
    print(f"[API] Validating query: {request.prompt[:100]}...")
    validation_result = validate_and_plan_query(request.prompt)

    # Step 2: Check if this is a greeting - respond friendly
    if validation_result.get("is_greeting", False):
        print(f"[API] Greeting detected, sending friendly response")
        return {
            "request_id": request_id,
            "prompt": request.prompt,
            "is_valid": True,
            "is_greeting": True,
            "greeting_response": validation_result.get("greeting_response", "Hello! I'm PharmAssist, your pharmaceutical intelligence assistant."),
            "indication": "none",
            "agent_sequence": [],
            "agents": {},
            "summary": None
        }
    
    # Step 3: Vague medical topic handling (definition + clarification)
    if validation_result.get("is_vague", False):
        print(f"[API] Vague topic detected, asking for clarification")
        
        combined_message = (
            f"{validation_result.get('definition')}\n\n"
            f"{validation_result.get('followup_question')}"
        )
        
        return {
            "request_id": request_id,
            "prompt": request.prompt,
            "is_valid": True,
            "is_vague": True,
            "assistant_message": combined_message,
            "indication": "general",
            "agent_sequence": [],
            "agents": {},
            "summary": None
        }


    # Step 4: Invalid non-pharma queries
    if not validation_result.get("is_valid", False):
        print(f"[API] Query rejected: {validation_result.get('rejection_reason')}")
        return {
            "request_id": request_id,
            "prompt": request.prompt,
            "is_valid": False,
            "is_greeting": False,
            "rejection_reason": validation_result.get("rejection_reason", "Query not related to pharmaceutical drug repurposing."),
            "indication": "none",
            "agent_sequence": [],
            "agents": {},
            "summary": None
        }
    
    # Step 5: Valid actionable pharma query → run agents
    print(f"[API] Query validated. Agents to run: {validation_result.get('agents_to_run')}")
    
    indication = request.indication or validation_result.get("indication", "general") or detect_indication(request.prompt)
    drug_name = request.drug_name or validation_result.get("drug_name") or "semaglutide"
    
    orchestrator_agents = validation_result.get("agents_to_run", [])
    
    # Fallback default agents
    if not orchestrator_agents:
        if request.prompt_index == 1:
            orchestrator_agents = ["iqvia", "exim", "patent", "clinical", "internal_knowledge", "report_generator"]
        else:
            orchestrator_agents = ["iqvia", "patent", "clinical", "internal_knowledge", "report_generator"]
    
    # Ensure report generator is included for multi-agent analysis
    if "report_generator" not in orchestrator_agents and len(orchestrator_agents) >= 3:
        orchestrator_agents.append("report_generator")
    
    agents_data = {}
    results_for_synthesis = []
    
    for agent_id in orchestrator_agents:
        if agent_id in DATA_FILES:
            data = load_agent_data(agent_id, indication, drug_name)
            agents_data[agent_id] = {
                "agent_id": agent_id,
                "agent_name": AGENT_NAMES.get(agent_id, agent_id),
                "status": "completed",
                "data": data,
                "task": validation_result.get("task_breakdown", "")
            }
            results_for_synthesis.append({
                "agent": agent_id,
                "summary": str(data)[:500] if data else "No data"
            })
    
    # Step 6: Generate synthesis summary using LLM
    summary = synthesize_results(results_for_synthesis, request.prompt) if results_for_synthesis else None
    
    print(f"[API] Analysis complete. {len(agents_data)} agents executed.")
    
    return {
        "request_id": request_id,
        "prompt": request.prompt,
        "is_valid": True,
        "rejection_reason": None,
        "indication": indication,
        "drug_name": drug_name,
        "agent_sequence": orchestrator_agents,
        "agents": agents_data,
        "task_breakdown": validation_result.get("task_breakdown"),
        "summary": summary
    }


@app.post("/validate")
async def validate_query(request: AnalysisRequest):
    """
    Validate if a query is related to pharmaceutical drug repurposing.
    Returns validation result without executing agents.
    """
    validation_result = validate_and_plan_query(request.prompt)
    
    return {
        "prompt": request.prompt,
        "is_valid": validation_result.get("is_valid", False),
        "rejection_reason": validation_result.get("rejection_reason"),
        "suggested_agents": validation_result.get("agents_to_run", []),
        "detected_drug": validation_result.get("drug_name"),
        "detected_indication": validation_result.get("indication")
    }


@app.post("/generate-pdf")
async def generate_pdf(
    drug_name: str = "semaglutide",
    indication: str = "general"
):
    """
    Generate a comprehensive PDF report with all agent data.
    
    Args:
        drug_name: Name of the drug (default: semaglutide)
        indication: Indication type - "general" or "aud" (default: general)
    
    Returns:
        File path and status of the generated PDF
    """
    try:
        # Load data from all agents
        iqvia_data = load_agent_data("iqvia", indication, drug_name)
        exim_data = load_agent_data("exim", indication, drug_name) if indication == "general" else {}
        patent_data = load_agent_data("patent", indication, drug_name)
        clinical_data = load_agent_data("clinical", indication, drug_name)
        internal_knowledge_data = load_agent_data("internal_knowledge", indication, drug_name)
        report_data = load_agent_data("report_generator", indication, drug_name)
        
        # Generate PDF using the standalone function
        result = create_pdf_report(
            drug_name=drug_name,
            indication=indication,
            iqvia_data=iqvia_data,
            exim_data=exim_data,
            patent_data=patent_data,
            clinical_data=clinical_data,
            internal_knowledge_data=internal_knowledge_data,
            report_data=report_data
        )
        
        if result.get("status") == "success":
            return {
                "status": "success",
                "message": "PDF generated successfully",
                "file_path": result.get("file_path"),
                "file_name": result.get("file_name"),
                "download_url": f"/download-pdf/{result.get('file_name')}"
            }
        else:
            raise HTTPException(status_code=500, detail=result.get("message", "PDF generation failed"))
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")


@app.get("/download-pdf/{filename}")
async def download_pdf(filename: str):
    """
    Download a generated PDF report.
    
    Args:
        filename: Name of the PDF file to download
    
    Returns:
        PDF file as download
    """
    try:
        file_path = os.path.join(
            os.path.dirname(__file__),
            "generated_reports",
            filename
        )
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="PDF file not found")
        
        return FileResponse(
            path=file_path,
            media_type="application/pdf",
            filename=filename,
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="PDF file not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to download PDF: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
