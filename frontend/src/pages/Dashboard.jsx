import React, { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  Plus,
  Loader2,
  Network,
  TrendingUp,
  Scale,
  Microscope,
  Database,
  FileText,
  Globe,
  Shield,
  Activity,
  BookOpen,
  FileBarChart,
  X,
  AlertCircle,
  Download,
  ChevronLeft,
  ChevronRight,
  Paperclip,
  File,
  Sparkles,
  Mic,
  MicOff,
  Volume2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatSidebar } from "@/components/ChatSidebar";
import { useChatManager } from "@/hooks/useChatManager";
import { useVoiceAssistant, VoiceMode } from "@/hooks/useVoiceAssistant";
import { LandingPage } from "@/components/LandingPage";
import { api } from "@/services/api";
import { VoiceAssistantPanel, VoiceIndicator } from "@/components/VoiceAssistantPanel";
import {
  IQVIADataDisplay,
  EXIMDataDisplay,
  PatentDataDisplay,
  ClinicalDataDisplay,
  InternalKnowledgeDisplay,
  WebIntelDisplay,
} from "@/components/AgentDataDisplaysNew";
import { getAgentSummary } from "@/components/AgentDataDisplays";
import { VizList } from "@/components/visualizations";
import { AgentErrorBoundary } from "@/components/ErrorBoundary";

const AGENT_ID_MAP = {
  iqvia: 0,
  exim: 1,
  patent: 2,
  clinical: 3,
  internal: 4,
  internal_knowledge: 4,
  web: 5,
  webintel: 5,
  webintelligence: 5,
};

const AGENTS = [
  {
    id: 0,
    key: "iqvia",
    name: "IQVIA Insights",
    desc: "Market size, growth & competitive analysis",
    icon: TrendingUp,
    color: "blue",
    features: ["Sales data analytics", "Market trends & forecasts", "Competitive intelligence"],
  },
  {
    id: 1,
    key: "exim",
    name: "Exim Trends",
    desc: "Export-Import & trade analysis",
    icon: Globe,
    color: "cyan",
    features: ["Trade volume tracking", "API price analysis", "Tariff & regulation insights"],
  },
  {
    id: 2,
    key: "patent",
    name: "Patent Landscape",
    desc: "FTO analysis & lifecycle strategy",
    icon: Shield,
    color: "amber",
    features: ["Patent expiry tracking", "FTO risk assessment", "IP landscape mapping"],
  },
  {
    id: 3,
    key: "clinical",
    name: "Clinical Trials",
    desc: "MoA mapping & pipeline analysis",
    icon: Activity,
    color: "green",
    features: ["Trial database search", "MoA identification", "Pipeline opportunity scan"],
  },
  {
    id: 4,
    key: "internal",
    name: "Internal Knowledge",
    desc: "Company data & previous research",
    icon: BookOpen,
    color: "pink",
    features: ["Past research archive", "Expert network access", "Document intelligence"],
  },
  {
    id: 5,
    key: "web",
    name: "Web Intelligence",
    desc: "Real-time web signals & market trends",
    icon: Globe,
    color: "violet",
    features: [
      "Trending topics tracking",
      "News & updates monitoring",
      "Community discussions analysis",
    ],
  },
];

const colorClasses = {
  blue: {
    active: "from-blue-500/15 via-blue-500/5 to-transparent",
    inactive: "from-blue-900/10 border-border hover:border-blue-500/50",
    icon: "bg-blue-500/15 border border-blue-500/30",
    iconColor: "text-blue-400",
    dot: "text-blue-400",
    border: "border-blue-500/30",
  },
  cyan: {
    active: "from-teal-500/15 via-teal-500/5 to-transparent",
    inactive: "from-teal-900/10 border-border hover:border-teal-500/50",
    icon: "bg-teal-500/15 border border-teal-500/30",
    iconColor: "text-teal-400",
    dot: "text-teal-400",
    border: "border-teal-500/30",
  },
  amber: {
    active: "from-amber-500/15 via-amber-500/5 to-transparent",
    inactive: "from-amber-900/10 border-border hover:border-amber-500/50",
    icon: "bg-amber-500/15 border border-amber-500/30",
    iconColor: "text-amber-400",
    dot: "text-amber-400",
    border: "border-amber-500/30",
  },
  green: {
    active: "from-emerald-500/15 via-emerald-500/5 to-transparent",
    inactive: "from-emerald-900/10 border-border hover:border-emerald-500/50",
    icon: "bg-emerald-500/15 border border-emerald-500/30",
    iconColor: "text-emerald-400",
    dot: "text-emerald-400",
    border: "border-emerald-500/30",
  },
  pink: {
    active: "from-pink-500/15 via-pink-500/5 to-transparent",
    inactive: "from-pink-900/10 border-border hover:border-pink-500/50",
    icon: "bg-pink-500/15 border border-pink-500/30",
    iconColor: "text-pink-400",
    dot: "text-pink-400",
    border: "border-pink-500/30",
  },
  violet: {
    active: "from-violet-500/15 via-violet-500/5 to-transparent",
    inactive: "from-violet-900/10 border-border hover:border-violet-500/50",
    icon: "bg-violet-500/15 border border-violet-500/30",
    iconColor: "text-violet-400",
    dot: "text-violet-400",
    border: "border-violet-500/30",
  },
};

// Helper function to get hex color from Tailwind color class
const getColorHex = (colorClass) => {
  if (colorClass.includes("blue")) return "#3b82f6";
  if (colorClass.includes("teal")) return "#1aab8a";
  if (colorClass.includes("cyan")) return "#06b6d4";
  if (colorClass.includes("amber")) return "#f59e0b";
  if (colorClass.includes("emerald") || colorClass.includes("green")) return "#22c55e";
  if (colorClass.includes("pink")) return "#ec4899";
  if (colorClass.includes("violet")) return "#8b5cf6";
  return "#1aab8a"; // Default to teal
};

export default function GeminiDashboard() {
  const {
    chats,
    activeChatId,
    activeChat,
    createChatFromPrompt,
    sendPrompt,
    selectChat,
    deleteChat,
    updateChatSession,
  } = useChatManager();
  const [planningPlan, setPlanningPlan] = useState(null);
  const [planningReady, setPlanningReady] = useState(false);

  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [isPinned, setIsPinned] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [showAgentFlowLocal, setShowAgentFlowLocal] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // File upload state for Internal Knowledge Agent
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const agentContentRef = useRef(null);

  // Track used prompt suggestions to avoid duplicates
  const [usedPrompts, setUsedPrompts] = useState(new Set());

  // Voice Assistant Integration
  const voice = useVoiceAssistant(activeChatId, {
    autoSpeak: true,
    language: "en-US",
    onTranscript: (text) => {
      console.log("[Voice] Transcript received:", text);
    },
    onResponse: (response) => {
      console.log("[Voice] Response:", response);
    },
    onError: (error) => {
      console.error("[Voice] Error:", error);
      setApiError(error);
    },
    onReadyForPlanning: async (refinedPrompt) => {
      console.log("[Voice] Ready for planning with prompt:", refinedPrompt);
      // Submit the refined prompt through normal flow
      setPrompt(refinedPrompt);
      // Trigger send after a brief delay to allow state update
      setTimeout(() => {
        handleVoiceSendPrompt(refinedPrompt);
      }, 100);
    },
    onModeChange: (mode) => {
      console.log("[Voice] Mode changed to:", mode);
    },
  });

  // Handle voice-triggered prompt submission
  const handleVoiceSendPrompt = async (text) => {
    if (!text?.trim() || isLoading) return;

    setIsLoading(true);
    setApiError(null);

    try {
      let result;
      if (!activeChatId) {
        result = await createChatFromPrompt(text);
      } else {
        result = await sendPrompt(text);
      }

      // Reset voice state after successful submission
      voice.reset();

      // Handle planning states
      if (result?.queryType === "planning") {
        setPlanningReady(false);
        setPlanningPlan(null);
        return;
      }

      if (result?.queryType === "ready") {
        setPlanningPlan(result.plan);
        setPlanningReady(true);
        return;
      }
    } catch (error) {
      console.error("[Voice] Submit error:", error);
      setApiError("Failed to process voice input");
    } finally {
      setIsLoading(false);
      setPrompt("");
    }
  };

  // Map chats to have 'id' property for ChatSidebar compatibility
  // Filter out any chats without sessionId to prevent errors
  const mappedChats = chats
    .filter((chat) => chat && chat.sessionId)
    .map((chat) => ({
      ...chat,
      id: chat.sessionId,
      messages: chat.chatHistory || [],
      updatedAt: chat.updatedAt || chat.createdAt || new Date().toISOString(),
    }));

  useEffect(() => {
    setPlanningPlan(null);
    setPlanningReady(false);
  }, [activeChatId]);

  // Normalize latest prompt's agent data (agentsData is now an array of prompt entries)
  const latestAgentsEntry = Array.isArray(activeChat?.agentsData)
    ? activeChat.agentsData[activeChat.agentsData.length - 1]
    : null;

  // Normalize agent keys so both "CLINICAL_AGENT" and "clinical" map consistently
  const normalizeAgentKeys = (agentsObj = {}) => {
    const out = {};
    Object.entries(agentsObj).forEach(([key, value]) => {
      // Skip non-agent keys
      if (!key || typeof key !== "string") return;

      let normalizedKey = key
        .toLowerCase()
        .replace(/_agent$/, "")
        .replace(/\s+/g, "");

      // Handle special mappings BEFORE removing underscores
      if (
        normalizedKey === "internal_knowledge" ||
        normalizedKey === "internalknowledge" ||
        normalizedKey === "internal"
      ) {
        normalizedKey = "internal";
      } else if (
        normalizedKey === "web_intelligence" ||
        normalizedKey === "webintelligence" ||
        normalizedKey === "webintel" ||
        normalizedKey === "web"
      ) {
        normalizedKey = "web";
      } else if (
        normalizedKey === "report_generator" ||
        normalizedKey === "reportgenerator" ||
        normalizedKey === "report"
      ) {
        normalizedKey = "report";
      } else if (
        normalizedKey === "clinical_trials" ||
        normalizedKey === "clinicaltrials" ||
        normalizedKey === "clinical"
      ) {
        normalizedKey = "clinical";
      } else {
        // Remove underscores for other keys (iqvia, exim, patent stay as-is)
        normalizedKey = normalizedKey.replace(/_/g, "");
      }

      // Store with normalized key (only if not already present and has valid data)
      if (!out[normalizedKey] && value) {
        out[normalizedKey] = value;
      }
    });
    return out;
  };

  // Try multiple sources for agent data
  const rawAgentData =
    latestAgentsEntry?.agents ||
    (typeof activeChat?.agentsData === "object" && !Array.isArray(activeChat?.agentsData)
      ? activeChat.agentsData
      : {});
  const agentData = normalizeAgentKeys(rawAgentData);

  // Count only the 6 actual agents, not report or other keys
  const VALID_AGENT_KEYS = ["iqvia", "exim", "patent", "clinical", "internal", "web"];
  const agentDataCount = Object.keys(agentData).filter((key) =>
    VALID_AGENT_KEYS.includes(key),
  ).length;

  const hasAgentData = agentDataCount > 0;

  // Get suggested next prompts from latest entry or session, filter out used prompts
  const allSuggestedPrompts =
    latestAgentsEntry?.suggestedNextPrompts || activeChat?.suggestedNextPrompts || [];

  const suggestedNextPrompts = allSuggestedPrompts.filter(
    (suggestion) => !usedPrompts.has(suggestion.prompt),
  );

  // Debug logging
  useEffect(() => {
    console.log("[Dashboard] Agent Data Debug:");
    console.log("  Raw agentsData:", activeChat?.agentsData);
    console.log("  Latest entry:", latestAgentsEntry);
    console.log("  Raw agent data (pre-normalization):", rawAgentData);
    console.log("  Normalized agentData:", agentData);
    console.log("  Agent keys in normalized data:", Object.keys(agentData));

    console.log("[Dashboard] Agent Status:");
    AGENTS.forEach((agent) => {
      const data = agentData[agent.key];
      console.log(
        `  ${agent.name} (${agent.key}):`,
        data ? `✓ HAS DATA (keys: ${Object.keys(data).join(", ")})` : "✗ NO DATA",
      );
    });
    console.log("[Dashboard] Raw agentData keys:", Object.keys(agentData));
    console.log("[Dashboard] Normalized agent data:", agentData);
    console.log("[Dashboard] Agent count:", agentDataCount);
  }, [agentData, agentDataCount]);

  const workflowState = activeChat?.workflowState || {
    activeAgent: null,
    showAgentDataByAgent: {},
    reportReady: false,
    workflowComplete: false,
    queryRejected: false,
    systemResponse: null,
    panelCollapsed: false,
    showAgentFlow: false,
  };
  const chatHistory = activeChat?.chatHistory || [];

  useEffect(() => {
    setPrompt("");
    setIsLoading(false);
    setApiError(null);
    setIsPinned(false);
    setSelectedAgent(null);

    // Don't auto-show agent flow when selecting a chat - show chat view first
    setShowAgentFlowLocal(false);

    setUploadedFile(null);

    // Reset used prompts when changing chats
    setUsedPrompts(new Set());
  }, [activeChatId]);

  const handleNewChat = () => {
    setApiError(null);
    // Reset used prompts for new chat
    setUsedPrompts(new Set());
    // Just deselect current chat to show landing page
    selectChat(null);
  };

  const handleSelectChat = (chatId) => {
    selectChat(chatId);
  };

  const handleDeleteChat = (chatId) => {
    deleteChat(chatId);
  };

  // Handle suggested prompt clicks from agent displays
  const handleSuggestedPromptClick = (promptText) => {
    // Track this prompt as used to avoid showing it again
    setUsedPrompts((prev) => new Set([...prev, promptText]));
    setPrompt(promptText);
    setShowAgentFlowLocal(false);
  };

  // File upload handlers for Internal Knowledge Agent
  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "text/csv",
    ];

    if (!allowedTypes.includes(file.type)) {
      setApiError("Unsupported file type. Please upload PDF, PPT, Excel, Word, TXT, or CSV files.");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setApiError("File too large. Maximum size is 10MB.");
      return;
    }

    setIsUploading(true);
    setApiError(null);

    try {
      // Get or create session ID
      let sessionId = localStorage.getItem("activeSessionId");
      if (!sessionId) {
        // Create a new session if none exists
        const result = await api.createSession();
        sessionId = result.sessionId;
        localStorage.setItem("activeSessionId", sessionId);
      }

      // Upload the file
      const response = await api.uploadDocument(sessionId, file);
      setUploadedFile({
        name: file.name,
        size: file.size,
        type: file.type,
        ...response,
      });
      console.log("[Dashboard] File uploaded successfully:", response);
    } catch (error) {
      console.error("[Dashboard] File upload failed:", error);
      setApiError("Failed to upload file. Please try again.");
    } finally {
      setIsUploading(false);
      // Reset input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveFile = async () => {
    const sessionId = localStorage.getItem("activeSessionId");
    if (sessionId && uploadedFile) {
      try {
        await api.deleteDocument(sessionId);
      } catch (error) {
        console.error("[Dashboard] Failed to delete document:", error);
      }
    }
    setUploadedFile(null);
  };

  const handleSendPrompt = async () => {
    const text = prompt.trim();
    if (!text || isLoading) return;

    setPrompt("");
    setIsLoading(true);
    setApiError(null);

    try {
      let result;
      if (!activeChatId) {
        result = await createChatFromPrompt(text);
      } else {
        result = await sendPrompt(text);
      }

      // 🧠 PLANNING MODE
      if (result?.queryType === "planning") {
        setPlanningReady(false);
        setPlanningPlan(null);
        return;
      }

      if (result?.queryType === "ready") {
        setPlanningPlan(result.plan);
        setPlanningReady(true);
        return;
      }
    } catch {
      setApiError("Failed to process prompt");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendPrompt();
    }
  };

  const handleDownloadReport = async (promptId) => {
    try {
      console.log("Downloading report for promptId:", promptId);

      // Show loading state
      setIsLoading(true);

      // Call the API to generate and download the report
      const blob = await api.generateReport(promptId);

      // Create a download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `pharma-report-${promptId.substring(0, 8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log("Report downloaded successfully");
    } catch (error) {
      console.error("Error downloading report:", error);
      setApiError("Failed to download report. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAgentFlow = () => {
    setShowAgentFlowLocal((prev) => {
      const newValue = !prev;
      // Auto-collapse sidebar when opening agent panel
      if (newValue) {
        setIsSidebarCollapsed(true);
      }
      return newValue;
    });
  };

  // Get the current display state
  const activeAgent = workflowState.activeAgent;
  const workflowComplete = workflowState.workflowComplete;
  const queryRejected = workflowState.queryRejected;
  const reportReady = workflowState.reportReady;
  const panelCollapsed = workflowState.panelCollapsed;
  const showAgentFlow = showAgentFlowLocal;

  const activeAgentIndex = activeAgent !== null ? AGENT_ID_MAP[activeAgent] : null;
  const selectedAgentIndex =
    selectedAgent !== null
      ? typeof selectedAgent === "string"
        ? AGENT_ID_MAP[selectedAgent]
        : selectedAgent
      : null;

  // Auto-select first agent with data when workflow is complete and no agent selected
  const firstAgentWithDataIndex = useMemo(() => {
    if (workflowComplete && selectedAgentIndex === null) {
      for (let i = 0; i < AGENTS.length; i++) {
        if (agentData[AGENTS[i].key]) {
          return i;
        }
      }
    }
    return null;
  }, [workflowComplete, selectedAgentIndex, agentData]);

  const currentAgentIndex = selectedAgentIndex ?? firstAgentWithDataIndex ?? activeAgentIndex;

  console.log(
    "[Dashboard] hasAgentData:",
    hasAgentData,
    "| agentData keys:",
    Object.keys(agentData),
  );

  const shouldShowAgentFlow = hasAgentData && showAgentFlow;

  const sessionId = localStorage.getItem("activeSessionId");

  const renderAgentDataDisplay = (agentIndex) => {
    const agent = AGENTS[agentIndex];
    if (!agent) {
      console.warn("[renderAgentDataDisplay] No agent found for index:", agentIndex);
      return null;
    }

    let agentResponse = agentData[agent.key];
    console.log(
      `[renderAgentDataDisplay] Agent ${agent.key} (index ${agentIndex}) raw:`,
      agentResponse,
    );

    // Handle array response (new format from orchestrator)
    if (Array.isArray(agentResponse)) {
      // Get the latest result
      const latest = agentResponse[agentResponse.length - 1];
      if (latest && latest.result) {
        agentResponse = latest.result;
        console.log(`[renderAgentDataDisplay] Extracted result from array:`, agentResponse);
      } else if (agentResponse.length > 0) {
        agentResponse = agentResponse[agentResponse.length - 1];
      }
    }

    if (!agentResponse) {
      console.warn(`[renderAgentDataDisplay] No data for agent ${agent.key}`);
      return null;
    }

    // Check if this agent is currently active/running
    const isAgentRunning = activeAgent === agent.key && !workflowComplete;
    console.log(
      `[renderAgentDataDisplay] Agent ${agent.key} - isRunning: ${isAgentRunning}, activeAgent: ${activeAgent}, workflowComplete: ${workflowComplete}`,
    );

    // Extract visualizations - can be at top level or nested in data
    let visualizations = agentResponse.visualizations || agentResponse.data?.visualizations || [];

    // Filter out unwanted trade intelligence text for EXIM agent
    if (agent.key === "exim" && Array.isArray(visualizations)) {
      visualizations = visualizations.filter((v) => {
        const title = v.title?.toLowerCase() || "";
        const content = v.content?.toLowerCase() || "";
        // Remove any visualization containing "trade intelligence summary"
        return (
          !title.includes("trade intelligence summary") &&
          !content.includes("trade intelligence summary")
        );
      });
    }

    console.log(`[renderAgentDataDisplay] ${agent.key} visualizations:`, visualizations);

    // Get the summary banner for this agent - show even if running for initial visibility
    const summaryBanner = getAgentSummary(agent.key, agentResponse);

    // If agent provides visualizations in standardized format, render them generically
    // But for web intelligence and IQVIA, prefer legacy renderer even with empty viz array to show content
    const hasVisualizationsWithContent =
      Array.isArray(visualizations) &&
      visualizations.length > 0 &&
      visualizations.some((v) => v.vizType && v.data);

    // Use viz system only if we have meaningful visualizations AND it's not a case where legacy shows more content
    const shouldUseVizSystem =
      hasVisualizationsWithContent && !["web", "iqvia"].includes(agent.key); // Prefer legacy for these as they have richer displays

    if (shouldUseVizSystem) {
      return (
        <AgentErrorBoundary agentName={agent.name}>
          {summaryBanner}
          <VizList visualizations={visualizations} agentName={agent.name} />
        </AgentErrorBoundary>
      );
    }

    // Extract actual data (could be nested)
    const data = agentResponse.data || agentResponse;
    console.log(`[renderAgentDataDisplay] ${agent.key} fallback data:`, data);

    // Get the summary banner for this agent (for legacy renderers) - show even if running
    const summaryBanner2 = getAgentSummary(agent.key, data);

    // Fallback to legacy per-agent renderers - wrapped in error boundaries
    switch (agent.key) {
      case "iqvia":
        return (
          <AgentErrorBoundary agentName="IQVIA">
            {summaryBanner2}
            <IQVIADataDisplay data={data} isFirstPrompt={true} />
            {/* Also show any visualizations that exist */}
            {visualizations.length > 0 && (
              <div className="mt-4">
                <VizList visualizations={visualizations} agentName="IQVIA" />
              </div>
            )}
          </AgentErrorBoundary>
        );
      case "exim":
        return (
          <AgentErrorBoundary agentName="EXIM Trade">
            {summaryBanner2}
            <EXIMDataDisplay data={data} showChart={true} />
          </AgentErrorBoundary>
        );
      case "patent":
        return (
          <AgentErrorBoundary agentName="Patent">
            {summaryBanner2}
            <PatentDataDisplay data={data} isFirstPrompt={true} />
          </AgentErrorBoundary>
        );
      case "clinical":
        return (
          <AgentErrorBoundary agentName="Clinical Trials">
            {summaryBanner2}
            <ClinicalDataDisplay data={data} isFirstPrompt={true} />
          </AgentErrorBoundary>
        );
      case "internal":
        return (
          <AgentErrorBoundary agentName="Internal Knowledge">
            {summaryBanner2}
            <InternalKnowledgeDisplay data={data} />
          </AgentErrorBoundary>
        );
      case "web":
        return (
          <AgentErrorBoundary agentName="Web Intelligence">
            {summaryBanner2}
            <WebIntelDisplay data={data} />
            {/* Also show any visualizations that exist */}
            {visualizations.length > 0 && (
              <div className="mt-4">
                <VizList visualizations={visualizations} agentName="Web Intelligence" />
              </div>
            )}
          </AgentErrorBoundary>
        );
      case "report":
        return (
          <AgentErrorBoundary agentName="Report Generator">
            <VizList visualizations={data.visualizations || []} agentName="Report" />
          </AgentErrorBoundary>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Chat Sidebar */}
      <ChatSidebar
        chats={mappedChats}
        activeChatId={activeChatId}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onRestoreChat={() => {}}
        onRenameChat={() => {}}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Area */}
      <main className="flex-1 flex flex-col h-screen justify-between relative">
        {/* Floating Agent Panel Toggle - Shows when panel is hidden */}
        <AnimatePresence>
          {hasAgentData && !showAgentFlow && (
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleToggleAgentFlow}
              className="absolute top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card/90 backdrop-blur-xl border border-border/40 hover:border-primary/40 hover:bg-card text-muted-foreground hover:text-foreground shadow-lg transition-all duration-200"
            >
              <Network size={14} className="text-primary" />
              <span className="text-xs font-medium">Show Agents</span>
              <span className="flex items-center justify-center min-w-[20px] px-1.5 py-0.5 rounded-md bg-primary/15 text-[10px] font-semibold text-primary">
                {agentDataCount}
              </span>
              <ChevronRight size={14} />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto flex flex-col hide-scrollbar">
          {/* Content Area */}
          <div className={`flex-1 overflow-y-auto ${shouldShowAgentFlow ? "py-0" : ""}`}>
            <AnimatePresence mode="wait">
              {shouldShowAgentFlow ? (
                /* Agent Flow Visualization - Premium UI */
                <motion.div
                  key="agent-flow"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex h-full p-4 gap-4"
                >
                  {/* Left Sidebar - Floating Detached Design */}
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="w-[260px] shrink-0 rounded-2xl bg-card/90 backdrop-blur-xl border border-border/40 shadow-2xl flex flex-col overflow-hidden"
                  >
                    {/* Orchestrator Header with Hide Button */}
                    <div className="p-3 space-y-2">
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 border border-zinc-700/50">
                        <div className="relative">
                          <div className="p-2 rounded-lg bg-primary/20 border border-primary/30">
                            <motion.div
                              animate={{ rotate: workflowComplete ? 0 : 360 }}
                              transition={{
                                duration: 8,
                                repeat: workflowComplete ? 0 : Infinity,
                                ease: "linear",
                              }}
                            >
                              <Network className="text-primary" size={16} />
                            </motion.div>
                          </div>
                          <div
                            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-zinc-900 ${workflowComplete ? "bg-emerald-400" : "bg-primary animate-pulse"}`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-semibold text-foreground">
                            Orchestrator
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className={`text-[10px] font-medium ${workflowComplete ? "text-emerald-400" : "text-primary"}`}
                            >
                              {workflowComplete ? "Analysis Complete" : "Processing..."}
                            </span>
                            {!workflowComplete && (
                              <Loader2 className="animate-spin text-primary" size={10} />
                            )}
                          </div>
                        </div>
                        <div className="text-[10px] text-muted-foreground px-2 py-1 rounded-md bg-zinc-800/80 border border-zinc-700/50">
                          {agentDataCount}/6
                        </div>
                      </div>

                      {/* Hide Agents Button - Moved to top */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleToggleAgentFlow}
                        className="w-full py-2 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-2 bg-card/60 hover:bg-card text-muted-foreground hover:text-foreground border border-border/40 hover:border-primary/40 transition-all duration-200"
                      >
                        <ChevronLeft size={13} />
                        <span>Hide Agents</span>
                      </motion.button>
                    </div>

                    {/* Agent List */}
                    <div className="flex-1 px-3 py-2 overflow-y-auto">
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                        Agents
                      </div>
                      <div className="space-y-0.5">
                        {AGENTS.map((agent, index) => {
                          const Icon = agent.icon;
                          const isSelected = currentAgentIndex === agent.id;
                          const isRunning = activeAgentIndex === agent.id && !workflowComplete;
                          const hasData = !!agentData[agent.key];
                          const colors = colorClasses[agent.color];

                          return (
                            <motion.button
                              key={agent.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              whileHover={
                                hasData || isRunning
                                  ? {
                                      x: 2,
                                      transition: { duration: 0.15, ease: "easeOut" },
                                    }
                                  : {}
                              }
                              whileTap={hasData || isRunning ? { scale: 0.98 } : {}}
                              transition={{ delay: 0.03 * index, type: "spring", stiffness: 200 }}
                              onClick={() => {
                                if (!hasData && !isRunning) return;
                                setSelectedAgent(agent.id);
                                if (agentContentRef.current) {
                                  agentContentRef.current.scrollTop = 0;
                                }
                              }}
                              disabled={!hasData && !isRunning}
                              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-200 relative group
                                ${
                                  isSelected
                                    ? "bg-white/[0.08]"
                                    : hasData
                                      ? "hover:bg-white/[0.06]"
                                      : "opacity-30 cursor-not-allowed"
                                }`}
                            >
                              {/* Selection indicator with glow */}
                              {isSelected && (
                                <motion.div
                                  layoutId="agent-indicator"
                                  className={`absolute left-0 top-1 bottom-1 w-[2px] rounded-full ${colors.dot.replace("text-", "bg-")}`}
                                  style={{
                                    boxShadow: `0 0 8px ${getColorHex(colors.dot)}40`,
                                  }}
                                />
                              )}

                              <motion.div
                                whileHover={hasData ? { scale: 1.1 } : {}}
                                transition={{ duration: 0.15 }}
                                className={`p-1.5 rounded-md transition-all duration-200 ${isSelected ? colors.icon : "bg-white/[0.05] group-hover:bg-white/[0.08]"}`}
                              >
                                <Icon
                                  className={`transition-colors duration-200 ${isSelected ? colors.iconColor : hasData ? "text-muted-foreground group-hover:text-foreground/70" : "text-muted-foreground"}`}
                                  size={14}
                                />
                              </motion.div>
                              <span
                                className={`flex-1 text-left text-[12px] font-medium transition-colors duration-200 ${isSelected ? "text-foreground" : hasData ? "text-muted-foreground group-hover:text-foreground/80" : "text-muted-foreground"}`}
                              >
                                {agent.name}
                              </span>
                              {isRunning && (
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                >
                                  <Loader2 className={colors.iconColor} size={14} />
                                </motion.div>
                              )}
                              {hasData && !isRunning && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className={`relative w-2 h-2 rounded-full ${colors.dot.replace("text-", "bg-")}`}
                                >
                                  {/* Subtle pulse ring */}
                                  <motion.div
                                    className={`absolute inset-0 rounded-full ${colors.dot.replace("text-", "bg-")}`}
                                    initial={{ scale: 1, opacity: 0.6 }}
                                    animate={{ scale: 1.8, opacity: 0 }}
                                    transition={{
                                      duration: 1.5,
                                      repeat: Infinity,
                                      ease: "easeOut",
                                    }}
                                  />
                                </motion.div>
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>

                  {/* Right Panel - Agent Output */}
                  <AnimatePresence mode="wait">
                    {(activeAgentIndex !== null || workflowComplete) &&
                      !queryRejected &&
                      !panelCollapsed &&
                      currentAgentIndex !== null && (
                        <motion.div
                          key={`agent-panel-${currentAgentIndex}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="flex-1 min-w-0 flex flex-col rounded-2xl bg-card/30 border border-border/20"
                        >
                          {/* Agent Content - match sidebar margins for alignment */}
                          <div ref={agentContentRef} className="flex-1 overflow-y-auto p-4 pb-8">
                            {(() => {
                              const currentAgent = AGENTS[currentAgentIndex];
                              const hasCurrentAgentData =
                                currentAgent && agentData[currentAgent.key];

                              if (currentAgentIndex !== null && !hasCurrentAgentData) {
                                return (
                                  <div className="flex flex-col items-center justify-center h-full gap-4 py-12">
                                    <motion.div
                                      animate={{ rotate: 360 }}
                                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                    >
                                      <Loader2 className="text-primary" size={32} />
                                    </motion.div>
                                    <div className="text-center">
                                      <p className="text-sm text-foreground font-medium">
                                        {currentAgentIndex === 0 && "Analyzing market data..."}
                                        {currentAgentIndex === 1 && "Processing trade trends..."}
                                        {currentAgentIndex === 2 && "Scanning patent landscape..."}
                                        {currentAgentIndex === 3 && "Querying clinical trials..."}
                                        {currentAgentIndex === 4 && "Searching knowledge base..."}
                                        {currentAgentIndex === 5 && "Gathering web intelligence..."}
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        This may take a moment
                                      </p>
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <div className="text-foreground leading-relaxed w-full">
                                  {currentAgentIndex !== null &&
                                    renderAgentDataDisplay(currentAgentIndex)}
                                </div>
                              );
                            })()}
                          </div>
                        </motion.div>
                      )}
                  </AnimatePresence>
                </motion.div>
              ) : !activeChatId ? (
                /* Landing Page - Show when no chat is selected */
                <div className="flex-1 flex items-center justify-center overflow-hidden hide-scrollbar">
                  <LandingPage
                    onStartNewChat={handleNewChat}
                    showFullGrid={true}
                    apiError={apiError}
                    isLoading={isLoading}
                  />
                </div>
              ) : (
                /* Chat Interface View */
                <motion.div
                  key="chat-view"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="h-full flex flex-col"
                >
                  {/* Chat Messages */}
                  <div className="flex-1 overflow-y-auto">
                    <div className="space-y-5 py-4 pb-24 max-w-3xl mx-auto px-6">
                      {!activeChat || chatHistory.length === 0 ? (
                        <LandingPage
                          onSelectFeature={(title) => {
                            setPrompt(`Analyze ${title.toLowerCase()} for Semaglutide`);
                          }}
                          showFullGrid={false}
                        />
                      ) : (
                        <>
                          {chatHistory.map((msg, idx) => (
                            <motion.div
                              key={msg.id || idx}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.03, ease: [0.22, 1, 0.36, 1] }}
                              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[85%] rounded-2xl px-5 py-3.5 ${
                                  msg.role === "user"
                                    ? "bg-gradient-to-br from-primary to-emerald-600 text-primary-foreground shadow-lg shadow-primary/25"
                                    : msg.type === "greeting"
                                      ? "bg-gradient-to-br from-card via-card/95 to-card/90 border border-primary/20 text-foreground shadow-md"
                                      : msg.type === "rejection"
                                        ? "bg-destructive/10 border border-destructive/20 text-foreground"
                                        : msg.type === "agent-complete"
                                          ? "bg-emerald-500/5 border border-emerald-500/15 text-foreground shadow-sm"
                                          : "bg-card/80 backdrop-blur-sm border border-border/40 text-foreground shadow-sm"
                                }`}
                              >
                                <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
                                  {msg.content}
                                </p>
                                {msg.type === "agent-complete" && msg.promptId && (
                                  <motion.button
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleDownloadReport(msg.promptId)}
                                    disabled={isLoading}
                                    className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium text-sm transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {isLoading ? (
                                      <>
                                        <Loader2 className="animate-spin" size={16} />
                                        Generating...
                                      </>
                                    ) : (
                                      <>
                                        <Download size={16} />
                                        Download Report
                                      </>
                                    )}
                                  </motion.button>
                                )}
                              </div>
                            </motion.div>
                          ))}

                          {/* Continue Research Suggestions - In Chat */}
                          {workflowComplete && suggestedNextPrompts.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.5 }}
                              className="pt-4"
                            >
                              <div className="flex items-center gap-2 mb-3">
                                <Sparkles className="text-primary" size={14} />
                                <span className="text-xs font-semibold text-muted-foreground">
                                  Continue your research
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {suggestedNextPrompts.slice(0, 3).map((suggestion, idx) => (
                                  <motion.button
                                    key={idx}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.6 + idx * 0.1 }}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleSuggestedPromptClick(suggestion.prompt)}
                                    className="px-4 py-2.5 text-sm rounded-xl bg-card/80 border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all text-muted-foreground hover:text-foreground"
                                  >
                                    {suggestion.prompt}
                                  </motion.button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </>
                      )}
                      {isLoading && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex justify-start"
                        >
                          <div className="bg-muted rounded-2xl px-4 py-3 flex items-center gap-3">
                            <Loader2 className="animate-spin text-primary" size={16} />
                            <span className="text-sm text-muted-foreground">
                              Analyzing your query...
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Input Section - Clean Seamless Design with Smooth Fade */}
        <div className="relative">
          {/* Smooth fade gradient - content appears to emerge from below */}
          <div
            className="absolute -top-32 left-0 right-0 h-32 pointer-events-none z-10"
            style={{
              background:
                "linear-gradient(to top, hsl(var(--background)) 0%, hsl(var(--background) / 0.95) 15%, hsl(var(--background) / 0.7) 35%, hsl(var(--background) / 0.4) 55%, hsl(var(--background) / 0.15) 75%, transparent 100%)",
            }}
          />

          <div className="relative z-20 px-6 pt-2 pb-6 bg-background">
            <div className="max-w-3xl mx-auto relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-cyan-500/15 rounded-full blur-xl opacity-0 group-hover:opacity-60 transition-opacity duration-500" />
              <div className="relative flex flex-col gap-3">
                
                {/* Voice Assistant Panel */}
                <VoiceAssistantPanel
                  isActive={voice.isActive}
                  isListening={voice.isListening}
                  isSpeaking={voice.isSpeaking}
                  isProcessing={voice.isProcessing}
                  mode={voice.mode}
                  transcript={voice.transcript}
                  interimTranscript={voice.interimTranscript}
                  voiceResponse={voice.voiceResponse}
                  refinedPrompt={voice.refinedPrompt}
                  error={voice.error}
                  awaitingConfirmation={voice.awaitingConfirmation}
                  onDeactivate={voice.deactivate}
                  onStopSpeaking={voice.stopSpeaking}
                  onConfirm={voice.confirmPrompt}
                  onReject={() => voice.confirmPrompt(false)}
                  onReset={voice.reset}
                />

                {/* Analysis Plan Ready */}
                {planningReady && planningPlan && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-2 p-4 rounded-xl border border-primary/30 bg-primary/10"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-primary mb-1">Analysis Plan Ready</h3>
                        <p className="text-sm text-muted-foreground">
                          Agents selected: {planningPlan.agents.join(", ")}
                        </p>
                        {planningPlan.drug && (
                          <p className="text-sm text-muted-foreground">
                            Drug: {planningPlan.drug.join(", ")}
                          </p>
                        )}
                        {planningPlan.indication && (
                          <p className="text-sm text-muted-foreground">
                            Indication: {planningPlan.indication.join(", ")}
                          </p>
                        )}
                      </div>
                      <Button
                        onClick={async () => {
                          try {
                            setIsLoading(true);
                            setApiError(null);
                            setShowAgentFlowLocal(true);
                            setIsSidebarCollapsed(true);
                            const res = await api.executePlan(activeChatId);
                            if (res.session && res.session.sessionId) {
                              updateChatSession(res.session);
                            }
                            setPlanningReady(false);
                            setPlanningPlan(null);
                          } catch (error) {
                            console.error("[Dashboard] Execute failed:", error);
                            setApiError("Failed to execute plan. Please try again.");
                          } finally {
                            setIsLoading(false);
                          }
                        }}
                        className="shrink-0"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 animate-spin" size={16} />
                            Executing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2" size={16} />
                            Run Analysis
                          </>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Uploaded file indicator */}
                {uploadedFile && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg"
                  >
                    <File size={16} className="text-primary" />
                    <span className="text-sm text-foreground flex-1 truncate">
                      {uploadedFile.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {(uploadedFile.size / 1024).toFixed(1)} KB
                    </span>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={handleRemoveFile}
                      className="p-1 hover:bg-destructive/20 rounded-md transition-colors"
                    >
                      <X size={14} className="text-muted-foreground hover:text-destructive" />
                    </motion.button>
                  </motion.div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".pdf,.pptx,.ppt,.xlsx,.xls,.docx,.txt,.csv"
                    className="hidden"
                  />

                  <div className="relative flex-1">
                    <Input
                      placeholder={voice.isActive ? (voice.isListening ? "Listening..." : voice.isSpeaking ? "Speaking..." : "Processing...") : "Ask anything..."}
                      className={`w-full h-14 pl-16 pr-28 bg-card/80 backdrop-blur-xl border-border/50 rounded-full text-base shadow-lg focus-visible:ring-2 focus-visible:ring-primary/40 transition-all placeholder:text-muted-foreground/50 ${
                        voice.isActive 
                          ? voice.isListening 
                            ? "border-red-500/50 ring-2 ring-red-500/20" 
                            : voice.isSpeaking 
                              ? "border-violet-500/50 ring-2 ring-violet-500/20"
                              : "border-emerald-500/50 ring-2 ring-emerald-500/20"
                          : ""
                      }`}
                      value={voice.interimTranscript || prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={isLoading || voice.isActive}
                    />

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading || isLoading || voice.isActive}
                      className={`absolute left-4 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full flex items-center justify-center transition-all duration-200 ${
                        uploadedFile
                          ? "bg-primary/20 text-primary scale-100"
                          : isUploading
                            ? "text-muted-foreground cursor-not-allowed scale-100"
                            : "text-muted-foreground hover:text-primary hover:bg-primary/10 hover:scale-110"
                      }`}
                      title="Attach document for Internal Knowledge Agent"
                    >
                      {isUploading ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : (
                        <Paperclip size={18} />
                      )}
                    </button>

                    {/* Voice button */}
                    {voice.isSupported && (
                      <button
                        onClick={voice.toggle}
                        disabled={isLoading || voice.isProcessing}
                        className={`absolute right-14 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full flex items-center justify-center transition-all duration-200 ${
                          voice.isActive
                            ? voice.isListening
                              ? "bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse"
                              : voice.isSpeaking
                                ? "bg-violet-500 text-white shadow-lg shadow-violet-500/30"
                                : voice.isProcessing
                                  ? "bg-amber-500 text-white"
                                  : "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                            : "text-muted-foreground hover:text-primary hover:bg-primary/10 hover:scale-105"
                        }`}
                        title={voice.isActive ? "Deactivate voice assistant" : "Activate voice assistant"}
                      >
                        {voice.isProcessing ? (
                          <Loader2 className="animate-spin" size={18} />
                        ) : voice.isSpeaking ? (
                          <Volume2 size={18} />
                        ) : voice.isActive ? (
                          <Mic size={18} className={voice.isListening ? "animate-pulse" : ""} />
                        ) : (
                          <Mic size={18} />
                        )}
                      </button>
                    )}

                    <button
                      onClick={handleSendPrompt}
                      disabled={isLoading || !prompt.trim() || voice.isActive}
                      className={`absolute right-4 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full flex items-center justify-center transition-all duration-200 ${
                        isLoading || !prompt.trim() || voice.isActive
                          ? "bg-muted text-muted-foreground cursor-not-allowed scale-100"
                          : "bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-110 hover:bg-primary/90"
                      }`}
                    >
                      {isLoading ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : (
                        <Send size={18} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
