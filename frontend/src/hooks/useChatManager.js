import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";

const MAX_CHATS = 50;

/**
 * @param {{ enabled?: boolean }} options
 *   Pass `enabled: false` to skip loading sessions (e.g. user not signed in).
 */
export function useChatManager({ enabled = true } = {}) {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (enabled) {
      loadChatsFromDB();
    } else {
      // Not authenticated – reset to empty
      setChats([]);
      setActiveChatId(null);
      setIsLoaded(true);
    }
  }, [enabled]);

  const loadChatsFromDB = async () => {
    try {
      console.log("[ChatManager] Loading sessions from API...");
      const response = await api.listSessions(MAX_CHATS, 0);
      console.log("[ChatManager] API response:", response);

      if (response.status === "success" && response.sessions) {
        console.log("[ChatManager] Found sessions array:", response.sessions);
        // Filter out any invalid sessions without sessionId
        const validSessions = response.sessions.filter((session) => session && session.sessionId);
        console.log("[ChatManager] Valid sessions after filtering:", validSessions);
        setChats(validSessions);
      } else {
        console.warn("[ChatManager] Response doesn't have sessions array:", response);
        // Handle case where response might have different structure
        if (Array.isArray(response)) {
          console.log("[ChatManager] Response is an array, using it directly");
          const validSessions = response.filter((session) => session && session.sessionId);
          setChats(validSessions);
        } else {
          setChats([]);
        }
      }
    } catch (e) {
      console.error("[ChatManager] Failed to load sessions:", e);
      setChats([]);
    } finally {
      setIsLoaded(true);
    }
  };

  const activeChat = chats.find((c) => c.sessionId === activeChatId) || null;

  const createChatFromPrompt = useCallback(async (firstPrompt) => {
    setIsLoading(true);
    try {
      console.log("[ChatManager] Creating chat with prompt:", firstPrompt);
      const title = firstPrompt.trim().substring(0, 40);
      const createRes = await api.createSession(title);
      console.log("[ChatManager] Create session response:", createRes);
      const sessionId = createRes.sessionId;

      // Send first prompt immediately
      console.log("[ChatManager] Sending analyze request...");
      const analyzeRes = await api.analyze(sessionId, firstPrompt);
      console.log("[ChatManager] Analyze response:", analyzeRes);

      // Backend returns full session
      const session = analyzeRes.session;
      console.log("[ChatManager] Session from analyze:", session);
      console.log("[ChatManager] AgentsData structure:", session?.agentsData);
      if (session?.agentsData && Array.isArray(session.agentsData)) {
        console.log(
          "[ChatManager] Latest agents entry:",
          session.agentsData[session.agentsData.length - 1],
        );
      }

      if (session && session.sessionId) {
        console.log("[ChatManager] Adding session to chats:", session);
        setChats((prev) => {
          const newChats = [session, ...prev];
          console.log("[ChatManager] Updated chats:", newChats);
          return newChats;
        });
        setActiveChatId(session.sessionId);
        localStorage.setItem("activeSessionId", session.sessionId);
      } else {
        console.error("[ChatManager] Invalid session returned:", session);
        throw new Error("Invalid session returned from server");
      }

      // Return session, queryType, and plan so caller can handle planning state
      return {
        session,
        queryType: analyzeRes.queryType,
        plan: analyzeRes.plan,
        response: analyzeRes.response,
      };
    } catch (error) {
      console.error("[ChatManager] Error in createChatFromPrompt:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendPrompt = useCallback(
    async (prompt) => {
      if (!activeChatId) return { queryType: null };

      setIsLoading(true);
      try {
        const response = await api.analyze(activeChatId, prompt);

        // Always replace entire session
        const updatedSession = response.session;

        if (updatedSession && updatedSession.sessionId) {
          setChats((prev) =>
            prev.map((c) => (c.sessionId === updatedSession.sessionId ? updatedSession : c)),
          );
        }

        // Return queryType and plan so caller can handle planning state
        return {
          queryType: response.queryType,
          plan: response.plan,
          response: response.response,
        };
      } finally {
        setIsLoading(false);
      }
    },
    [activeChatId],
  );

  const selectChat = useCallback(async (sessionId) => {
    if (!sessionId) {
      // Clear active chat to show landing page
      console.log("[ChatManager] Clearing active chat to show landing page");
      setActiveChatId(null);
      localStorage.removeItem("activeSessionId");
      return;
    }

    setActiveChatId(sessionId);
    localStorage.setItem("activeSessionId", sessionId);

    try {
      const response = await api.getSession(sessionId);
      if (response.status === "success" && response.session && response.session.sessionId) {
        const session = response.session;
        setChats((prev) => prev.map((c) => (c.sessionId === sessionId ? session : c)));
      }
    } catch (error) {
      console.error("[ChatManager] Error selecting chat:", error);
    }
  }, []);

  const updateChatSession = useCallback((session) => {
    if (session && session.sessionId) {
      setChats((prev) => prev.map((c) => (c.sessionId === session.sessionId ? session : c)));
    }
  }, []);

  const deleteChat = useCallback(
    async (sessionId) => {
      try {
        await api.deleteSession(sessionId);
      } catch {
        console.log("Error in deleteChat");
      }

      setChats((prev) => prev.filter((c) => c.sessionId !== sessionId));

      if (sessionId === activeChatId) {
        setActiveChatId(null);
        localStorage.removeItem("activeSessionId");
      }
    },
    [activeChatId],
  );

  return {
    chats,
    activeChat,
    activeChatId,
    isLoaded,
    isLoading,

    // Core actions
    createChatFromPrompt,
    sendPrompt,
    selectChat,
    deleteChat,
    updateChatSession,
  };
}
