const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * API service for communicating with the PharmAssist backend
 */
export const api = {
  /**
   * Run the full analysis pipeline
   * @param {string} prompt - User's analysis prompt
   * @param {string} drugName - Drug name (optional - LLM will extract if not provided)
   * @param {string} indication - Indication type (optional - LLM will extract if not provided)
   * @param {number} promptIndex - Prompt sequence number
   */
  async runAnalysis(prompt, drugName = null, indication = null, promptIndex = 1) {
    console.log("[API] runAnalysis called:", { prompt, drugName, indication, promptIndex });
    const response = await fetch(`${API_BASE_URL}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        drug_name: drugName,
        indication,
        prompt_index: promptIndex,
      }),
    });

    if (!response.ok) {
      console.error("[API] runAnalysis failed:", response.statusText);
      throw new Error(`Analysis failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("[API] runAnalysis response:", data);
    return data;
  },

  /**
   * Run analysis with streaming-style response
   * LLM orchestrator will extract drug name and indication from the prompt
   */
  async runAnalysisStream(prompt, drugName = null, indication = null, promptIndex = 1) {
    console.log("[API] runAnalysisStream called:", { prompt, drugName, indication, promptIndex });
    const response = await fetch(`${API_BASE_URL}/analyze/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        drug_name: drugName,
        indication,
        prompt_index: promptIndex,
      }),
    });

    if (!response.ok) {
      console.error("[API] runAnalysisStream failed:", response.statusText);
      throw new Error(`Analysis failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("[API] runAnalysisStream response:", data);
    return data;
  },

  /**
   * Get data for a specific agent
   * @param {string} agentId - Agent identifier
   * @param {string} indication - Indication type
   * @param {string} drugName - Drug name
   */
  async getAgentData(agentId, indication = "general", drugName = "semaglutide") {
    console.log("[API] getAgentData called:", { agentId, indication, drugName });
    const params = new URLSearchParams({
      indication,
      drug_name: drugName,
    });

    const response = await fetch(`${API_BASE_URL}/data/${agentId}?${params}`);

    if (!response.ok) {
      console.error("[API] getAgentData failed:", response.statusText);
      throw new Error(`Failed to get agent data: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("[API] getAgentData response:", data);
    return data;
  },

  /**
   * Run a single agent
   * @param {string} agentId - Agent identifier
   * @param {string} prompt - Analysis prompt
   * @param {string} drugName - Drug name
   * @param {string} indication - Indication type
   */
  async runAgent(agentId, prompt, drugName = "semaglutide", indication = null) {
    console.log("[API] runAgent called:", { agentId, prompt, drugName, indication });
    const response = await fetch(`${API_BASE_URL}/agent/${agentId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        drug_name: drugName,
        indication,
      }),
    });

    if (!response.ok) {
      console.error("[API] runAgent failed:", response.statusText);
      throw new Error(`Agent execution failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("[API] runAgent response:", data);
    return data;
  },

  /**
   * List all available agents
   */
  async listAgents() {
    console.log("[API] listAgents called");
    console.log("[API] listAgents called");
    const response = await fetch(`${API_BASE_URL}/agents`);

    if (!response.ok) {
      console.error("[API] listAgents failed:", response.statusText);
      throw new Error(`Failed to list agents: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("[API] listAgents response:", data);
    return data;
  },

  /**
   * Health check
   */
  async healthCheck() {
    console.log("[API] healthCheck called");
    try {
      const response = await fetch(`${API_BASE_URL}/`);
      const isHealthy = response.ok;
      console.log("[API] healthCheck result:", isHealthy);
      return isHealthy;
    } catch (error) {
      console.error("[API] healthCheck failed:", error);
      return false;
    }
  },

  /**
   * Generate PDF report
   * @param {string} drugName - Drug name (default: semaglutide)
   * @param {string} indication - Indication type (general/aud)
   */
  async generatePdf(drugName = "semaglutide", indication = "general") {
    console.log("[API] generatePdf called:", { drugName, indication });
    const params = new URLSearchParams({
      drug_name: drugName,
      indication: indication,
    });

    const response = await fetch(`${API_BASE_URL}/generate-pdf?${params}`, {
      method: "POST",
    });

    if (!response.ok) {
      console.error("[API] generatePdf failed:", response.statusText);
      throw new Error(`PDF generation failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("[API] generatePdf response:", data);
    return data;
  },

  /**
   * Download generated PDF
   * @param {string} filename - Name of the PDF file to download
   */
  async downloadPdf(filename) {
    console.log("[API] downloadPdf called:", { filename });
    const url = `${API_BASE_URL}/download-pdf/${filename}`;

    // Create a temporary link and trigger download
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log("[API] PDF download initiated");
  },
};

// Agent ID to frontend index mapping
export const AGENT_ID_MAP = {
  iqvia: 0,
  exim: 1,
  patent: 2,
  clinical: 3,
  internal_knowledge: 4,
  report_generator: 5,
};

// Frontend index to agent ID mapping
export const AGENT_INDEX_MAP = {
  0: "iqvia",
  1: "exim",
  2: "patent",
  3: "clinical",
  4: "internal_knowledge",
  5: "report_generator",
};

export default api;
