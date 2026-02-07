import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  Sparkles,
  Settings,
  History,
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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { api, AGENT_ID_MAP, AGENT_INDEX_MAP } from "@/services/api";
import {
  IQVIADataDisplay,
  EXIMDataDisplay,
  PatentDataDisplay,
  ClinicalDataDisplay,
  InternalKnowledgeDataDisplay,
  ReportGeneratorDataDisplay,
} from "@/components/AgentDataDisplays";
import { ChatSidebar } from "@/components/ChatSidebar";
import { useChatManager } from "@/hooks/useChatManager";

export default function GeminiDashboard() {
  // Chat management hook
  const {
    chats,
    activeChatId,
    activeChat,
    isLoaded,
    createChat,
    selectChat,
    deleteChat,
    restoreChat,
    renameChat,
    addMessage,
    updateAgentData,
    updateWorkflowState,
    resetWorkflowState,
  } = useChatManager();

  // Local UI state (not persisted)
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [isPinned, setIsPinned] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);

  // Get workflow state from active chat
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
  const agentData = activeChat?.agentData || {};

  // Reset local UI state when switching chats
  useEffect(() => {
    setPrompt("");
    setIsLoading(false);
    setApiError(null);
    setIsPinned(false);
    setSelectedAgent(null);
  }, [activeChatId]);

  // Handle creating a new chat
  const handleNewChat = useCallback(() => {
    createChat();
    setPrompt("");
    setIsLoading(false);
    setApiError(null);
    setIsPinned(false);
    setSelectedAgent(null);
  }, [createChat]);

  // Handle selecting an existing chat
  const handleSelectChat = useCallback(
    (chatId) => {
      selectChat(chatId);
    },
    [selectChat],
  );

  // Start the agent workflow
  const startAgentWorkflow = async (inputPrompt, chatId, promptIndex = 1) => {
    if (!inputPrompt?.trim() || !chatId) return;

    console.log("[Dashboard] Starting agent workflow:", { inputPrompt, chatId, promptIndex });

    // Reset workflow state for new analysis (pass chatId for newly created chats)
    updateWorkflowState(
      {
        activeAgent: null,
        showAgentDataByAgent: {},
        reportReady: false,
        workflowComplete: false,
        queryRejected: false,
        systemResponse: null,
        panelCollapsed: false,
        showAgentFlow: true, // Show agent flow UI during analysis
      },
      chatId,
    );

    setIsPinned(false);
    setSelectedAgent(null);
    setIsLoading(true);
    setApiError(null);

    try {
      console.log("[Dashboard] Calling API runAnalysisStream...");
      const response = await api.runAnalysisStream(
        inputPrompt,
        null, // Let LLM orchestrator extract drug name
        null, // Let LLM orchestrator extract indication
        promptIndex,
      );
      console.log("[Dashboard] API response received:", response);

      // Check if this is a greeting response
      if (response.is_greeting === true) {
        console.log("[Dashboard] Greeting detected");
        updateWorkflowState(
          {
            queryRejected: true,
            showAgentFlow: false, // Don't show agent flow for greetings
            systemResponse: {
              type: "greeting",
              message: response.greeting_response,
              timestamp: new Date().toISOString(),
            },
          },
          chatId,
        );
        addMessage("assistant", response.greeting_response, "greeting", chatId);
        setIsLoading(false);
        return;
      }

      // Check if query was rejected
      if (response.is_valid === false) {
        console.log("[Dashboard] Query rejected:", response.rejection_reason);
        const rejectionMessage =
          response.rejection_reason || "Query not related to pharmaceutical drug repurposing.";
        setApiError(rejectionMessage);
        updateWorkflowState(
          {
            queryRejected: true,
            showAgentFlow: false, // Don't show agent flow for rejections
            systemResponse: {
              type: "rejection",
              message: rejectionMessage,
              timestamp: new Date().toISOString(),
            },
          },
          chatId,
        );
        addMessage("assistant", rejectionMessage, "rejection", chatId);
        setIsLoading(false);
        return;
      }

      // Store fetched data
      const newAgentData = {};
      const agentSequence = response.agent_sequence || [];

      console.log("[Dashboard] Agent sequence from API:", agentSequence);
      console.log(
        "[Dashboard] Extracted drug:",
        response.drug_name,
        "indication:",
        response.indication,
      );

      // Update workflow state with drug name and indication
      updateWorkflowState(
        {
          drugName: response.drug_name,
          indication: response.indication,
        },
        chatId,
      );

      for (const agentId of agentSequence) {
        const frontendIndex = AGENT_ID_MAP[agentId];
        if (frontendIndex !== undefined && response.agents && response.agents[agentId]) {
          newAgentData[frontendIndex] = response.agents[agentId]?.data || {};
        }
      }

      // Animate through agents sequentially
      const agentDelays = {
        iqvia: 800,
        exim: 800,
        patent: 800,
        clinical: 800,
        internal_knowledge: 800,
        report_generator: 800,
      };

      const runAgentAtIndex = (idx) => {
        const agentId = agentSequence[idx];
        const frontendIndex = AGENT_ID_MAP[agentId];

        // Update agent data for this agent using numeric index
        if (frontendIndex !== undefined && newAgentData[frontendIndex]) {
          updateAgentData(frontendIndex, newAgentData[frontendIndex], chatId);
        }

        // Use function updater to get fresh state
        updateWorkflowState(
          (prevState) => ({
            activeAgent: agentId,
            showAgentDataByAgent: {
              ...prevState.showAgentDataByAgent,
              [agentId]: true,
            },
          }),
          chatId,
        );

        if (!isPinned) {
          setSelectedAgent(frontendIndex); // Set numeric index for rendering
        }

        setTimeout(() => {
          const nextIndex = idx + 1;
          if (nextIndex < agentSequence.length) {
            runAgentAtIndex(nextIndex);
          } else {
            updateWorkflowState(
              {
                workflowComplete: true,
                reportReady: agentSequence.includes("report_generator"),
              },
              chatId,
            );
            setIsLoading(false);
            addMessage(
              "assistant",
              "Analysis complete. All agents have finished processing.",
              "agent-complete",
              chatId,
            );
          }
        }, agentDelays[agentId] || 800);
      };

      runAgentAtIndex(0);
    } catch (error) {
      console.error("[API] Error:", error);
      setApiError(error.message);
      setIsLoading(false);
    }
  };

  // Handle sending a prompt
  const handleSendPrompt = () => {
    const trimmed = prompt.trim();
    if (!trimmed || isLoading) return;

    let chatId = activeChatId;
    let isNewChat = false;

    // Create new chat if none selected
    if (!chatId) {
      const newChat = createChat();
      chatId = newChat.id;
      isNewChat = true;
    }

    // Calculate promptIndex BEFORE adding message
    const existingChat = chats.find((c) => c.id === chatId);
    const userMsgCount = existingChat
      ? existingChat.messages.filter((m) => m.role === "user").length
      : 0;
    const promptIndex = isNewChat ? 1 : userMsgCount + 1;

    // Clear input
    setPrompt("");

    // Add user message (pass chatId for newly created chats)
    addMessage("user", trimmed, "text", chatId);

    // Start workflow
    startAgentWorkflow(trimmed, chatId, promptIndex);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendPrompt();
    }
  };

  const handleDownloadReport = async () => {
    try {
      console.log("[Dashboard] Generating PDF report...");
      const result = await api.generatePdf(
        workflowState.drugName || "semaglutide", // Use extracted drug name or fallback
        workflowState.indication || "general", // Use extracted indication or fallback
      );
      if (result.status === "success") {
        await api.downloadPdf(result.file_name);
      } else {
        alert("Failed to generate PDF report.");
      }
    } catch (error) {
      console.error("[Dashboard] Error generating PDF:", error);
      alert("Failed to generate PDF report.");
    }
  };

  const handleClosePanel = () => {
    updateWorkflowState({
      panelCollapsed: true,
    });
  };

  const handleExpandPanel = () => {
    updateWorkflowState({
      panelCollapsed: false,
    });
  };

  const handleCloseRejection = () => {
    updateWorkflowState({
      queryRejected: false,
      systemResponse: null,
    });
    setApiError(null);
  };

  const handleToggleAgentFlow = () => {
    updateWorkflowState((prev) => ({
      showAgentFlow: !prev.showAgentFlow,
    }));
  };

  // Get the current display state
  const activeAgent = workflowState.activeAgent;
  const showAgentDataByAgent = workflowState.showAgentDataByAgent;
  const workflowComplete = workflowState.workflowComplete;
  const queryRejected = workflowState.queryRejected;
  const reportReady = workflowState.reportReady;
  const systemResponse = workflowState.systemResponse;
  const panelCollapsed = workflowState.panelCollapsed;
  const showAgentFlow = workflowState.showAgentFlow;

  // Convert activeAgent string to numeric index for rendering
  // activeAgent can be "iqvia", "exim", etc. or null
  const activeAgentIndex = activeAgent !== null ? AGENT_ID_MAP[activeAgent] : null;

  // Convert selectedAgent to numeric index (selectedAgent is set via setSelectedAgent)
  // It can be either a string (from workflow) or a number (from card click)
  const selectedAgentIndex =
    selectedAgent !== null
      ? typeof selectedAgent === "string"
        ? AGENT_ID_MAP[selectedAgent]
        : selectedAgent
      : null;

  // Current agent index for display (prefer selected, fallback to active)
  const currentAgentIndex = selectedAgentIndex ?? activeAgentIndex;

  // Determine if we should show agent visualization
  const hasAgentData = Object.keys(showAgentDataByAgent).length > 0;
  // Show agents by default on landing page or during analysis
  const shouldShowAgentFlow =
    !activeChat ||
    activeChat.messages.length === 0 ||
    (showAgentFlow && (activeAgent !== null || workflowComplete || hasAgentData));

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Chat Sidebar */}
      <ChatSidebar
        chats={chats}
        activeChatId={activeChatId}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={deleteChat}
        onRestoreChat={restoreChat}
        onRenameChat={renameChat}
      />

      {/* Main Area */}
      <main className="flex-1 flex flex-col h-screen justify-between">
        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Agent Flow Toggle Bar - Only shows when there's agent data */}
          {hasAgentData && (
            <div className="px-6 py-3 border-b border-border bg-card/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Network className="text-primary" size={18} />
                  <span className="text-sm font-medium text-foreground">Agent Analysis</span>
                  {workflowComplete ? (
                    <span className="px-2 py-0.5 text-xs font-medium bg-emerald-500/20 text-emerald-500 rounded-full">
                      Complete
                    </span>
                  ) : activeAgent !== null ? (
                    <span className="px-2 py-0.5 text-xs font-medium bg-primary/20 text-primary rounded-full flex items-center gap-1">
                      <Loader2 size={10} className="animate-spin" />
                      Running
                    </span>
                  ) : null}
                </div>
                <span className="text-muted-foreground text-sm">
                  {Object.keys(showAgentDataByAgent).length} agent
                  {Object.keys(showAgentDataByAgent).length !== 1 ? "s" : ""} executed
                </span>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleToggleAgentFlow}
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                  showAgentFlow
                    ? "bg-muted text-foreground hover:bg-muted/80"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                {showAgentFlow ? (
                  <>
                    <X size={16} />
                    Hide Agents
                  </>
                ) : (
                  <>
                    <Network size={16} />
                    Show Agents
                  </>
                )}
              </motion.button>
            </div>
          )}

          {/* Content Area */}
          <div className={`flex-1 overflow-hidden ${shouldShowAgentFlow ? "p-6" : ""}`}>
            <AnimatePresence mode="wait">
              {shouldShowAgentFlow ? (
                /* Agent Flow Visualization */
                <motion.div
                  key="agent-flow"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex gap-6 h-full max-w-7xl mx-auto items-stretch"
                >
                  {/* Left Side - Agent Boxes */}
                  <motion.div
                    className="transition-all duration-700 ease-in-out"
                    animate={{
                      width: activeAgent !== null || workflowComplete ? "40%" : "100%",
                    }}
                  >
                    <div className="relative">
                      {activeAgent === null && !workflowComplete && (
                        <svg
                          className="absolute inset-0 w-full h-full pointer-events-none hidden lg:block opacity-80"
                          viewBox="0 0 1200 420"
                          preserveAspectRatio="none"
                        >
                          <path
                            d="M600 90 C600 150 100 180 100 260"
                            fill="none"
                            stroke="#ffffff"
                            strokeOpacity="0.85"
                            strokeWidth="2.5"
                            strokeDasharray="12 8"
                            strokeLinecap="round"
                            className="animate-dash"
                          />
                          <path
                            d="M600 90 C600 150 300 180 300 260"
                            fill="none"
                            stroke="#ffffff"
                            strokeOpacity="0.85"
                            strokeWidth="2.5"
                            strokeDasharray="12 8"
                            strokeLinecap="round"
                            className="animate-dash"
                          />
                          <path
                            d="M600 90 C600 150 500 180 500 260"
                            fill="none"
                            stroke="#ffffff"
                            strokeOpacity="0.85"
                            strokeWidth="2.5"
                            strokeDasharray="12 8"
                            strokeLinecap="round"
                            className="animate-dash"
                          />
                          <path
                            d="M600 90 C600 150 700 180 700 260"
                            fill="none"
                            stroke="#ffffff"
                            strokeOpacity="0.85"
                            strokeWidth="2.5"
                            strokeDasharray="12 8"
                            strokeLinecap="round"
                            className="animate-dash"
                          />
                          <path
                            d="M600 90 C600 150 900 180 900 260"
                            fill="none"
                            stroke="#ffffff"
                            strokeOpacity="0.85"
                            strokeWidth="2.5"
                            strokeDasharray="12 8"
                            strokeLinecap="round"
                            className="animate-dash"
                          />
                          <path
                            d="M600 90 C600 150 1100 180 1100 260"
                            fill="none"
                            stroke="#ffffff"
                            strokeOpacity="0.85"
                            strokeWidth="2.5"
                            strokeDasharray="12 8"
                            strokeLinecap="round"
                            className="animate-dash"
                          />
                        </svg>
                      )}
                    </div>

                    {/* Orchestrator Box */}
                    <div className="flex justify-center mb-10 relative z-10">
                      <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                        className="relative group"
                      >
                        <motion.div
                          className="absolute -inset-1 bg-gradient-to-r from-primary via-blue-500 to-blue-600 rounded-xl blur-xl opacity-40"
                          animate={{ opacity: [0.25, 0.4, 0.25], scale: [1, 1.02, 1] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        />
                        <Card className="relative bg-gradient-to-r from-primary via-blue-500 to-blue-600 border-0 shadow-lg shadow-primary/20">
                          <CardContent className="p-4 px-8">
                            <div className="flex items-center justify-center gap-3">
                              <motion.div
                                className="relative"
                                animate={{ rotate: [0, 360] }}
                                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                              >
                                <Network className="text-white drop-shadow-lg" size={24} />
                              </motion.div>
                              <div className="text-center">
                                <h2 className="text-lg font-bold text-white drop-shadow-md">
                                  Orchestrator Agent
                                </h2>
                                <p className="text-purple-100 text-xs mt-0.5 font-medium">
                                  Controls and coordinates all agents
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    </div>

                    {/* Agent Boxes */}
                    <div
                      className={`grid transition-all duration-700 items-stretch ${
                        activeAgentIndex !== null || workflowComplete
                          ? "grid-cols-1 gap-2 h-auto"
                          : "grid-cols-6 gap-3 h-auto"
                      } pb-4 relative z-10`}
                    >
                      {/* Agent Cards */}
                      {[
                        {
                          id: 0,
                          name: "IQVIA Insights",
                          desc: "Market size, growth & competitive analysis",
                          icon: TrendingUp,
                          color: "blue",
                          features: [
                            "Sales data analytics",
                            "Market trends & forecasts",
                            "Competitive intelligence",
                          ],
                        },
                        {
                          id: 1,
                          name: "Exim Trends",
                          desc: "Export-Import & trade analysis",
                          icon: Globe,
                          color: "cyan",
                          features: [
                            "Trade volume tracking",
                            "API price analysis",
                            "Tariff & regulation insights",
                          ],
                        },
                        {
                          id: 2,
                          name: "Patent Landscape",
                          desc: "FTO analysis & lifecycle strategy",
                          icon: Shield,
                          color: "amber",
                          features: [
                            "Patent expiry tracking",
                            "FTO risk assessment",
                            "IP landscape mapping",
                          ],
                        },
                        {
                          id: 3,
                          name: "Clinical Trials",
                          desc: "MoA mapping & pipeline analysis",
                          icon: Activity,
                          color: "green",
                          features: [
                            "Trial database search",
                            "MoA identification",
                            "Pipeline opportunity scan",
                          ],
                        },
                        {
                          id: 4,
                          name: "Internal Knowledge",
                          desc: "Company data & previous research",
                          icon: BookOpen,
                          color: "pink",
                          features: [
                            "Past research archive",
                            "Expert network access",
                            "Document intelligence",
                          ],
                        },
                        {
                          id: 5,
                          name: "Report Generator",
                          desc: "Comprehensive PDF report generation",
                          icon: FileBarChart,
                          color: "purple",
                          features: [
                            "Executive summaries",
                            "Data visualization",
                            "Strategic recommendations",
                          ],
                        },
                      ].map((agent, index) => {
                        const Icon = agent.icon;
                        const agentStringId = AGENT_INDEX_MAP[agent.id]; // Convert numeric id to string like "iqvia"
                        const isActive = activeAgentIndex === agent.id;
                        const hasData =
                          showAgentDataByAgent[agentStringId] || showAgentDataByAgent[agent.id];
                        const colorClasses = {
                          blue: {
                            active:
                              "from-blue-900/20 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.4)]",
                            inactive: "from-blue-900/10 border-border hover:border-blue-600/50",
                            icon: "bg-blue-500/10 border-blue-500/20",
                            iconColor: "text-blue-500",
                            dot: "text-blue-500",
                          },
                          cyan: {
                            active:
                              "from-teal-900/20 border-teal-500 shadow-[0_0_20px_rgba(6,182,212,0.4)]",
                            inactive: "from-teal-900/10 border-border hover:border-teal-600/50",
                            icon: "bg-teal-500/10 border-teal-500/20",
                            iconColor: "text-teal-500",
                            dot: "text-teal-500",
                          },
                          amber: {
                            active:
                              "from-amber-900/20 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)]",
                            inactive: "from-amber-900/10 border-border hover:border-amber-600/50",
                            icon: "bg-amber-500/10 border-amber-500/20",
                            iconColor: "text-amber-500",
                            dot: "text-amber-500",
                          },
                          green: {
                            active:
                              "from-emerald-900/20 border-emerald-500 shadow-[0_0_20px_rgba(34,197,94,0.4)]",
                            inactive:
                              "from-emerald-900/10 border-border hover:border-emerald-600/50",
                            icon: "bg-emerald-500/10 border-emerald-500/20",
                            iconColor: "text-emerald-500",
                            dot: "text-emerald-500",
                          },
                          pink: {
                            active:
                              "from-pink-900/20 border-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.4)]",
                            inactive: "from-pink-900/10 border-border hover:border-pink-600/50",
                            icon: "bg-pink-500/10 border-pink-500/20",
                            iconColor: "text-pink-500",
                            dot: "text-pink-500",
                          },
                          purple: {
                            active:
                              "from-violet-900/20 border-violet-500 shadow-[0_0_20px_rgba(168,85,247,0.4)]",
                            inactive: "from-violet-900/10 border-border hover:border-violet-600/50",
                            icon: "bg-violet-500/10 border-violet-500/20",
                            iconColor: "text-violet-500",
                            dot: "text-violet-500",
                          },
                        };
                        const colors = colorClasses[agent.color];

                        return (
                          <motion.div
                            key={agent.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              delay: 0.1 * (index + 1),
                              type: "spring",
                              stiffness: 100,
                            }}
                            whileHover={{ y: -4, transition: { duration: 0.2 } }}
                            className="relative group"
                          >
                            <Card
                              className={`relative transition-all duration-500 overflow-hidden ${
                                isActive
                                  ? `bg-gradient-to-br ${colors.active} to-zinc-900`
                                  : `bg-gradient-to-br ${colors.inactive} to-zinc-900 hover:scale-[1.02]`
                              } ${activeAgentIndex !== null || workflowComplete ? "h-auto" : "h-full min-h-[185px]"} ${
                                hasData ? "cursor-pointer" : "cursor-default"
                              }`}
                              onClick={() => {
                                if (!hasData) return;
                                setIsPinned(activeAgentIndex !== agent.id);
                                setSelectedAgent(agent.id); // Keep as numeric for rendering
                              }}
                            >
                              <CardContent
                                className={`${
                                  activeAgentIndex !== null || workflowComplete
                                    ? "p-2.5 flex flex-row items-center gap-2.5"
                                    : "p-3 flex flex-col h-full"
                                }`}
                              >
                                <div
                                  className={`flex items-center gap-2 shrink-0 ${
                                    activeAgentIndex === null && !workflowComplete ? "mb-2" : ""
                                  }`}
                                >
                                  <motion.div
                                    className={`${
                                      activeAgentIndex !== null || workflowComplete
                                        ? "p-1.5 rounded-lg"
                                        : "p-2 rounded-lg"
                                    } ${colors.icon} border`}
                                    whileHover={{ scale: 1.1 }}
                                  >
                                    <Icon
                                      className={colors.iconColor}
                                      size={activeAgentIndex !== null || workflowComplete ? 16 : 18}
                                    />
                                  </motion.div>
                                  <div className="flex-1 min-w-0">
                                    <h3
                                      className={`font-semibold text-foreground ${
                                        activeAgentIndex !== null || workflowComplete
                                          ? "text-xs"
                                          : "text-sm"
                                      } truncate`}
                                    >
                                      {agent.name}
                                    </h3>
                                    {(activeAgent !== null || workflowComplete) && (
                                      <p className="text-[10px] text-muted-foreground truncate leading-tight">
                                        {agent.desc}
                                      </p>
                                    )}
                                  </div>
                                  {isActive && !reportReady && (
                                    <Loader2
                                      className={`animate-spin ${colors.iconColor}`}
                                      size={16}
                                    />
                                  )}
                                </div>
                                {activeAgentIndex === null && !workflowComplete && (
                                  <div className="mt-3 flex-1 flex flex-col text-xs text-muted-foreground gap-2">
                                    {agent.features.map((feature, i) => (
                                      <motion.div
                                        key={i}
                                        className="flex items-center gap-2 leading-tight"
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.2 + i * 0.1 }}
                                      >
                                        <span className={`${colors.dot} text-xs flex-shrink-0`}>
                                          •
                                        </span>
                                        <span className="leading-tight min-w-0">{feature}</span>
                                      </motion.div>
                                    ))}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>

                  {/* Right Panel - Agent Details */}
                  <AnimatePresence>
                    {(activeAgentIndex !== null || workflowComplete) &&
                      !queryRejected &&
                      !panelCollapsed && (
                        <motion.div
                          initial={{ opacity: 0, x: 100 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 100 }}
                          transition={{ duration: 0.7 }}
                          className="flex-1 h-full pb-2"
                        >
                          <Card className="bg-card border-border h-full">
                            <CardContent className="p-6 pb-8 h-full flex flex-col">
                              <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-border">
                                <div className="flex items-center gap-3">
                                  {currentAgentIndex === 0 && (
                                    <TrendingUp className="text-blue-500" size={24} />
                                  )}
                                  {currentAgentIndex === 1 && (
                                    <Network className="text-teal-500" size={24} />
                                  )}
                                  {currentAgentIndex === 2 && (
                                    <Scale className="text-amber-500" size={24} />
                                  )}
                                  {currentAgentIndex === 3 && (
                                    <Microscope className="text-emerald-500" size={24} />
                                  )}
                                  {currentAgentIndex === 4 && (
                                    <Database className="text-pink-500" size={24} />
                                  )}
                                  {currentAgentIndex === 5 && (
                                    <FileText className="text-violet-500" size={24} />
                                  )}
                                  <h2 className="text-xl font-bold text-foreground">
                                    {currentAgentIndex === 0 && "IQVIA Market Insights"}
                                    {currentAgentIndex === 1 && "Exim Trends Analysis"}
                                    {currentAgentIndex === 2 && "Patent Landscape"}
                                    {currentAgentIndex === 3 && "Clinical Trial Analysis"}
                                    {currentAgentIndex === 4 && "Internal Knowledge Base"}
                                    {currentAgentIndex === 5 && "Report Generation"}
                                  </h2>
                                </div>
                              </div>

                              <ScrollArea className="flex-1">
                                {!agentData[currentAgentIndex] ? (
                                  <div className="flex flex-col items-center justify-center h-full gap-4">
                                    <Loader2 className="animate-spin text-primary" size={48} />
                                    <p className="text-muted-foreground text-lg">
                                      {currentAgentIndex === 0 && "Fetching market data..."}
                                      {currentAgentIndex === 1 &&
                                        "Analyzing export-import trends..."}
                                      {currentAgentIndex === 2 && "Querying patent databases..."}
                                      {currentAgentIndex === 3 && "Searching trial databases..."}
                                      {currentAgentIndex === 4 &&
                                        "Searching internal knowledge base..."}
                                      {currentAgentIndex === 5 && "Aggregating agent outputs..."}
                                    </p>
                                  </div>
                                ) : (
                                  <div className="space-y-6 text-foreground leading-relaxed">
                                    {(() => {
                                      const currentData = agentData[currentAgentIndex];
                                      const hasApiData =
                                        currentData && Object.keys(currentData).length > 0;

                                      if (hasApiData) {
                                        return (
                                          <>
                                            {currentAgentIndex === 0 && (
                                              <IQVIADataDisplay
                                                data={currentData}
                                                isFirstPrompt={true}
                                              />
                                            )}
                                            {currentAgentIndex === 1 && (
                                              <EXIMDataDisplay
                                                data={currentData}
                                                showChart={true}
                                              />
                                            )}
                                            {currentAgentIndex === 2 && (
                                              <PatentDataDisplay
                                                data={currentData}
                                                isFirstPrompt={true}
                                              />
                                            )}
                                            {currentAgentIndex === 3 && (
                                              <ClinicalDataDisplay
                                                data={currentData}
                                                isFirstPrompt={true}
                                              />
                                            )}
                                            {currentAgentIndex === 4 && (
                                              <InternalKnowledgeDataDisplay
                                                data={currentData}
                                                isFirstPrompt={true}
                                              />
                                            )}
                                            {currentAgentIndex === 5 && (
                                              <ReportGeneratorDataDisplay
                                                data={currentData}
                                                isFirstPrompt={true}
                                                onDownload={handleDownloadReport}
                                              />
                                            )}
                                          </>
                                        );
                                      }

                                      return (
                                        <div className="flex flex-col items-center justify-center h-full gap-4 py-12">
                                          <div className="text-red-400 text-lg font-semibold">
                                            {apiError ? `Error: ${apiError}` : "No data available"}
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                )}
                              </ScrollArea>
                            </CardContent>
                          </Card>
                        </motion.div>
                      )}
                  </AnimatePresence>
                </motion.div>
              ) : (
                /* Chat Interface View - When not showing agent flow */
                <motion.div
                  key="chat-view"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="h-full flex flex-col"
                >
                  <ScrollArea className="flex-1">
                    <div className="space-y-4 py-4 max-w-4xl mx-auto px-6">
                      {!activeChat || activeChat.messages.length === 0 ? (
                        /* Welcome Screen */
                        <div className="flex flex-col items-center justify-center h-full text-center px-8 py-8">
                          <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.5 }}
                            className="mb-8"
                          >
                            <div className="w-20 h-20 bg-gradient-to-br from-primary to-blue-600 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-xl shadow-primary/20">
                              <Network className="text-white" size={40} />
                            </div>
                            <h1 className="text-3xl font-bold text-foreground mb-3">
                              Welcome to PharmAssist
                            </h1>
                            <p className="text-muted-foreground max-w-lg">
                              Your AI-powered pharmaceutical intelligence assistant. I can analyze
                              drug repurposing opportunities, clinical trials, patents, and market
                              data.
                            </p>
                          </motion.div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl">
                            {[
                              { icon: TrendingUp, text: "Market Analysis", color: "blue" },
                              { icon: Activity, text: "Clinical Trials", color: "green" },
                              { icon: Shield, text: "Patent Landscape", color: "amber" },
                            ].map((item, idx) => (
                              <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 + idx * 0.1 }}
                                className={`p-4 rounded-xl bg-card border border-border hover:border-${item.color}-500/50 transition-all cursor-pointer group`}
                                onClick={() => {
                                  setPrompt(`Analyze ${item.text.toLowerCase()} for Semaglutide`);
                                }}
                              >
                                <item.icon
                                  className={`text-${item.color}-400 mb-2 group-hover:scale-110 transition-transform`}
                                  size={24}
                                />
                                <p className="text-sm text-foreground">{item.text}</p>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        /* Chat Messages */
                        activeChat.messages.map((msg, idx) => (
                          <motion.div
                            key={msg.id || idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                                msg.role === "user"
                                  ? "bg-primary text-primary-foreground"
                                  : msg.type === "greeting"
                                    ? "bg-gradient-to-br from-primary/20 to-blue-500/20 border border-primary/30 text-foreground"
                                    : msg.type === "rejection"
                                      ? "bg-destructive/20 border border-destructive/30 text-foreground"
                                      : msg.type === "agent-complete"
                                        ? "bg-emerald-500/20 border border-emerald-500/30 text-foreground"
                                        : "bg-muted text-foreground"
                              }`}
                            >
                              {msg.role === "assistant" && (
                                <div className="flex items-center gap-2 mb-2">
                                  <Sparkles className="text-primary" size={14} />
                                  <span className="text-xs font-medium text-primary">
                                    PharmAssist
                                  </span>
                                </div>
                              )}
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                              {msg.type === "agent-complete" && (
                                <motion.button
                                  initial={{ opacity: 0, y: 5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.3 }}
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={handleDownloadReport}
                                  className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium text-sm transition-all shadow-lg shadow-primary/20"
                                >
                                  <Download size={16} />
                                  Download Report
                                </motion.button>
                              )}
                            </div>
                          </motion.div>
                        ))
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
                  </ScrollArea>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-border p-4 bg-card">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2">
              <Input
                placeholder={
                  !activeChatId
                    ? "Start a new analysis..."
                    : activeChat?.messages?.length === 0
                      ? "Type your question..."
                      : "Continue analyzing..."
                }
                className="flex-1 h-12 bg-background border-border rounded-xl text-sm placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSendPrompt}
                disabled={isLoading || !prompt.trim()}
                className={`h-12 px-5 rounded-xl font-semibold flex items-center gap-2 transition-all duration-200 shadow-lg text-primary-foreground ${
                  isLoading || !prompt.trim()
                    ? "bg-primary/50 cursor-not-allowed"
                    : "bg-primary hover:bg-primary/90 shadow-primary/20"
                }`}
              >
                {isLoading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                {isLoading ? "Processing..." : "Send"}
              </motion.button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
