import { useState, useEffect, useCallback, useRef } from "react";

const STORAGE_KEY = "pharma_chat_history";
const MAX_CHATS = 50; // Maximum number of chats to store

/**
 * Custom hook for managing chat sessions with persistence
 * Provides ChatGPT-like functionality for multiple conversations
 */
export function useChatManager() {
  // All chats stored with full state
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const saveTimeoutRef = useRef(null);

  // Load chats from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setChats(parsed);
          // Don't auto-select last chat - start fresh
        }
      }
    } catch (error) {
      console.error("[ChatManager] Error loading chats:", error);
    }
    setIsLoaded(true);
  }, []);

  // Debounced save to localStorage
  const saveToStorage = useCallback((chatsToSave) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      try {
        // Only save essential data to prevent storage bloat
        const minimalChats = chatsToSave.slice(-MAX_CHATS).map((chat) => ({
          id: chat.id,
          title: chat.title,
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt,
          messages: chat.messages,
          agentData: chat.agentData,
          workflowState: chat.workflowState,
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(minimalChats));
      } catch (error) {
        console.error("[ChatManager] Error saving chats:", error);
        // If storage is full, remove oldest chats
        if (error.name === "QuotaExceededError") {
          const reducedChats = chatsToSave.slice(-10);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(reducedChats));
        }
      }
    }, 500);
  }, []);

  // Save whenever chats change
  useEffect(() => {
    if (isLoaded && chats.length > 0) {
      saveToStorage(chats);
    }
  }, [chats, isLoaded, saveToStorage]);

  // Get the active chat object
  const activeChat = chats.find((c) => c.id === activeChatId) || null;

  // Generate a title from the first message
  const generateTitle = (message) => {
    if (!message) return "New Analysis";
    const words = message.trim().split(/\s+/).slice(0, 6).join(" ");
    return words.length > 40 ? words.substring(0, 40) + "..." : words || "New Analysis";
  };

  // Create a new chat
  const createChat = useCallback(() => {
    const newChat = {
      id: Date.now(),
      title: "New Analysis",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [], // Array of { role: 'user'|'system', content, timestamp, type? }
      agentData: {}, // { 0: {...}, 1: {...}, ... } - data from each agent
      workflowState: {
        activeAgent: null,
        showAgentDataByAgent: {},
        reportReady: false,
        workflowComplete: false,
        queryRejected: false,
        systemResponse: null,
        panelCollapsed: false,
        showAgentFlow: false, // Only true during actual analysis workflow
      },
    };
    setChats((prev) => [...prev, newChat]);
    setActiveChatId(newChat.id);
    return newChat;
  }, []);

  // Select an existing chat
  const selectChat = useCallback((chatId) => {
    setActiveChatId(chatId);
  }, []);

  // Delete a chat
  const deleteChat = useCallback(
    (chatId) => {
      setChats((prev) => {
        const filtered = prev.filter((c) => c.id !== chatId);
        // If we deleted the active chat, clear selection
        if (chatId === activeChatId) {
          setActiveChatId(null);
        }
        // Update storage immediately for deletion
        if (filtered.length === 0) {
          localStorage.removeItem(STORAGE_KEY);
        }
        return filtered;
      });
    },
    [activeChatId],
  );

  // Rename a chat
  const renameChat = useCallback((chatId, newTitle) => {
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId
          ? { ...chat, title: newTitle.trim() || "Untitled", updatedAt: new Date().toISOString() }
          : chat,
      ),
    );
  }, []);

  // Add a message to the active chat
  const addMessage = useCallback(
    (role, content, type = "text") => {
      if (!activeChatId) return null;

      const message = {
        id: Date.now(),
        role, // 'user' | 'assistant' | 'system'
        content,
        type, // 'text' | 'greeting' | 'rejection' | 'agent-complete'
        timestamp: new Date().toISOString(),
      };

      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id !== activeChatId) return chat;

          const updatedMessages = [...chat.messages, message];
          // Auto-update title from first user message
          const newTitle =
            chat.messages.length === 0 && role === "user" ? generateTitle(content) : chat.title;

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

  // Update agent data for the active chat
  const updateAgentData = useCallback(
    (agentId, data) => {
      if (!activeChatId) return;

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === activeChatId
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

  // Update workflow state for the active chat
  const updateWorkflowState = useCallback(
    (updatesOrFn) => {
      if (!activeChatId) return;

      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id !== activeChatId) return chat;

          // Support both object and function updaters
          const updates =
            typeof updatesOrFn === "function" ? updatesOrFn(chat.workflowState) : updatesOrFn;

          return {
            ...chat,
            workflowState: { ...chat.workflowState, ...updates },
            updatedAt: new Date().toISOString(),
          };
        }),
      );
    },
    [activeChatId],
  );

  // Reset workflow state (for new analysis in same chat or new chat)
  const resetWorkflowState = useCallback(
    (chatId = activeChatId) => {
      if (!chatId) return;

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                workflowState: {
                  activeAgent: null,
                  showAgentDataByAgent: {},
                  reportReady: false,
                  workflowComplete: false,
                  queryRejected: false,
                  systemResponse: null,
                  panelCollapsed: false,
                  showAgentFlow: false,
                },
                agentData: {},
              }
            : chat,
        ),
      );
    },
    [activeChatId],
  );

  // Clear all chats
  const clearAllChats = useCallback(() => {
    setChats([]);
    setActiveChatId(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Restore a deleted chat
  const restoreChat = useCallback((chat) => {
    setChats((prev) => {
      // Add chat back, sorted by updatedAt
      const restored = [...prev, chat].sort(
        (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
      );
      return restored;
    });
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

    // Direct state setter for bulk updates
    setActiveChatId,
  };
}
