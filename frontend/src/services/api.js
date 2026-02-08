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

  async uploadDocument(sessionId, file) {
    if (!sessionId) throw new Error("Session ID is required");
    if (!file) throw new Error("File is required");

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/upload-document`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Upload failed" }));
      throw new Error(error.detail || "Failed to upload document");
    }
    return response.json();
  },

  async getDocumentInfo(sessionId) {
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/document`);
    if (!response.ok) throw new Error("Failed to get document info");
    return response.json();
  },

  async deleteDocument(sessionId) {
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/document`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete document");
    return response.json();
  },

  // ===== VOICE ASSISTANT API =====

  /**
   * Process transcribed voice text through the voice assistant
   */
  async voiceProcessText(sessionId, text, isFinal = true) {
    if (!sessionId) throw new Error("Session ID is required");

    const response = await fetch(`${API_BASE_URL}/voice/process-text`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        text,
        is_final: isFinal,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Voice processing failed" }));
      throw new Error(error.detail || "Failed to process voice input");
    }
    return response.json();
  },

  /**
   * Process raw audio through the voice assistant
   */
  async voiceProcessAudio(sessionId, audioBase64, audioFormat = "webm", language = "en") {
    if (!sessionId) throw new Error("Session ID is required");

    const response = await fetch(`${API_BASE_URL}/voice/process-audio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        audio_base64: audioBase64,
        audio_format: audioFormat,
        language,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Audio processing failed" }));
      throw new Error(error.detail || "Failed to process audio");
    }
    return response.json();
  },

  /**
   * Handle voice interruption during agent speech
   */
  async voiceInterrupt(sessionId, text) {
    if (!sessionId) throw new Error("Session ID is required");

    const response = await fetch(`${API_BASE_URL}/voice/interrupt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        text,
      }),
    });

    if (!response.ok) throw new Error("Failed to process interruption");
    return response.json();
  },

  /**
   * Confirm or reject refined prompt
   */
  async voiceConfirm(sessionId, confirmed, additionalText = null) {
    if (!sessionId) throw new Error("Session ID is required");

    const response = await fetch(`${API_BASE_URL}/voice/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        confirmed,
        additional_text: additionalText,
      }),
    });

    if (!response.ok) throw new Error("Failed to process confirmation");
    return response.json();
  },

  /**
   * Get current voice state for a session
   */
  async voiceGetState(sessionId) {
    const response = await fetch(`${API_BASE_URL}/voice/state/${sessionId}`);
    if (!response.ok) throw new Error("Failed to get voice state");
    return response.json();
  },

  /**
   * Reset voice state for a session
   */
  async voiceReset(sessionId) {
    if (!sessionId) throw new Error("Session ID is required");

    const response = await fetch(`${API_BASE_URL}/voice/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });

    if (!response.ok) throw new Error("Failed to reset voice state");
    return response.json();
  },

  /**
   * Mark that agent has started speaking (for TTS)
   */
  async voiceSpeakingStarted(sessionId, responseText) {
    const response = await fetch(
      `${API_BASE_URL}/voice/speaking-started?sessionId=${sessionId}&response_text=${encodeURIComponent(responseText)}`,
      { method: "POST" }
    );
    if (!response.ok) throw new Error("Failed to mark speaking started");
    return response.json();
  },

  /**
   * Mark that agent has finished speaking
   */
  async voiceSpeakingEnded(sessionId) {
    const response = await fetch(
      `${API_BASE_URL}/voice/speaking-ended?sessionId=${sessionId}`,
      { method: "POST" }
    );
    if (!response.ok) throw new Error("Failed to mark speaking ended");
    return response.json();
  },

  /**
   * Get intent and backchannel word lexicons
   */
  async voiceGetLexicons() {
    const response = await fetch(`${API_BASE_URL}/voice/lexicons`);
    if (!response.ok) throw new Error("Failed to get lexicons");
    return response.json();
  },

  async executePlan(sessionId) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout for long-running agent operations
    
    try {
      const res = await fetch(`${API_BASE_URL}/execute?sessionId=${sessionId}`, {
        method: "POST",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: "Execution failed" }));
        throw new Error(errorData.detail || "Execution failed");
      }
      return res.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error("Request timed out. The analysis is taking longer than expected.");
      }
      throw error;
    }
  },
};

export default api;
