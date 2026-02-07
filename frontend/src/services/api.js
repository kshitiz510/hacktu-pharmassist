const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const api = {
  async analyze(sessionId, prompt) {
    if (!sessionId) throw new Error("Session ID is required");

    const response = await fetch(`${API_BASE_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        prompt,
      }),
    });

    if (!response.ok) throw new Error("Analysis failed");
    return response.json();
  },

  async createSession(title) {
    const response = await fetch(`${API_BASE_URL}/sessions/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) throw new Error("Failed to create session");
    return response.json();
  },

  async listSessions(limit = 50, skip = 0) {
    const params = new URLSearchParams({ limit, skip });
    const response = await fetch(`${API_BASE_URL}/sessions?${params}`);
    if (!response.ok) throw new Error("Failed to list sessions");
    return response.json();
  },

  async getSession(sessionId) {
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`);
    if (!response.ok) throw new Error("Failed to get session");
    return response.json();
  },

  async deleteSession(sessionId) {
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/delete`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete session");
    return response.json();
  },

  async generateReport(promptId) {
    const response = await fetch(`${API_BASE_URL}/generate-report/${promptId}`, {
      method: "GET",
    });
    if (!response.ok) throw new Error("Failed to generate report");
    return response.blob();
  },
};

export default api;
