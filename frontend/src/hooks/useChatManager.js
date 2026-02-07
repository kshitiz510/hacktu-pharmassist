import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../services/api";

const MAX_CHATS = 50; // Maximum number of chats to load

/**
 * Custom hook for managing chat sessions with MongoDB persistence
 * Provides ChatGPT-like functionality for multiple conversations
 */
export function useChatManager() {
  // All chats stored with full state
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const saveTimeoutRef = useRef(null);

  // Load chats from MongoDB on mount
  useEffect(() => {
    loadChatsFromDB();
  }, []);

  const loadChatsFromDB = async () => {
    try {
      setIsLoading(true);
      const response = await api.listSessions(MAX_CHATS, 0);

      if (response.status === "success" && response.sessions) {
        // Convert MongoDB sessions to frontend format
        const loadedChats = response.sessions.map((session) => ({
          id: session.sessionId,
          title: session.title || "New Analysis",
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
          messages: [], // Will load when session is selected
          agentData: {},
          workflowState: {
            activeAgent: null,
            showAgentDataByAgent: {},
            reportReady: false,
            workflowComplete: false,
            queryRejected: false,
            systemResponse: null,
            panelCollapsed: false,
            showAgentFlow: false,
            drugName: null,
            indication: null,
          },
        }));
        setChats(loadedChats);
      }
    } catch (error) {
      console.error("[ChatManager] Error loading chats from DB:", error);
      // Fallback: start with empty state
      setChats([]);
    } finally {
      setIsLoading(false);
      setIsLoaded(true);
    }
  };

  // Load full session data when selected
  const loadFullSession = async (sessionId) => {
    try {
      const response = await api.getSession(sessionId);

      if (response.status === "success" && response.session) {
        const session = response.session;

        // Update the chat in state with full data
        setChats((prev) =>
          prev.map((chat) =>
            chat.id === sessionId
              ? {
                  ...chat,
                  messages: session.chatHistory || [],
                  agentData: session.agentsData || {},
                  workflowState: {
                    activeAgent: session.workflowState?.activeAgent || null,
                    showAgentDataByAgent: session.workflowState?.showAgentDataByAgent || {},
                    reportReady: session.workflowState?.reportReady || false,
                    workflowComplete: session.workflowState?.workflowComplete || false,
                    queryRejected: session.workflowState?.queryRejected || false,
                    systemResponse: session.workflowState?.systemResponse || null,
                    panelCollapsed: session.workflowState?.panelCollapsed || false,
                    showAgentFlow: session.workflowState?.showAgentFlow || false,
                    drugName: session.workflowState?.drugName || null,
                    indication: session.workflowState?.indication || null,
                  },
                }
              : chat,
          ),
        );
      }
    } catch (error) {
      console.error("[ChatManager] Error loading full session:", error);
    }
  };

  // Get the active chat object
  const activeChat = chats.find((c) => c.id === activeChatId) || null;

  // Generate a title from the first message
  const generateTitle = (message) => {
    if (!message) return "New Analysis";
    const words = message.trim().split(/\s+/).slice(0, 6).join(" ");
    return words.length > 40 ? words.substring(0, 40) + "..." : words || "New Analysis";
  };

  // Create a new chat
  const createChat = useCallback(async () => {
    try {
      const response = await api.createSession("New Analysis");

      if (response.status === "success" && response.session) {
        const newChat = {
          id: response.session.sessionId,
          title: response.session.title,
          createdAt: response.session.createdAt,
          updatedAt: response.session.updatedAt,
          messages: [],
          agentData: {},
          workflowState: {
            activeAgent: null,
            showAgentDataByAgent: {},
            reportReady: false,
            workflowComplete: false,
            queryRejected: false,
            systemResponse: null,
            panelCollapsed: false,
            showAgentFlow: false,
            drugName: null,
            indication: null,
          },
        };

        setChats((prev) => [newChat, ...prev]);
        setActiveChatId(newChat.id);
        return newChat;
      }
    } catch (error) {
      console.error("[ChatManager] Error creating chat:", error);
      // Fallback: create local-only chat
      const fallbackChat = {
        id: `local_${Date.now()}`,
        title: "New Analysis",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [],
        agentData: {},
        workflowState: {
          activeAgent: null,
          showAgentDataByAgent: {},
          reportReady: false,
          workflowComplete: false,
          queryRejected: false,
          systemResponse: null,
          panelCollapsed: false,
          showAgentFlow: false,
          drugName: null,
          indication: null,
        },
      };
      setChats((prev) => [fallbackChat, ...prev]);
      setActiveChatId(fallbackChat.id);
      return fallbackChat;
    }
  }, []);

  // Select an existing chat
  const selectChat = useCallback(
    async (chatId) => {
      setActiveChatId(chatId);

      // Load full session data if not already loaded
      const chat = chats.find((c) => c.id === chatId);
      if (chat && chat.messages.length === 0) {
        await loadFullSession(chatId);
      }
    },
    [chats],
  );

  // Delete a chat
  const deleteChat = useCallback(
    async (chatId) => {
      try {
        // Delete from MongoDB
        await api.deleteSession(chatId);

        // Remove from local state
        setChats((prev) => {
          const filtered = prev.filter((c) => c.id !== chatId);
          if (chatId === activeChatId) {
            setActiveChatId(null);
          }
          return filtered;
        });
      } catch (error) {
        console.error("[ChatManager] Error deleting chat:", error);
        // Still remove from local state on error
        setChats((prev) => prev.filter((c) => c.id !== chatId));
        if (chatId === activeChatId) {
          setActiveChatId(null);
        }
      }
    },
    [activeChatId],
  );

  // Rename a chat
  const renameChat = useCallback(async (chatId, newTitle) => {
    try {
      // Update in MongoDB
      await api.updateSessionTitle(chatId, newTitle.trim() || "Untitled");

      // Update local state
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === chatId
            ? { ...chat, title: newTitle.trim() || "Untitled", updatedAt: new Date().toISOString() }
            : chat,
        ),
      );
    } catch (error) {
      console.error("[ChatManager] Error renaming chat:", error);
      // Update local state anyway
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === chatId ? { ...chat, title: newTitle.trim() || "Untitled" } : chat,
        ),
      );
    }
  }, []);

  // Add a message to a chat (uses activeChatId if targetChatId not provided)
  const addMessage = useCallback(
    async (role, content, type = "text", targetChatId = null) => {
      const chatId = targetChatId || activeChatId;
      if (!chatId) return null;

      const message = {
        id: `msg_${Date.now()}`,
        role, // 'user' | 'assistant' | 'system'
        content,
        type, // 'text' | 'greeting' | 'rejection' | 'agent-complete'
        timestamp: new Date().toISOString(),
      };

      try {
        // Add to MongoDB
        const response = await api.addMessage(chatId, role, content, type);

        if (response.status === "success" && response.messageData) {
          // Use the message data from server
          message.id = response.messageData.id;
          message.timestamp = response.messageData.timestamp;
        }
      } catch (error) {
        console.error("[ChatManager] Error adding message to DB:", error);
        // Continue with local update even if DB fails
      }

      // Update local state
      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id !== chatId) return chat;

          const updatedMessages = [...chat.messages, message];
          // Auto-update title from first user message
          const newTitle =
            chat.messages.length === 0 && role === "user" ? generateTitle(content) : chat.title;

          // Update title in DB if it changed
          if (newTitle !== chat.title) {
            api.updateSessionTitle(chatId, newTitle).catch(console.error);
          }

          return {
            ...chat,
            title: newTitle,
            messages: updatedMessages,
            updatedAt: new Date().toISOString(),
          };
        }),
      );

      return message;
    },
    [activeChatId],
  );

  // Update agent data for a chat (uses activeChatId if targetChatId not provided)
  const updateAgentData = useCallback(
    async (agentId, data, targetChatId = null) => {
      const chatId = targetChatId || activeChatId;
      if (!chatId) return;

      try {
        // Update in MongoDB
        await api.updateAgentData(chatId, agentId, data);
      } catch (error) {
        console.error("[ChatManager] Error updating agent data in DB:", error);
      }

      // Update local state
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                agentData: { ...chat.agentData, [agentId]: data },
                updatedAt: new Date().toISOString(),
              }
            : chat,
        ),
      );
    },
    [activeChatId],
  );

  // Update workflow state for a chat (uses activeChatId if targetChatId not provided)
  const updateWorkflowState = useCallback(
    async (updatesOrFn, targetChatId = null) => {
      const chatId = targetChatId || activeChatId;
      if (!chatId) return;

      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id !== chatId) return chat;

          // Support both object and function updaters
          const updates =
            typeof updatesOrFn === "function" ? updatesOrFn(chat.workflowState) : updatesOrFn;

          const newWorkflowState = { ...chat.workflowState, ...updates };

          // Update in MongoDB (async, don't wait)
          api.updateWorkflowState(chatId, newWorkflowState).catch(console.error);

          return {
            ...chat,
            workflowState: newWorkflowState,
            updatedAt: new Date().toISOString(),
          };
        }),
      );
    },
    [activeChatId],
  );

  // Reset workflow state (for new analysis in same chat or new chat)
  const resetWorkflowState = useCallback(
    async (chatId = activeChatId) => {
      if (!chatId) return;

      const resetState = {
        activeAgent: null,
        showAgentDataByAgent: {},
        reportReady: false,
        workflowComplete: false,
        queryRejected: false,
        systemResponse: null,
        panelCollapsed: false,
        showAgentFlow: false,
        drugName: null,
        indication: null,
      };

      try {
        // Update in MongoDB
        await api.updateWorkflowState(chatId, resetState);
      } catch (error) {
        console.error("[ChatManager] Error resetting workflow state in DB:", error);
      }

      // Update local state
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                workflowState: resetState,
                agentData: {},
              }
            : chat,
        ),
      );
    },
    [activeChatId],
  );

  // Clear all chats
  const clearAllChats = useCallback(async () => {
    try {
      // Delete all sessions from MongoDB
      const deletionPromises = chats.map((chat) => api.deleteSession(chat.id));
      await Promise.allSettled(deletionPromises);
    } catch (error) {
      console.error("[ChatManager] Error clearing all chats from DB:", error);
    }

    // Clear local state
    setChats([]);
    setActiveChatId(null);
  }, [chats]);

  // Restore a deleted chat (re-create in MongoDB)
  const restoreChat = useCallback(async (chat) => {
    try {
      // Create new session in MongoDB with old data
      const response = await api.createSession(chat.title);

      if (response.status === "success" && response.session) {
        const restoredChat = {
          ...chat,
          id: response.session.sessionId,
          createdAt: response.session.createdAt,
          updatedAt: response.session.updatedAt,
        };

        // Restore messages
        for (const msg of chat.messages) {
          await api.addMessage(restoredChat.id, msg.role, msg.content, msg.type);
        }

        // Restore agent data
        for (const [agentId, data] of Object.entries(chat.agentData)) {
          await api.updateAgentData(restoredChat.id, agentId, data);
        }

        // Restore workflow state
        await api.updateWorkflowState(restoredChat.id, chat.workflowState);

        // Add to local state
        setChats((prev) => {
          const restored = [restoredChat, ...prev].sort(
            (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
          );
          return restored;
        });
      }
    } catch (error) {
      console.error("[ChatManager] Error restoring chat:", error);
    }
  }, []);

  // Get message count for a chat
  const getMessageCount = useCallback(
    (chatId) => {
      const chat = chats.find((c) => c.id === chatId);
      return chat ? chat.messages.filter((m) => m.role === "user").length : 0;
    },
    [chats],
  );

  return {
    // State
    chats,
    activeChatId,
    activeChat,
    isLoaded,
    isLoading,

    // Actions
    createChat,
    selectChat,
    deleteChat,
    restoreChat,
    renameChat,
    addMessage,
    updateAgentData,
    updateWorkflowState,
    resetWorkflowState,
    clearAllChats,
    getMessageCount,
    loadFullSession,

    // Direct state setter for bulk updates
    setActiveChatId,
  };
}
