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
} from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { api, AGENT_ID_MAP, AGENT_INDEX_MAP } from "@/services/api";
import {
  IQVIADataDisplay,
  EXIMDataDisplay,
  PatentDataDisplay,
  ClinicalDataDisplay,
  InternalKnowledgeDataDisplay,
  ReportGeneratorDataDisplay,
} from "@/components/AgentDataDisplays";

export default function GeminiDashboard() {
  const [activeAgent, setActiveAgent] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [showAgentDataByAgent, setShowAgentDataByAgent] = useState({}); // {0:true,1:true,...}
  const [selectedAgent, setSelectedAgent] = useState(null); // for viewing specific agent output
  const [agentStartTime, setAgentStartTime] = useState(null);
  const [reportReady, setReportReady] = useState(false);
  const [showEximChart, setShowEximChart] = useState(false);
  const [chatHistory, setChatHistory] = useState([]); // Array of {id, prompt, timestamp, prompts: []}
  const [selectedChatId, setSelectedChatId] = useState(null); // Currently viewing chat
  const [demoQueue, setDemoQueue] = useState(false); // Auto-run second prompt after first completes
  const [currentChatId, setCurrentChatId] = useState(null); // Track the chat in progress
  const [isPinned, setIsPinned] = useState(false); // User manually viewing a finished agent
  const [workflowComplete, setWorkflowComplete] = useState(false); // All agents finished, awaiting user close
  const [agentPromptIndex, setAgentPromptIndex] = useState({}); // Track which prompt index each agent is responding to {0: 1, 2: 2, ...}
  const [queryRejected, setQueryRejected] = useState(false); // Query was rejected by LLM orchestrator

  // API-related state
  const [agentData, setAgentData] = useState({}); // Store fetched data per agent: {0: {...}, 1: {...}}
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  const primaryPrompt =
    "I want to evaluate the repurposing potential of Semaglutide (Ozempic), currently used for Diabetes and Obesity.";
  const deepDivePrompt =
    "Focus on Semaglutide for Alcohol Use Disorder: assess GLP-1 receptor linkage to reward circuitry, summarize clinical signal strength across trial phases, profile sponsor activity, and flag import dependency or patent pressure that could impact an AUD launch.";

  useEffect(() => {
    if (activeAgent !== null) {
      setAgentStartTime(Date.now());
      setShowAgentDataByAgent((prev) => ({ ...prev, [activeAgent]: true }));
      if (activeAgent === 1) {
        setShowEximChart(true);
      }
      // Auto-follow only when not pinned
      setSelectedAgent((curr) => (!isPinned ? activeAgent : curr));
    }
  }, [activeAgent, isPinned]);

  const startAgentWorkflow = async (inputPrompt = prompt, targetChatId = null, promptIndex = 1) => {
    if (!inputPrompt?.trim()) return;

    console.log("[Dashboard] Starting agent workflow:", { inputPrompt, targetChatId, promptIndex });

    // Reset per-run visibility and charts so loading is simulated each time
    setShowAgentDataByAgent({});
    setShowEximChart(false);
    setSelectedAgent(null);
    setIsPinned(false);
    setWorkflowComplete(false);
    setQueryRejected(false);
    setIsLoading(true);
    setApiError(null);

    const isFirstPrompt = promptIndex === 1;
    const agentSequence = isFirstPrompt ? [0, 1, 2, 3, 4, 5] : [0, 2, 3, 4, 5];
    console.log("[Dashboard] Agent sequence:", agentSequence, "isFirstPrompt:", isFirstPrompt);

    // Store prompt index for each agent in this run
    const promptMapping = {};
    agentSequence.forEach((agentId) => {
      promptMapping[agentId] = promptIndex;
    });
    setAgentPromptIndex((prev) => ({ ...prev, ...promptMapping }));

    try {
      console.log("[Dashboard] Calling API runAnalysisStream...");
      // Call the API to get all agent data
      const response = await api.runAnalysisStream(
        inputPrompt,
        "semaglutide",
        "general",
        promptIndex,
      );
      console.log("[Dashboard] API response received:", response);

      // Check if this is a greeting response
      if (response.is_greeting === true) {
        console.log("[Dashboard] Greeting detected, showing friendly response");

        // Add greeting response to chat
        setChatHistory((prev) =>
          prev.map((chat) =>
            chat.id === targetChatId
              ? {
                  ...chat,
                  systemResponse: {
                    type: "greeting",
                    message: response.greeting_response,
                    timestamp: new Date().toLocaleTimeString(),
                  },
                }
              : chat,
          ),
        );

        setIsLoading(false);
        setQueryRejected(true); // Use this to show the response panel
        return;
      }

      // Check if query was rejected by the LLM orchestrator
      if (response.is_valid === false) {
        console.log("[Dashboard] Query rejected by orchestrator:", response.rejection_reason);
        const rejectionMessage =
          response.rejection_reason || "Query not related to pharmaceutical drug repurposing.";
        setApiError(rejectionMessage);
        setQueryRejected(true);

        // Add a system response to the chat showing the rejection
        setChatHistory((prev) =>
          prev.map((chat) =>
            chat.id === targetChatId
              ? {
                  ...chat,
                  systemResponse: {
                    type: "rejection",
                    message: rejectionMessage,
                    timestamp: new Date().toLocaleTimeString(),
                  },
                }
              : chat,
          ),
        );

        setIsLoading(false);
        return;
      }

      // Log summary if available
      if (response.summary) {
        console.log("[Dashboard] LLM Summary:", response.summary);
      }

      // Store the fetched data
      const newAgentData = {};
      for (const agentId of response.agent_sequence) {
        const frontendIndex = AGENT_ID_MAP[agentId];
        newAgentData[frontendIndex] = response.agents[agentId]?.data || {};
        console.log(
          `[Dashboard] Stored data for agent ${agentId} (index ${frontendIndex}):`,
          newAgentData[frontendIndex],
        );
      }
      setAgentData(newAgentData);

      // Now animate through agents sequentially
      const agentDelays = {
        0: 800, // IQVIA
        1: 800, // EXIM
        2: 800, // Patent
        3: 800, // Clinical
        4: 800, // Internal Knowledge
        5: 800, // Report Generator
      };

      // Begin sequence with data already loaded
      const runAgentAtIndex = (idx) => {
        const agentId = agentSequence[idx];
        setActiveAgent(agentId);
        setShowAgentDataByAgent((prev) => ({ ...prev, [agentId]: true }));

        if (agentId === 1) {
          setShowEximChart(true);
        }

        const timer = setTimeout(() => {
          const nextIndex = idx + 1;
          if (nextIndex < agentSequence.length) {
            runAgentAtIndex(nextIndex);
          } else {
            // Keep last agent active and set workflow complete
            setWorkflowComplete(true);
            setIsLoading(false);
            if (agentSequence.includes(5)) {
              setReportReady(true);
            }
          }
        }, agentDelays[agentId] || 800);
        return () => clearTimeout(timer);
      };

      runAgentAtIndex(0);
    } catch (error) {
      console.error("[API] Error:", error);
      setApiError(error.message);
      setIsLoading(false);
    }
  };

  const handleSendPrompt = () => {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    const timestamp = new Date().toLocaleTimeString();

    // If a chat is already selected, append prompt and run selective agents based on prompt count
    const existingChat = chatHistory.find((c) => c.id === selectedChatId);

    if (existingChat) {
      const promptIndex = existingChat.prompts.length + 1;
      setChatHistory((prev) =>
        prev.map((chat) =>
          chat.id === existingChat.id
            ? { ...chat, prompts: [...chat.prompts, { text: trimmed, timestamp }] }
            : chat,
        ),
      );
      setCurrentChatId(existingChat.id);
      startAgentWorkflow(trimmed, existingChat.id, promptIndex);
    } else {
      // start a new chat
      const chatId = Date.now();
      const newChat = {
        id: chatId,
        prompt: trimmed,
        timestamp,
        prompts: [{ text: trimmed, timestamp }],
      };
      setChatHistory((prev) => [...prev, newChat]);
      setSelectedChatId(chatId);
      setCurrentChatId(chatId);
      setReportReady(false);
      startAgentWorkflow(trimmed, chatId, 1);
    }

    setPrompt("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSendPrompt();
    }
  };

  const handleDownloadReport = async () => {
    try {
      console.log("[Dashboard] Generating PDF report based on agent data...");

      // Always use 'general' - the PDF will adapt to whatever data the agents provide
      const result = await api.generatePdf("semaglutide", "general");

      if (result.status === "success") {
        console.log("[Dashboard] PDF generated successfully:", result.file_name);
        // Download the generated PDF
        await api.downloadPdf(result.file_name);
      } else {
        console.error("[Dashboard] PDF generation failed:", result.message);
        alert("Failed to generate PDF report. Please try again.");
      }
    } catch (error) {
      console.error("[Dashboard] Error generating/downloading PDF:", error);
      alert("Failed to generate PDF report. Please try again.");
    }
  };

  const runDemoSequence = () => {
    setDemoQueue(true);
    setPrompt("");
    startAgentWorkflow(primaryPrompt);
  };

  useEffect(() => {
    if (demoQueue && reportReady && chatHistory.length === 1) {
      startAgentWorkflow(deepDivePrompt);
      setDemoQueue(false);
    }
  }, [demoQueue, reportReady, chatHistory.length]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100 flex">
      {/* Chat History Sidebar */}
      <div className="w-64 bg-zinc-950/80 border-r border-zinc-800 flex flex-col">
        <div className="p-3 border-b border-slate-700/50">
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setSelectedChatId(null);
              setPrompt("");
              setActiveAgent(null);
              setReportReady(false);
              setCurrentChatId(null);
            }}
            className="relative w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-white transition-all duration-300 overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-blue-500 to-blue-600 opacity-100 group-hover:opacity-90 transition-opacity" />
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-400 opacity-0 group-hover:opacity-20 blur-xl transition-opacity" />
            <div className="absolute inset-0 rounded-lg ring-2 ring-cyan-400/20 group-hover:ring-cyan-300/40 transition-all" />
            <div className="relative flex items-center justify-center gap-2">
              <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
              <span>New Analysis</span>
            </div>
          </motion.button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {chatHistory.map((chat) => {
              const promptWords = chat.prompt.split(" ").slice(0, 6).join(" ");
              const displayText =
                promptWords.length > 50 ? promptWords.substring(0, 50) + "..." : promptWords;
              return (
                <motion.button
                  key={chat.id}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedChatId(chat.id)}
                  className={`w-full text-left px-3 py-2 rounded-md transition-all duration-200 truncate ${
                    selectedChatId === chat.id
                      ? "bg-slate-500 text-white shadow-md"
                      : "bg-slate-700 hover:bg-slate-600 text-slate-100"
                  }`}
                >
                  <p className="text-sm font-medium truncate">{displayText}</p>
                </motion.button>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Main Area */}
      <main className="flex-1 flex flex-col h-screen justify-between">
        {/* Chat Area */}
        <div className="flex-1 overflow-hidden p-8">
          <div className="flex gap-6 h-full max-w-7xl mx-auto items-stretch">
            {/* Left Side - Agent Boxes */}
            <motion.div
              className="transition-all duration-700 ease-in-out"
              animate={{
                width: activeAgent !== null ? "40%" : "100%",
              }}
            >
              <div className="relative">
                {activeAgent === null && (
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
              <div className="flex justify-center mb-16 relative z-10">
                <motion.div
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                  }}
                  className="relative group"
                >
                  {/* Animated glow effect */}
                  <motion.div
                    className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-blue-600 rounded-xl blur-xl opacity-40"
                    animate={{
                      opacity: [0.25, 0.4, 0.25],
                      scale: [1, 1.02, 1],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                  <Card className="relative bg-gradient-to-r from-cyan-500 via-blue-500 to-blue-600 border-0 shadow-lg shadow-blue-500/20">
                    <CardContent className="p-6 px-12">
                      <div className="flex items-center justify-center gap-4">
                        <motion.div
                          className="relative"
                          animate={{
                            rotate: [0, 360],
                          }}
                          transition={{
                            duration: 20,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        >
                          <Network className="text-white drop-shadow-lg" size={32} />
                        </motion.div>
                        <div className="text-center">
                          <h2 className="text-xl font-bold text-white drop-shadow-md">
                            Orchestrator Agent
                          </h2>
                          <p className="text-purple-100 text-sm mt-1 font-medium">
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
                  activeAgent !== null
                    ? "grid-cols-1 gap-3 h-auto mt-[-42px]"
                    : "grid-cols-6 gap-3 h-auto"
                } pb-24 relative z-10`}
              >
                {/* Agent 1 - IQVIA */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 100 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="relative group"
                >
                  {/* Hover glow effect */}
                  <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-500/0 to-blue-500/0 group-hover:from-blue-500/30 group-hover:to-blue-600/30 rounded-xl blur-sm transition-all duration-300 opacity-0 group-hover:opacity-100" />
                  <Card
                    className={`relative transition-all duration-500 overflow-hidden ${
                      activeAgent === 0
                        ? "bg-gradient-to-br from-blue-900/20 to-zinc-900 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.4)]"
                        : "bg-gradient-to-br from-blue-900/10 to-zinc-900 border-zinc-800 hover:border-blue-600/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] hover:scale-[1.02]"
                    } ${activeAgent !== null ? "h-auto" : "h-full min-h-[190px]"} ${
                      showAgentDataByAgent[0] ? "cursor-pointer" : "cursor-default"
                    }`}
                    onClick={() => {
                      if (!showAgentDataByAgent[0]) return;
                      setIsPinned(activeAgent !== 0);
                      setSelectedAgent(0);
                    }}
                  >
                    <CardContent
                      className={`${
                        activeAgent !== null
                          ? "p-3 flex flex-row items-center gap-3"
                          : "p-3 flex flex-col h-full"
                      }`}
                    >
                      <div
                        className={`flex items-center gap-2 shrink-0 ${
                          activeAgent === null ? "mb-2" : ""
                        }`}
                      >
                        <motion.div
                          className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20"
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          transition={{ type: "spring", stiffness: 400 }}
                        >
                          <TrendingUp className="text-blue-400" size={18} />
                        </motion.div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-zinc-100 text-sm truncate">
                            IQVIA Insights
                          </h3>
                          {activeAgent !== null && (
                            <p className="text-xs text-zinc-400 truncate leading-tight">
                              Market size, growth & competitive analysis
                            </p>
                          )}
                        </div>
                        {activeAgent === 0 && activeAgent !== null && (
                          <Loader2 className="animate-spin text-blue-500" size={16} />
                        )}
                      </div>
                      {activeAgent === null ? (
                        <div className="mt-3 flex-1 flex flex-col text-xs text-zinc-400 gap-2 overflow-hidden">
                          <motion.div
                            className="flex items-center gap-2 leading-5"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                          >
                            <span className="text-blue-400 text-xs flex-shrink-0">•</span>
                            <span className="leading-tight min-w-0">Sales data analytics</span>
                          </motion.div>
                          <motion.div
                            className="flex items-center gap-2 leading-5"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                          >
                            <span className="text-blue-400 text-xs flex-shrink-0">•</span>
                            <span className="leading-tight min-w-0">Market trends & forecasts</span>
                          </motion.div>
                          <motion.div
                            className="flex items-center gap-2 leading-5"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                          >
                            <span className="text-blue-400 text-xs flex-shrink-0">•</span>
                            <span className="leading-tight min-w-0">Competitive intelligence</span>
                          </motion.div>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Agent 2 - Exim Trends */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="relative group"
                >
                  <div className="absolute -inset-0.5 bg-gradient-to-br from-cyan-500/0 to-cyan-500/0 group-hover:from-cyan-500/30 group-hover:to-cyan-600/30 rounded-xl blur-sm transition-all duration-300 opacity-0 group-hover:opacity-100" />
                  <Card
                    className={`relative transition-all duration-500 overflow-hidden ${
                      activeAgent === 1
                        ? "bg-gradient-to-br from-cyan-900/20 to-zinc-900 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                        : "bg-gradient-to-br from-cyan-900/10 to-zinc-900 border-zinc-800 hover:border-cyan-600/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:scale-[1.02]"
                    } ${activeAgent !== null ? "h-auto" : "h-full min-h-[190px]"} ${
                      showAgentDataByAgent[1] ? "cursor-pointer" : "cursor-default"
                    }`}
                    onClick={() => {
                      if (!showAgentDataByAgent[1]) return;
                      setIsPinned(activeAgent !== 1);
                      setSelectedAgent(1);
                    }}
                  >
                    <CardContent
                      className={`${
                        activeAgent !== null
                          ? "p-3 flex flex-row items-center gap-3"
                          : "p-3 flex flex-col h-full"
                      }`}
                    >
                      <div
                        className={`flex items-center gap-2 shrink-0 ${
                          activeAgent === null ? "mb-2" : ""
                        }`}
                      >
                        <motion.div
                          className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20"
                          whileHover={{ scale: 1.1, rotate: 360 }}
                          transition={{ type: "spring", stiffness: 400, duration: 0.6 }}
                        >
                          <Globe className="text-cyan-400" size={18} />
                        </motion.div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-zinc-100 text-sm truncate">
                            Exim Trends
                          </h3>
                          {activeAgent !== null && (
                            <p className="text-xs text-zinc-400 truncate leading-tight">
                              Export-Import & trade analysis
                            </p>
                          )}
                        </div>
                        {activeAgent === 1 && activeAgent !== null && (
                          <Loader2 className="animate-spin text-cyan-500" size={16} />
                        )}
                      </div>
                      {activeAgent === null ? (
                        <div className="mt-3 flex-1 flex flex-col text-xs text-zinc-400 gap-2 overflow-hidden">
                          <motion.div
                            className="flex items-center gap-2 leading-5"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.25 }}
                          >
                            <span className="text-cyan-400 text-xs flex-shrink-0">•</span>
                            <span className="leading-tight min-w-0">Trade volume tracking</span>
                          </motion.div>
                          <motion.div
                            className="flex items-center gap-2 leading-5"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.35 }}
                          >
                            <span className="text-cyan-400 text-xs flex-shrink-0">•</span>
                            <span className="leading-tight min-w-0">API price analysis</span>
                          </motion.div>
                          <motion.div
                            className="flex items-center gap-2 leading-5"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.45 }}
                          >
                            <span className="text-cyan-400 text-xs flex-shrink-0">•</span>
                            <span className="leading-tight min-w-0">
                              Tariff & regulation insights
                            </span>
                          </motion.div>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Agent 3 - Patent Landscape */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="relative group"
                >
                  <div className="absolute -inset-0.5 bg-gradient-to-br from-amber-500/0 to-amber-500/0 group-hover:from-amber-500/30 group-hover:to-amber-600/30 rounded-xl blur-sm transition-all duration-300 opacity-0 group-hover:opacity-100" />
                  <Card
                    className={`relative transition-all duration-500 overflow-hidden ${
                      activeAgent === 2
                        ? "bg-gradient-to-br from-amber-900/20 to-zinc-900 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                        : "bg-gradient-to-br from-amber-900/10 to-zinc-900 border-zinc-800 hover:border-amber-600/50 hover:shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:scale-[1.02]"
                    } ${activeAgent !== null ? "h-auto" : "h-full min-h-[190px]"} ${
                      showAgentDataByAgent[2] ? "cursor-pointer" : "cursor-default"
                    }`}
                    onClick={() => {
                      if (!showAgentDataByAgent[2]) return;
                      setIsPinned(activeAgent !== 2);
                      setSelectedAgent(2);
                    }}
                  >
                    <CardContent
                      className={`${
                        activeAgent !== null
                          ? "p-3 flex flex-row items-center gap-3"
                          : "p-3 flex flex-col h-full"
                      }`}
                    >
                      <div
                        className={`flex items-center gap-2 shrink-0 ${
                          activeAgent === null ? "mb-2" : ""
                        }`}
                      >
                        <motion.div
                          className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20"
                          whileHover={{ scale: 1.1, y: -2 }}
                          transition={{ type: "spring", stiffness: 400 }}
                        >
                          <Shield className="text-amber-400" size={18} />
                        </motion.div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-zinc-100 text-sm truncate">
                            Patent Landscape
                          </h3>
                          {activeAgent !== null && (
                            <p className="text-xs text-zinc-400 truncate leading-tight">
                              FTO analysis & lifecycle strategy
                            </p>
                          )}
                        </div>
                        {activeAgent === 2 && activeAgent !== null && (
                          <Loader2 className="animate-spin text-amber-500" size={16} />
                        )}
                      </div>
                      {activeAgent === null ? (
                        <div className="mt-3 flex-1 flex flex-col text-xs text-zinc-400 gap-2 overflow-hidden">
                          <motion.div
                            className="flex items-center gap-2 leading-5"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                          >
                            <span className="text-amber-400 text-xs flex-shrink-0">•</span>
                            <span className="leading-tight min-w-0">Patent expiry tracking</span>
                          </motion.div>
                          <motion.div
                            className="flex items-center gap-2 leading-5"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                          >
                            <span className="text-amber-400 text-xs flex-shrink-0">•</span>
                            <span className="leading-tight min-w-0">FTO risk assessment</span>
                          </motion.div>
                          <motion.div
                            className="flex items-center gap-2 leading-5"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 }}
                          >
                            <span className="text-amber-400 text-xs flex-shrink-0">•</span>
                            <span className="leading-tight min-w-0">IP landscape mapping</span>
                          </motion.div>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Agent 4 - Clinical Trials */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, type: "spring", stiffness: 100 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="relative group"
                >
                  <div className="absolute -inset-0.5 bg-gradient-to-br from-green-500/0 to-green-500/0 group-hover:from-green-500/30 group-hover:to-green-600/30 rounded-xl blur-sm transition-all duration-300 opacity-0 group-hover:opacity-100" />
                  <Card
                    className={`relative transition-all duration-500 overflow-hidden ${
                      activeAgent === 3
                        ? "bg-gradient-to-br from-green-900/20 to-zinc-900 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.4)]"
                        : "bg-gradient-to-br from-green-900/10 to-zinc-900 border-zinc-800 hover:border-green-600/50 hover:shadow-[0_0_15px_rgba(34,197,94,0.2)] hover:scale-[1.02]"
                    } ${activeAgent !== null ? "h-auto" : "h-full min-h-[190px]"} ${
                      showAgentDataByAgent[3] ? "cursor-pointer" : "cursor-default"
                    }`}
                    onClick={() => {
                      if (!showAgentDataByAgent[3]) return;
                      setIsPinned(activeAgent !== 3);
                      setSelectedAgent(3);
                    }}
                  >
                    <CardContent
                      className={`${
                        activeAgent !== null
                          ? "p-3 flex flex-row items-center gap-3"
                          : "p-3 flex flex-col h-full"
                      }`}
                    >
                      <div
                        className={`flex items-center gap-2 shrink-0 ${
                          activeAgent === null ? "mb-2" : ""
                        }`}
                      >
                        <motion.div
                          className="p-2 rounded-lg bg-green-500/10 border border-green-500/20"
                          whileHover={{ scale: 1.1 }}
                          animate={{
                            scale: [1, 1.05, 1],
                          }}
                          transition={{
                            scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                            hover: { type: "spring", stiffness: 400 },
                          }}
                        >
                          <Activity className="text-green-400" size={18} />
                        </motion.div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-zinc-100 text-sm truncate">
                            Clinical Trials
                          </h3>
                          {activeAgent !== null && (
                            <p className="text-xs text-zinc-400 truncate leading-tight">
                              MoA mapping & pipeline analysis
                            </p>
                          )}
                        </div>
                        {activeAgent === 3 && activeAgent !== null && (
                          <Loader2 className="animate-spin text-green-500" size={16} />
                        )}
                      </div>
                      {activeAgent === null ? (
                        <div className="mt-3 flex-1 flex flex-col text-xs text-zinc-400 gap-2 overflow-hidden">
                          <motion.div
                            className="flex items-center gap-2 leading-5"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.35 }}
                          >
                            <span className="text-green-400 text-xs flex-shrink-0">•</span>
                            <span className="leading-tight min-w-0">Trial database search</span>
                          </motion.div>
                          <motion.div
                            className="flex items-center gap-2 leading-5"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.45 }}
                          >
                            <span className="text-green-400 text-xs flex-shrink-0">•</span>
                            <span className="leading-tight min-w-0">MoA identification</span>
                          </motion.div>
                          <motion.div
                            className="flex items-center gap-2 leading-5"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.55 }}
                          >
                            <span className="text-green-400 text-xs flex-shrink-0">•</span>
                            <span className="leading-tight min-w-0">Pipeline opportunity scan</span>
                          </motion.div>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Agent 5 - Internal Knowledge */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, type: "spring", stiffness: 100 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="relative group"
                >
                  <div className="absolute -inset-0.5 bg-gradient-to-br from-pink-500/0 to-pink-500/0 group-hover:from-pink-500/30 group-hover:to-pink-600/30 rounded-xl blur-sm transition-all duration-300 opacity-0 group-hover:opacity-100" />
                  <Card
                    className={`relative transition-all duration-500 overflow-hidden ${
                      activeAgent === 4
                        ? "bg-gradient-to-br from-pink-900/20 to-zinc-900 border-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.4)]"
                        : "bg-gradient-to-br from-pink-900/10 to-zinc-900 border-zinc-800 hover:border-pink-600/50 hover:shadow-[0_0_15px_rgba(236,72,153,0.2)] hover:scale-[1.02]"
                    } ${activeAgent !== null ? "h-auto" : "h-full min-h-[190px]"} ${
                      showAgentDataByAgent[4] ? "cursor-pointer" : "cursor-default"
                    }`}
                    onClick={() => {
                      if (!showAgentDataByAgent[4]) return;
                      setIsPinned(activeAgent !== 4);
                      setSelectedAgent(4);
                    }}
                  >
                    <CardContent
                      className={`${
                        activeAgent !== null
                          ? "p-3 flex flex-row items-center gap-3"
                          : "p-3 flex flex-col h-full"
                      }`}
                    >
                      <div
                        className={`flex items-center gap-2 shrink-0 ${
                          activeAgent === null ? "mb-2" : ""
                        }`}
                      >
                        <motion.div
                          className="p-2 rounded-lg bg-pink-500/10 border border-pink-500/20"
                          whileHover={{ scale: 1.1, rotateY: 180 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          <BookOpen className="text-pink-400" size={18} />
                        </motion.div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-zinc-100 text-sm truncate">
                            Internal Knowledge
                          </h3>
                          {activeAgent !== null && (
                            <p className="text-xs text-zinc-400 truncate leading-tight">
                              Company data & previous research
                            </p>
                          )}
                        </div>
                        {activeAgent === 4 && activeAgent !== null && (
                          <Loader2 className="animate-spin text-pink-500" size={16} />
                        )}
                      </div>
                      {activeAgent === null ? (
                        <div className="mt-3 flex-1 flex flex-col text-xs text-zinc-400 gap-2 overflow-hidden">
                          <motion.div
                            className="flex items-center gap-2 leading-5"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                          >
                            <span className="text-pink-400 text-xs flex-shrink-0">•</span>
                            <span className="leading-tight min-w-0">Past research archive</span>
                          </motion.div>
                          <motion.div
                            className="flex items-center gap-2 leading-5"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 }}
                          >
                            <span className="text-pink-400 text-xs flex-shrink-0">•</span>
                            <span className="leading-tight min-w-0">Expert network access</span>
                          </motion.div>
                          <motion.div
                            className="flex items-center gap-2 leading-5"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.6 }}
                          >
                            <span className="text-pink-400 text-xs flex-shrink-0">•</span>
                            <span className="leading-tight min-w-0">Document intelligence</span>
                          </motion.div>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Agent 6 - Report Generator */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, type: "spring", stiffness: 100 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="relative group"
                >
                  <div className="absolute -inset-0.5 bg-gradient-to-br from-purple-500/0 to-purple-500/0 group-hover:from-purple-500/30 group-hover:to-purple-600/30 rounded-xl blur-sm transition-all duration-300 opacity-0 group-hover:opacity-100" />
                  <Card
                    className={`relative transition-all duration-500 overflow-hidden ${
                      activeAgent === 5
                        ? "bg-gradient-to-br from-purple-900/20 to-zinc-900 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                        : "bg-gradient-to-br from-purple-900/10 to-zinc-900 border-zinc-800 hover:border-purple-600/50 hover:shadow-[0_0_15px_rgba(168,85,247,0.2)] hover:scale-[1.02]"
                    } ${activeAgent !== null ? "h-auto" : "h-full min-h-[190px]"} ${
                      showAgentDataByAgent[5] ? "cursor-pointer" : "cursor-default"
                    }`}
                    onClick={() => {
                      if (!showAgentDataByAgent[5]) return;
                      setIsPinned(activeAgent !== 5);
                      setSelectedAgent(5);
                    }}
                  >
                    <CardContent
                      className={`${
                        activeAgent !== null
                          ? "p-3 flex flex-row items-center gap-3"
                          : "p-3 flex flex-col h-full"
                      }`}
                    >
                      <div
                        className={`flex items-center gap-2 shrink-0 ${
                          activeAgent === null ? "mb-2" : ""
                        }`}
                      >
                        <motion.div
                          className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20"
                          whileHover={{ scale: 1.1, rotate: -5 }}
                          animate={{
                            y: [0, -2, 0],
                          }}
                          transition={{
                            y: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
                            hover: { type: "spring", stiffness: 400 },
                          }}
                        >
                          <FileBarChart className="text-purple-400" size={18} />
                        </motion.div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-zinc-100 text-sm truncate">
                            Report Generator
                          </h3>
                          {activeAgent !== null && (
                            <p className="text-xs text-zinc-400 truncate leading-tight">
                              Comprehensive PDF report generation
                            </p>
                          )}
                        </div>
                        {activeAgent === 5 && activeAgent !== null && !reportReady && (
                          <Loader2 className="animate-spin text-purple-500" size={16} />
                        )}
                      </div>
                      {activeAgent === null ? (
                        <div className="mt-3 flex-1 flex flex-col text-xs text-zinc-400 gap-2 overflow-hidden">
                          <motion.div
                            className="flex items-center gap-2 leading-5"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.45 }}
                          >
                            <span className="text-purple-400 text-xs flex-shrink-0">•</span>
                            <span className="leading-tight min-w-0">Executive summaries</span>
                          </motion.div>
                          <motion.div
                            className="flex items-center gap-2 leading-5"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.55 }}
                          >
                            <span className="text-purple-400 text-xs flex-shrink-0">•</span>
                            <span className="leading-tight min-w-0">Data visualization</span>
                          </motion.div>
                          <motion.div
                            className="flex items-center gap-2 leading-5"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.65 }}
                          >
                            <span className="text-purple-400 text-xs flex-shrink-0">•</span>
                            <span className="leading-tight min-w-0">Strategic recommendations</span>
                          </motion.div>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </motion.div>

            {/* Query Response Panel (Greetings or Rejections) */}
            {queryRejected && (
              <motion.div
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 100 }}
                transition={{ duration: 0.5 }}
                className="flex-1 h-full pb-2"
              >
                <Card className="bg-zinc-900 border-zinc-800 h-full">
                  <CardContent className="p-6 pb-8 h-full flex flex-col">
                    {(() => {
                      // Get the current chat's system response
                      const currentChat = chatHistory.find((c) => c.id === currentChatId);
                      const systemResponse = currentChat?.systemResponse;
                      const isGreeting = systemResponse?.type === "greeting";

                      return (
                        <>
                          <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-zinc-800">
                            <div className="flex items-center gap-3">
                              <div
                                className={`p-2 rounded-lg ${isGreeting ? "bg-purple-500/20" : "bg-red-500/20"}`}
                              >
                                {isGreeting ? (
                                  <Sparkles className="text-purple-400" size={24} />
                                ) : (
                                  <AlertCircle className="text-red-400" size={24} />
                                )}
                              </div>
                              <h2 className="text-xl font-bold text-zinc-100">
                                {isGreeting ? "PharmAssist" : "Query Not Accepted"}
                              </h2>
                            </div>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                setQueryRejected(false);
                                setApiError(null);
                              }}
                              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 rounded-lg font-semibold flex items-center gap-2 transition-all duration-200 text-sm"
                            >
                              <X size={16} />
                              Close
                            </motion.button>
                          </div>

                          {isGreeting ? (
                            // Greeting Response UI
                            <div className="flex-1 flex flex-col gap-6 px-4">
                              <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-xl p-6 border border-purple-500/20">
                                <p className="text-zinc-100 text-lg leading-relaxed whitespace-pre-line">
                                  {systemResponse?.message}
                                </p>
                              </div>
                              <div className="bg-zinc-800/50 rounded-lg p-4">
                                <p className="text-zinc-400 text-sm">
                                  <strong className="text-purple-400">💡 Quick Start:</strong> Try
                                  one of these queries:
                                </p>
                                <div className="flex flex-wrap gap-2 mt-3">
                                  {[
                                    "Analyze Semaglutide market",
                                    "Clinical trials for obesity drugs",
                                    "Patent landscape for GLP-1",
                                  ].map((suggestion, idx) => (
                                    <button
                                      key={idx}
                                      onClick={() => {
                                        setPrompt(suggestion);
                                        setQueryRejected(false);
                                      }}
                                      className="px-3 py-1.5 bg-zinc-700 hover:bg-purple-600 text-zinc-300 hover:text-white rounded-full text-sm transition-all"
                                    >
                                      {suggestion}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ) : (
                            // Rejection Response UI
                            <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center px-8">
                              <div className="p-4 bg-red-500/10 rounded-full">
                                <AlertCircle className="text-red-400" size={48} />
                              </div>
                              <div className="space-y-3">
                                <h3 className="text-lg font-semibold text-red-400">
                                  Query Not Recognized
                                </h3>
                                <p className="text-zinc-300 max-w-md">
                                  {apiError || systemResponse?.message}
                                </p>
                              </div>
                              <div className="bg-zinc-800/50 rounded-lg p-4 max-w-lg">
                                <p className="text-zinc-400 text-sm">
                                  <strong className="text-zinc-300">💡 Tip:</strong> I specialize in
                                  pharmaceutical intelligence. Try asking about:
                                </p>
                                <ul className="text-zinc-400 text-sm mt-2 space-y-1 text-left list-disc list-inside">
                                  <li>Drug repurposing opportunities</li>
                                  <li>Clinical trial analysis</li>
                                  <li>Patent landscape reviews</li>
                                  <li>Market analysis for specific molecules</li>
                                </ul>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Right Panel - Agent Details */}
            {(activeAgent !== null || workflowComplete) && !queryRejected && (
              <motion.div
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 100 }}
                transition={{ duration: 0.7 }}
                className="flex-1 h-full pb-2"
              >
                <Card className="bg-zinc-900 border-zinc-800 h-full">
                  <CardContent className="p-6 pb-8 h-full flex flex-col">
                    <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-zinc-800">
                      <div className="flex items-center gap-3">
                        {(selectedAgent ?? activeAgent) === 0 && (
                          <TrendingUp className="text-blue-400" size={24} />
                        )}
                        {(selectedAgent ?? activeAgent) === 1 && (
                          <Network className="text-cyan-400" size={24} />
                        )}
                        {(selectedAgent ?? activeAgent) === 2 && (
                          <Scale className="text-amber-400" size={24} />
                        )}
                        {(selectedAgent ?? activeAgent) === 3 && (
                          <Microscope className="text-green-400" size={24} />
                        )}
                        {(selectedAgent ?? activeAgent) === 4 && (
                          <Database className="text-pink-400" size={24} />
                        )}
                        {(selectedAgent ?? activeAgent) === 5 && (
                          <FileText className="text-purple-400" size={24} />
                        )}
                        <h2 className="text-xl font-bold text-zinc-100">
                          {(selectedAgent ?? activeAgent) === 0 && "IQVIA Market Insights"}
                          {(selectedAgent ?? activeAgent) === 1 && "Exim Trends Analysis"}
                          {(selectedAgent ?? activeAgent) === 2 && "Patent Landscape"}
                          {(selectedAgent ?? activeAgent) === 3 && "Clinical Trial Analysis"}
                          {(selectedAgent ?? activeAgent) === 4 && "Internal Knowledge Base"}
                          {(selectedAgent ?? activeAgent) === 5 && "Report Generation"}
                        </h2>
                      </div>
                      {workflowComplete && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            setActiveAgent(null);
                            setWorkflowComplete(false);
                            setSelectedAgent(null);
                            setIsPinned(false);
                          }}
                          className="px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-900 border border-zinc-300 rounded-lg font-semibold flex items-center gap-2 transition-all duration-200 text-sm shadow-sm"
                        >
                          <X size={16} />
                          Close Agents
                        </motion.button>
                      )}
                    </div>

                    <ScrollArea className="flex-1">
                      {!showAgentDataByAgent[selectedAgent ?? activeAgent ?? -1] ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                          <Loader2 className="animate-spin text-blue-500" size={48} />
                          <p className="text-zinc-400 text-lg">
                            {(selectedAgent ?? activeAgent) === 0 && "Fetching market data..."}
                            {(selectedAgent ?? activeAgent) === 1 &&
                              "Analyzing export-import trends..."}
                            {(selectedAgent ?? activeAgent) === 2 && "Querying patent databases..."}
                            {(selectedAgent ?? activeAgent) === 3 && "Searching trial databases..."}
                            {(selectedAgent ?? activeAgent) === 4 &&
                              "Searching internal knowledge base..."}
                            {(selectedAgent ?? activeAgent) === 5 && "Aggregating agent outputs..."}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-6 text-zinc-300 leading-relaxed">
                          {(() => {
                            const currentAgentId = selectedAgent ?? activeAgent;
                            const currentPromptIndex = agentPromptIndex[currentAgentId] || 1;
                            const isFirstPrompt = currentPromptIndex === 1;
                            const currentData = agentData[currentAgentId];
                            const hasApiData = currentData && Object.keys(currentData).length > 0;

                            // If we have API data, use the new components
                            if (hasApiData) {
                              return (
                                <>
                                  {currentAgentId === 0 && (
                                    <IQVIADataDisplay
                                      data={currentData}
                                      isFirstPrompt={isFirstPrompt}
                                    />
                                  )}
                                  {currentAgentId === 1 && (
                                    <EXIMDataDisplay data={currentData} showChart={showEximChart} />
                                  )}
                                  {currentAgentId === 2 && (
                                    <PatentDataDisplay
                                      data={currentData}
                                      isFirstPrompt={isFirstPrompt}
                                    />
                                  )}
                                  {currentAgentId === 3 && (
                                    <ClinicalDataDisplay
                                      data={currentData}
                                      isFirstPrompt={isFirstPrompt}
                                    />
                                  )}
                                  {currentAgentId === 4 && (
                                    <InternalKnowledgeDataDisplay
                                      data={currentData}
                                      isFirstPrompt={isFirstPrompt}
                                    />
                                  )}
                                  {currentAgentId === 5 && (
                                    <ReportGeneratorDataDisplay
                                      data={currentData}
                                      isFirstPrompt={isFirstPrompt}
                                      onDownload={handleDownloadReport}
                                    />
                                  )}
                                </>
                              );
                            }

                            // No API data available - show error state
                            return (
                              <div className="flex flex-col items-center justify-center h-full gap-4 py-12">
                                <div className="text-red-400 text-lg font-semibold">
                                  {apiError ? `Error: ${apiError}` : "No data available"}
                                </div>
                                <p className="text-zinc-400 text-sm text-center max-w-md">
                                  {apiError
                                    ? "Please ensure the backend server is running at http://localhost:8000"
                                    : "Waiting for API response. Please check your backend connection."}
                                </p>
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
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-zinc-800 p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2">
              <Input
                placeholder={
                  chatHistory.length === 0 ? "Type your question..." : "Continue analyzing..."
                }
                className="flex-1 h-12 bg-zinc-900 border-zinc-800 rounded-xl text-sm placeholder:text-zinc-500 focus-visible:ring-0 focus-visible:ring-offset-0"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSendPrompt}
                className="h-12 px-5 bg-purple-600 hover:bg-purple-700 rounded-xl font-semibold flex items-center gap-2 transition-all duration-200 shadow-lg shadow-purple-500/20"
              >
                <Send size={16} /> Send
              </motion.button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
