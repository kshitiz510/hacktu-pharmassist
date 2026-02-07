import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  Sparkles,
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
import { ChatSidebar } from "@/components/ChatSidebar";
import { useChatManager } from "@/hooks/useChatManager";
import {
  IQVIADataDisplay,
  EXIMDataDisplay,
  PatentDataDisplay,
  ClinicalDataDisplay,
  InternalKnowledgeDataDisplay,
  ReportGeneratorDataDisplay,
} from "@/components/AgentDataDisplays";

const AGENT_ID_MAP = {
  iqvia: 0,
  exim: 1,
  patent: 2,
  clinical: 3,
  internal: 4,
  report: 5,
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
    key: "report",
    name: "Report Generator",
    desc: "Comprehensive PDF report generation",
    icon: FileBarChart,
    color: "purple",
    features: ["Executive summaries", "Data visualization", "Strategic recommendations"],
  },
];

const colorClasses = {
  blue: {
    active: "from-blue-900/20 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.4)]",
    inactive: "from-blue-900/10 border-border hover:border-blue-600/50",
    icon: "bg-blue-500/10 border-blue-500/20",
    iconColor: "text-blue-500",
    dot: "text-blue-500",
  },
  cyan: {
    active: "from-teal-900/20 border-teal-500 shadow-[0_0_20px_rgba(6,182,212,0.4)]",
    inactive: "from-teal-900/10 border-border hover:border-teal-600/50",
    icon: "bg-teal-500/10 border-teal-500/20",
    iconColor: "text-teal-500",
    dot: "text-teal-500",
  },
  amber: {
    active: "from-amber-900/20 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)]",
    inactive: "from-amber-900/10 border-border hover:border-amber-600/50",
    icon: "bg-amber-500/10 border-amber-500/20",
    iconColor: "text-amber-500",
    dot: "text-amber-500",
  },
  green: {
    active: "from-emerald-900/20 border-emerald-500 shadow-[0_0_20px_rgba(34,197,94,0.4)]",
    inactive: "from-emerald-900/10 border-border hover:border-emerald-600/50",
    icon: "bg-emerald-500/10 border-emerald-500/20",
    iconColor: "text-emerald-500",
    dot: "text-emerald-500",
  },
  pink: {
    active: "from-pink-900/20 border-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.4)]",
    inactive: "from-pink-900/10 border-border hover:border-pink-600/50",
    icon: "bg-pink-500/10 border-pink-500/20",
    iconColor: "text-pink-500",
    dot: "text-pink-500",
  },
  purple: {
    active: "from-violet-900/20 border-violet-500 shadow-[0_0_20px_rgba(168,85,247,0.4)]",
    inactive: "from-violet-900/10 border-border hover:border-violet-600/50",
    icon: "bg-violet-500/10 border-violet-500/20",
    iconColor: "text-violet-500",
    dot: "text-violet-500",
  },
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
  } = useChatManager();

  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [isPinned, setIsPinned] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [showTitleDialog, setShowTitleDialog] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const [isInitializing, setIsInitializing] = useState(false);

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

  // Debug logging
  useEffect(() => {
    console.log("[Dashboard] Raw chats from useChatManager:", chats);
    console.log("[Dashboard] Mapped chats for ChatSidebar:", mappedChats);
    console.log("[Dashboard] Active chat ID:", activeChatId);
    console.log("[Dashboard] Active chat:", activeChat);
  }, [chats, mappedChats, activeChatId, activeChat]);

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

  const agentData = activeChat?.agentsData || {};
  const chatHistory = activeChat?.chatHistory || [];

  useEffect(() => {
    setPrompt("");
    setIsLoading(false);
    setApiError(null);
    setIsPinned(false);
    setSelectedAgent(null);
  }, [activeChatId]);

  const handleNewChat = () => {
    setShowTitleDialog(true);
    setApiError(null);
  };

  const handleSelectChat = (chatId) => {
    selectChat(chatId);
  };

  const handleDeleteChat = (chatId) => {
    deleteChat(chatId);
  };

  const handleInitializeChat = async () => {
    if (!titleInput.trim()) return;
    setIsInitializing(true);
    setApiError(null);
    try {
      await createChatFromPrompt(titleInput.trim());
      setShowTitleDialog(false);
      setTitleInput("");
    } catch {
      setApiError("Failed to create chat");
    } finally {
      setIsInitializing(false);
    }
  };

  const handleTitleKeyPress = (e) => {
    if (e.key === "Enter" && !isInitializing) {
      handleInitializeChat();
    } else if (e.key === "Escape") {
      setShowTitleDialog(false);
      setTitleInput("");
    }
  };

  const handleSendPrompt = async () => {
    const text = prompt.trim();
    if (!text || isLoading) return;

    setPrompt("");
    setIsLoading(true);
    setApiError(null);

    try {
      if (!activeChatId) {
        await createChatFromPrompt(text);
      } else {
        await sendPrompt(text);
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

  const handleDownloadReport = async () => {
    // TODO: Implement report download
    console.log("Downloading report...");
  };

  const handleToggleAgentFlow = () => {
    // Toggle agent flow visibility (local state since we're not persisting this)
  };

  // Get the current display state
  const activeAgent = workflowState.activeAgent;
  const workflowComplete = workflowState.workflowComplete;
  const queryRejected = workflowState.queryRejected;
  const reportReady = workflowState.reportReady;
  const panelCollapsed = workflowState.panelCollapsed;
  const showAgentFlow = workflowState.showAgentFlow;

  const activeAgentIndex = activeAgent !== null ? AGENT_ID_MAP[activeAgent] : null;
  const selectedAgentIndex =
    selectedAgent !== null
      ? typeof selectedAgent === "string"
        ? AGENT_ID_MAP[selectedAgent]
        : selectedAgent
      : null;
  const currentAgentIndex = selectedAgentIndex ?? activeAgentIndex;

  const hasAgentData = Object.keys(agentData).length > 0;
  const shouldShowAgentFlow =
    !activeChat ||
    chatHistory.length === 0 ||
    (showAgentFlow && (activeAgent !== null || workflowComplete || hasAgentData));

  const sessionId = localStorage.getItem("activeSessionId");

  const renderAgentDataDisplay = (agentIndex) => {
    const agent = AGENTS[agentIndex];
    if (!agent) return null;
    const data = agentData[agent.key];
    if (!data) return null;

    switch (agent.key) {
      case "iqvia":
        return <IQVIADataDisplay data={data} isFirstPrompt={true} />;
      case "exim":
        return <EXIMDataDisplay data={data} showChart={true} />;
      case "patent":
        return <PatentDataDisplay data={data} isFirstPrompt={true} />;
      case "clinical":
        return <ClinicalDataDisplay data={data} isFirstPrompt={true} />;
      case "internal":
        return <InternalKnowledgeDataDisplay data={data} isFirstPrompt={true} />;
      case "report":
        return (
          <ReportGeneratorDataDisplay
            data={data}
            isFirstPrompt={true}
            onDownload={handleDownloadReport}
          />
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
      />

      {/* Main Area */}
      <main className="flex-1 flex flex-col h-screen justify-between">
        {/* Main Content Area */}
        <div className="flex-1 overflow-auto flex flex-col">
          {/* Agent Flow Toggle Bar */}
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
                  {Object.keys(agentData).length} agent
                  {Object.keys(agentData).length !== 1 ? "s" : ""} executed
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
          <div className={`flex-1 overflow-auto ${shouldShowAgentFlow ? "p-6" : ""}`}>
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
                      width: activeAgentIndex !== null || workflowComplete ? "40%" : "100%",
                    }}
                  >
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
                      {AGENTS.map((agent, index) => {
                        const Icon = agent.icon;
                        const isActive = activeAgentIndex === agent.id;
                        const hasData = !!agentData[agent.key];
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
                              } ${
                                activeAgentIndex !== null || workflowComplete
                                  ? "h-auto"
                                  : "h-full min-h-[185px]"
                              } ${hasData ? "cursor-pointer" : "cursor-default"}`}
                              onClick={() => {
                                if (!hasData) return;
                                setIsPinned(activeAgentIndex !== agent.id);
                                setSelectedAgent(agent.id);
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
                                    <Globe className="text-teal-500" size={24} />
                                  )}
                                  {currentAgentIndex === 2 && (
                                    <Shield className="text-amber-500" size={24} />
                                  )}
                                  {currentAgentIndex === 3 && (
                                    <Activity className="text-emerald-500" size={24} />
                                  )}
                                  {currentAgentIndex === 4 && (
                                    <BookOpen className="text-pink-500" size={24} />
                                  )}
                                  {currentAgentIndex === 5 && (
                                    <FileBarChart className="text-violet-500" size={24} />
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

                              <ScrollArea className="flex-1 overflow-auto pr-2">
                                {currentAgentIndex !== null &&
                                !agentData[AGENTS[currentAgentIndex]?.key] ? (
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
                                  <div className="space-y-6 text-foreground leading-relaxed w-full min-w-0">
                                    {currentAgentIndex !== null &&
                                      renderAgentDataDisplay(currentAgentIndex)}
                                  </div>
                                )}
                              </ScrollArea>
                            </CardContent>
                          </Card>
                        </motion.div>
                      )}
                  </AnimatePresence>
                </motion.div>
              ) : !sessionId && !showTitleDialog ? (
                /* Initialization Screen */
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex items-center justify-center"
                >
                  <div className="text-center max-w-2xl px-4">
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
                      className="mb-8"
                    >
                      <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center mb-6 shadow-lg shadow-primary/40">
                        <Sparkles className="text-white" size={40} />
                      </div>
                      <h1 className="text-4xl font-bold text-foreground mb-3">
                        Welcome to PharmAssist
                      </h1>
                      <p className="text-lg text-muted-foreground mb-8">
                        Multi-agent pharmaceutical intelligence system for drug repurposing analysis
                      </p>
                    </motion.div>

                    {apiError && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/30 flex items-center gap-3"
                      >
                        <AlertCircle className="text-destructive flex-shrink-0" size={20} />
                        <p className="text-sm text-destructive text-left">{apiError}</p>
                      </motion.div>
                    )}

                    <motion.button
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setShowTitleDialog(true);
                        setApiError(null);
                      }}
                      className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-semibold text-lg text-primary-foreground bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-lg shadow-primary/30 transition-all mb-12"
                    >
                      <Plus size={20} />
                      Start New Analysis
                    </motion.button>

                    {/* Features Grid */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                      className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left"
                    >
                      {[
                        {
                          icon: TrendingUp,
                          title: "Market Analysis",
                          desc: "IQVIA insights, sales trends & competitive data",
                        },
                        {
                          icon: Scale,
                          title: "Patent Strategy",
                          desc: "FTO analysis, patent expiry & IP landscape",
                        },
                        {
                          icon: Microscope,
                          title: "Clinical Trials",
                          desc: "Trial pipeline, MoA mapping & phase analysis",
                        },
                        {
                          icon: Globe,
                          title: "Trade Analysis",
                          desc: "Export-import trends, API pricing & tariffs",
                        },
                        {
                          icon: Database,
                          title: "Internal Knowledge",
                          desc: "Strategic insights & document intelligence",
                        },
                        {
                          icon: FileBarChart,
                          title: "Report Generation",
                          desc: "Executive summaries & PDF exports",
                        },
                      ].map((feature, idx) => {
                        const Icon = feature.icon;
                        return (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7 + idx * 0.1 }}
                            className="p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors"
                          >
                            <Icon className="text-primary mb-3" size={24} />
                            <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                            <p className="text-xs text-muted-foreground">{feature.desc}</p>
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  </div>
                </motion.div>
              ) : showTitleDialog ? (
                /* Title Input Dialog */
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex items-center justify-center"
                >
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 100 }}
                    className="w-full max-w-md px-6"
                  >
                    <Card className="bg-card border-border shadow-xl">
                      <CardContent className="p-8">
                        <h2 className="text-2xl font-bold text-foreground mb-2">
                          Name Your Analysis
                        </h2>
                        <p className="text-sm text-muted-foreground mb-6">
                          Give your drug repurposing analysis a descriptive title
                        </p>

                        <div className="space-y-4">
                          <Input
                            placeholder="e.g., Semaglutide for Obesity Treatment"
                            value={titleInput}
                            onChange={(e) => setTitleInput(e.target.value)}
                            onKeyPress={handleTitleKeyPress}
                            disabled={isInitializing}
                            autoFocus
                            className="h-11 text-base"
                          />

                          {apiError && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center gap-2"
                            >
                              <AlertCircle className="text-destructive flex-shrink-0" size={16} />
                              <p className="text-xs text-destructive">{apiError}</p>
                            </motion.div>
                          )}

                          <div className="flex gap-3 pt-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setShowTitleDialog(false);
                                setTitleInput("");
                                setApiError(null);
                              }}
                              disabled={isInitializing}
                              className="flex-1"
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleInitializeChat}
                              disabled={isInitializing || !titleInput.trim()}
                              className="flex-1"
                            >
                              {isInitializing ? (
                                <>
                                  <Loader2 className="animate-spin mr-2" size={16} />
                                  Creating...
                                </>
                              ) : (
                                "Create Chat"
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </motion.div>
              ) : (
                /* Chat Interface View */
                <motion.div
                  key="chat-view"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="h-full flex flex-col"
                >
                  <ScrollArea className="flex-1">
                    <div className="space-y-4 py-4 max-w-4xl mx-auto px-6">
                      {!activeChat || chatHistory.length === 0 ? (
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
                              {
                                icon: TrendingUp,
                                text: "Market Analysis",
                                color: "blue",
                              },
                              {
                                icon: Activity,
                                text: "Clinical Trials",
                                color: "green",
                              },
                              {
                                icon: Shield,
                                text: "Patent Landscape",
                                color: "amber",
                              },
                            ].map((item, idx) => (
                              <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 + idx * 0.1 }}
                                className="p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-all cursor-pointer group"
                                onClick={() => {
                                  setPrompt(`Analyze ${item.text.toLowerCase()} for Semaglutide`);
                                }}
                              >
                                <item.icon
                                  className="text-primary mb-2 group-hover:scale-110 transition-transform"
                                  size={24}
                                />
                                <p className="text-sm text-foreground">{item.text}</p>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        chatHistory.map((msg, idx) => (
                          <motion.div
                            key={msg.id || idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${
                              msg.role === "user" ? "justify-end" : "justify-start"
                            }`}
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
                    : chatHistory.length === 0
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
