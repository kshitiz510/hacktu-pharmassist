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
} from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

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

  const primaryPrompt =
    "I want to evaluate the repurposing potential of Semaglutide (Ozempic), currently used for Diabetes and Obesity.";
  const deepDivePrompt =
    "Focus on Semaglutide for Alcohol Use Disorder: assess GLP-1 receptor linkage to reward circuitry, summarize clinical signal strength across trial phases, profile sponsor activity, and flag import dependency or patent pressure that could impact an AUD launch.";

  const marketData = [
    { year: "2021", value: 8.1 },
    { year: "2022", value: 12.4 },
    { year: "2023", value: 18.3 },
    { year: "2024", value: 26.7 },
    { year: "2025", value: 32.5 },
  ];

  const marketChart = (() => {
    const yMin = 5;
    const yMax = 35;
    const chartWidth = 360;
    const chartHeight = 200;
    const padding = 30;
    const xStep = (chartWidth - padding * 2) / (marketData.length - 1);
    const yScale = (val) => padding + (yMax - val) * (chartHeight / (yMax - yMin));

    const points = marketData.map((d, i) => ({
      x: padding + i * xStep,
      y: yScale(d.value),
      ...d,
    }));

    const linePath = points
      .map((pt, idx) => `${idx === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
      .join(" ");

    const baseY = padding + chartHeight;
    const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${baseY} L ${
      points[0].x
    } ${baseY} Z`;

    return { points, linePath, areaPath, baseY, chartWidth, chartHeight, padding };
  })();

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

  const startAgentWorkflow = (inputPrompt = prompt, targetChatId = null, promptIndex = 1) => {
    if (!inputPrompt?.trim()) return;

    // Reset per-run visibility and charts so loading is simulated each time
    setShowAgentDataByAgent({});
    setShowEximChart(false);
    setSelectedAgent(null);
    setIsPinned(false);
    setWorkflowComplete(false);

    const isFirstPrompt = promptIndex === 1;
    const agentSequence = isFirstPrompt ? [0, 1, 2, 3, 4, 5] : [0, 2, 3, 4, 5];

    // Store prompt index for each agent in this run
    const promptMapping = {};
    agentSequence.forEach((agentId) => {
      promptMapping[agentId] = promptIndex;
    });
    setAgentPromptIndex((prev) => ({ ...prev, ...promptMapping }));

    // Durations per agent - minimal delay for transition
    const iqviaTime = 100;
    const eximTime = 100;
    const patentTime = 100;
    const clinicalTime = 100;
    const knowledgeTime = 100;
    const reportTime = 100;

    const durations = {
      0: iqviaTime,
      1: eximTime,
      2: patentTime,
      3: clinicalTime,
      4: knowledgeTime,
      5: reportTime,
    };

    // Begin sequence
    const runAgentAtIndex = (idx) => {
      const agentId = agentSequence[idx];
      setActiveAgent(agentId);
      const timer = setTimeout(() => {
        const nextIndex = idx + 1;
        if (nextIndex < agentSequence.length) {
          runAgentAtIndex(nextIndex);
        } else {
          // Keep last agent active and set workflow complete
          setWorkflowComplete(true);
          if (agentSequence.includes(5)) {
            setReportReady(true);
          }
        }
      }, durations[agentId] || 8000);
      return () => clearTimeout(timer);
    };

    runAgentAtIndex(0);
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
            : chat
        )
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

  const handleDownloadReport = () => {
    const link = document.createElement("a");
    link.href = "/code-0.pdf";
    link.download = "Semaglutide_Repurposing_Report.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
              const promptWords = chat.prompt.split(' ').slice(0, 6).join(' ');
              const displayText = promptWords.length > 50 ? promptWords.substring(0, 50) + '...' : promptWords;
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

              {/* Download Report Button */}
              {reportReady && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="flex justify-center mt-6"
                >
                  <Button
                    onClick={handleDownloadReport}
                    className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-6 text-lg shadow-lg"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download Repurposing Report
                  </Button>
                </motion.div>
              )}
            </motion.div>

            {/* Right Panel - Agent Details */}
            {(activeAgent !== null || workflowComplete) && (
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

                            return (
                              <>
                                {/* IQVIA Data */}
                                {currentAgentId === 0 && (
                                  <>
                                    {isFirstPrompt && (
                                      <>
                                        {/* GLOBAL GLP-1 MARKET */}
                                        <motion.div
                                          initial={{ opacity: 0, y: 10 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ delay: 0.1 }}
                                        >
                                          <h3 className="text-blue-400 font-semibold mb-3 text-lg">
                                            Global GLP-1 Market Forecast (USD Billions)
                                          </h3>

                                          <div className="bg-zinc-800/50 rounded-lg p-6">
                                            <div className="space-y-4">
                                              <div className="flex items-end justify-between h-56">
                                                <div className="flex flex-col justify-between h-full text-xs text-zinc-400 pr-3 w-12">
                                                  <span>$35B</span>
                                                  <span>$30B</span>
                                                  <span>$25B</span>
                                                  <span>$20B</span>
                                                  <span>$15B</span>
                                                  <span>$10B</span>
                                                  <span>$5B</span>
                                                </div>

                                                <div className="flex-1 flex items-end justify-around h-full relative">
                                                  <div className="absolute inset-0 flex flex-col justify-between">
                                                    {[...Array(7)].map((_, i) => (
                                                      <div
                                                        key={i}
                                                        className="border-t border-zinc-700/50"
                                                      />
                                                    ))}
                                                  </div>

                                                  <svg
                                                    className="absolute inset-0 w-full h-full"
                                                    viewBox="0 0 400 224"
                                                    preserveAspectRatio="none"
                                                  >
                                                    <defs>
                                                      <linearGradient
                                                        id="marketGradient"
                                                        x1="0"
                                                        x2="0"
                                                        y1="0"
                                                        y2="1"
                                                      >
                                                        <stop
                                                          offset="0%"
                                                          stopColor="#3b82f6"
                                                          stopOpacity="0.4"
                                                        />
                                                        <stop
                                                          offset="100%"
                                                          stopColor="#3b82f6"
                                                          stopOpacity="0"
                                                        />
                                                      </linearGradient>
                                                    </defs>
                                                    <path
                                                      d="M 40 198 L 110 170 L 180 128 L 250 72 L 320 32 L 320 224 L 40 224 Z"
                                                      fill="url(#marketGradient)"
                                                    />
                                                    <path
                                                      d="M 40 198 L 110 170 L 180 128 L 250 72 L 320 32"
                                                      stroke="#3b82f6"
                                                      strokeWidth="3"
                                                      fill="none"
                                                      strokeLinecap="round"
                                                    />
                                                  </svg>
                                                </div>
                                              </div>

                                              <div className="flex justify-around text-xs text-zinc-400 pt-2 border-t border-zinc-700">
                                                {[
                                                  ["2021", "$8.1B"],
                                                  ["2022", "$12.4B"],
                                                  ["2023", "$18.7B"],
                                                  ["2024", "$28.5B"],
                                                  ["2025", "$34.2B"],
                                                ].map(([year, value]) => (
                                                  <div key={year} className="text-center">
                                                    <div className="font-medium text-zinc-300">
                                                      {year}
                                                    </div>
                                                    <div className="text-blue-400 font-semibold mt-1">
                                                      {value}
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          </div>

                                          <p className="mt-3 text-sm text-zinc-400">
                                            The GLP-1 market demonstrates sustained expansion driven
                                            by obesity adoption, cardiovascular outcomes data, and
                                            payer reimbursement expansion.
                                          </p>
                                        </motion.div>

                                        {/* COMPETITIVE SHARE */}
                                        <motion.div
                                          initial={{ opacity: 0, y: 10 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ delay: 0.3 }}
                                        >
                                          <h3 className="text-green-400 font-semibold mb-3 text-lg">
                                            Competitive Market Share (2024)
                                          </h3>

                                          <div className="bg-zinc-800/50 rounded-lg p-6">
                                            <div className="space-y-3">
                                              <div className="flex justify-between">
                                                <span>Novo Nordisk</span>
                                                <span className="text-blue-400 font-semibold">
                                                  ~70%
                                                </span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span>Eli Lilly (Tirzepatide)</span>
                                                <span className="text-green-400 font-semibold">
                                                  ~24%
                                                </span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span>Others</span>
                                                <span className="text-zinc-400 font-semibold">
                                                  ~6%
                                                </span>
                                              </div>
                                            </div>
                                          </div>

                                          <p className="mt-3 text-sm text-zinc-400">
                                            Market concentration remains high, with limited
                                            near-term erosion despite dual-agonist competition.
                                          </p>
                                        </motion.div>
                                      </>
                                    )}

                                    {!isFirstPrompt && (
                                      <>
                                        {/* AUD MARKET OVERVIEW */}
                                        <motion.div
                                          initial={{ opacity: 0, y: 10 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ delay: 0.1 }}
                                        >
                                          <h3 className="text-cyan-400 font-semibold mb-3 text-lg">
                                            Alcohol Use Disorder (AUD) – Market Overview
                                          </h3>

                                          <div className="bg-zinc-800/50 rounded-lg p-6 grid grid-cols-4 gap-4 text-sm">
                                            <div className="bg-zinc-900/60 border border-cyan-500/20 rounded-lg p-4">
                                              <p className="text-zinc-400 text-xs">
                                                Global Prevalence
                                              </p>
                                              <p className="text-cyan-300 font-semibold mt-1">
                                                ~280M adults
                                              </p>
                                            </div>
                                            <div className="bg-zinc-900/60 border border-cyan-500/20 rounded-lg p-4">
                                              <p className="text-zinc-400 text-xs">Diagnosed</p>
                                              <p className="text-cyan-300 font-semibold mt-1">
                                                ~110M
                                              </p>
                                            </div>
                                            <div className="bg-zinc-900/60 border border-cyan-500/20 rounded-lg p-4">
                                              <p className="text-zinc-400 text-xs">On Medication</p>
                                              <p className="text-cyan-300 font-semibold mt-1">
                                                &lt;10%
                                              </p>
                                            </div>
                                            <div className="bg-zinc-900/60 border border-cyan-500/20 rounded-lg p-4">
                                              <p className="text-zinc-400 text-xs">
                                                Economic Burden
                                              </p>
                                              <p className="text-cyan-300 font-semibold mt-1">
                                                &gt;$300B / yr
                                              </p>
                                            </div>
                                          </div>
                                        </motion.div>

                                        {/* EXISTING AUD THERAPIES */}
                                        <motion.div
                                          initial={{ opacity: 0, y: 10 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ delay: 0.3 }}
                                        >
                                          <h3 className="text-purple-400 font-semibold mb-3 text-lg">
                                            Existing AUD Therapies
                                          </h3>

                                          <div className="bg-zinc-800/50 rounded-lg overflow-hidden">
                                            <table className="w-full text-sm">
                                              <thead className="bg-zinc-800">
                                                <tr>
                                                  <th className="text-left p-3">Drug</th>
                                                  <th className="text-center p-3">Mechanism</th>
                                                  <th className="text-center p-3">Efficacy</th>
                                                  <th className="text-left p-3">Limitations</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                <tr className="border-t border-zinc-700">
                                                  <td className="p-3">Naltrexone</td>
                                                  <td className="text-center p-3">
                                                    Opioid antagonism
                                                  </td>
                                                  <td className="text-center p-3 text-yellow-400">
                                                    Moderate
                                                  </td>
                                                  <td className="p-3">Adherence, GI effects</td>
                                                </tr>
                                                <tr className="border-t border-zinc-700">
                                                  <td className="p-3">Acamprosate</td>
                                                  <td className="text-center p-3">
                                                    Glutamate modulation
                                                  </td>
                                                  <td className="text-center p-3 text-yellow-400">
                                                    Low–Mod
                                                  </td>
                                                  <td className="p-3">TID dosing</td>
                                                </tr>
                                                <tr className="border-t border-zinc-700">
                                                  <td className="p-3">Disulfiram</td>
                                                  <td className="text-center p-3">Aversion</td>
                                                  <td className="text-center p-3 text-red-400">
                                                    Low
                                                  </td>
                                                  <td className="p-3">Safety, compliance</td>
                                                </tr>
                                              </tbody>
                                            </table>
                                          </div>
                                        </motion.div>

                                        {/* SEMAGLUTIDE SIGNAL */}
                                        <motion.div
                                          initial={{ opacity: 0, y: 10 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ delay: 0.5 }}
                                        >
                                          <h3 className="text-emerald-400 font-semibold mb-3 text-lg">
                                            Semaglutide – AUD Signal (IQVIA Assessment)
                                          </h3>

                                          <div className="bg-zinc-800/50 rounded-lg p-6 text-sm space-y-3">
                                            <div className="bg-zinc-900/60 border border-emerald-500/20 rounded-lg p-4">
                                              <p className="text-zinc-400 text-xs">
                                                Observed Effects
                                              </p>
                                              <p className="text-emerald-300 font-semibold mt-1">
                                                Reduced craving, lower reward-seeking, improved
                                                impulse control
                                              </p>
                                            </div>
                                            <ul className="list-disc list-inside text-zinc-400">
                                              <li>GLP-1 receptors present in reward circuitry</li>
                                              <li>Metabolic–dopaminergic pathway overlap</li>
                                              <li>Real-world behavioral signal in GLP-1 users</li>
                                            </ul>
                                          </div>
                                        </motion.div>

                                        {/* COMMERCIAL SCENARIO */}
                                        <motion.div
                                          initial={{ opacity: 0, y: 10 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ delay: 0.7 }}
                                        >
                                          <h3 className="text-amber-400 font-semibold mb-3 text-lg">
                                            AUD Repurposing – Commercial Scenario
                                          </h3>

                                          <div className="bg-zinc-800/50 rounded-lg overflow-hidden">
                                            <table className="w-full text-sm">
                                              <tbody>
                                                <tr className="border-t border-zinc-700">
                                                  <td className="p-3">
                                                    Addressable Patients (US+EU)
                                                  </td>
                                                  <td className="p-3 text-right">40–50M</td>
                                                </tr>
                                                <tr className="border-t border-zinc-700">
                                                  <td className="p-3">Peak Penetration</td>
                                                  <td className="p-3 text-right">5–8%</td>
                                                </tr>
                                                <tr className="border-t border-zinc-700">
                                                  <td className="p-3">Net Price / Year</td>
                                                  <td className="p-3 text-right">$4k–6k</td>
                                                </tr>
                                                <tr className="border-t border-zinc-700">
                                                  <td className="p-3 font-semibold">Peak Sales</td>
                                                  <td className="p-3 text-right text-emerald-400 font-semibold">
                                                    $8–12B
                                                  </td>
                                                </tr>
                                              </tbody>
                                            </table>
                                          </div>
                                        </motion.div>
                                      </>
                                    )}
                                  </>
                                )}

                                {/* Exim Trends Data */}
                                {currentAgentId === 1 && (
                                  <>
                                    {/* ================= API TRADE VOLUMES ================= */}
                                    <motion.div
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ delay: 0.1 }}
                                    >
                                      <h3 className="text-cyan-400 font-semibold mb-3 text-lg">
                                        API Trade Volume Analysis
                                      </h3>

                                      <div className="bg-zinc-800/50 rounded-lg overflow-hidden">
                                        <table className="w-full text-sm">
                                          <thead className="bg-zinc-800">
                                            <tr>
                                              <th className="text-left p-3 text-zinc-300 font-semibold">
                                                Source Country
                                              </th>
                                              <th className="text-right p-3 text-zinc-300 font-semibold">
                                                Q2 2024 (kg)
                                              </th>
                                              <th className="text-right p-3 text-zinc-300 font-semibold">
                                                Q3 2024 (kg)
                                              </th>
                                              <th className="text-right p-3 text-zinc-300 font-semibold">
                                                QoQ Growth
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            <tr className="border-t border-zinc-700">
                                              <td className="p-3 text-zinc-200 font-medium">
                                                Denmark
                                              </td>
                                              <td className="text-right p-3 text-zinc-300">85</td>
                                              <td className="text-right p-3 text-zinc-300">110</td>
                                              <td className="text-right p-3">
                                                <span className="text-green-400 font-semibold">
                                                  +29%
                                                </span>
                                              </td>
                                            </tr>
                                            <tr className="border-t border-zinc-700">
                                              <td className="p-3 text-zinc-200 font-medium">
                                                China
                                              </td>
                                              <td className="text-right p-3 text-zinc-300">40</td>
                                              <td className="text-right p-3 text-zinc-300">65</td>
                                              <td className="text-right p-3">
                                                <span className="text-green-400 font-semibold">
                                                  +62%
                                                </span>
                                              </td>
                                            </tr>
                                          </tbody>
                                        </table>
                                      </div>

                                      <p className="mt-3 text-sm text-zinc-400">
                                        Semaglutide API trade volumes accelerated in Q3 2024, with
                                        China showing outsized growth driven by expanded peptide
                                        manufacturing capacity.
                                      </p>
                                    </motion.div>

                                    {/* ================= API PRICE TRENDS ================= */}
                                    {showEximChart && (
                                      <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.25 }}
                                      >
                                        <h3 className="text-purple-400 font-semibold mb-3 text-lg">
                                          API Price Trend (USD / gram)
                                        </h3>

                                        <div className="bg-zinc-800/50 rounded-lg p-6">
                                          <div className="space-y-4">
                                            <div className="flex items-end justify-between h-48">
                                              <div className="flex flex-col justify-between h-full text-xs text-zinc-400 pr-2">
                                                <span>$6.0</span>
                                                <span>$5.5</span>
                                                <span>$5.0</span>
                                                <span>$4.5</span>
                                                <span>$4.0</span>
                                              </div>

                                              <div className="flex-1 relative h-full">
                                                <div className="absolute inset-0 flex flex-col justify-between">
                                                  {[...Array(5)].map((_, i) => (
                                                    <div
                                                      key={i}
                                                      className="border-t border-zinc-700/50"
                                                    />
                                                  ))}
                                                </div>

                                                <svg
                                                  className="absolute inset-0 w-full h-full"
                                                  viewBox="0 0 300 192"
                                                  preserveAspectRatio="none"
                                                >
                                                  <defs>
                                                    <linearGradient
                                                      id="priceGradient"
                                                      x1="0"
                                                      y1="0"
                                                      x2="0"
                                                      y2="1"
                                                    >
                                                      <stop
                                                        offset="0%"
                                                        stopColor="#a855f7"
                                                        stopOpacity="0.4"
                                                      />
                                                      <stop
                                                        offset="100%"
                                                        stopColor="#a855f7"
                                                        stopOpacity="0"
                                                      />
                                                    </linearGradient>
                                                  </defs>

                                                  <path
                                                    d="M 50 38.4 L 150 76.8 L 250 134.4 L 250 192 L 50 192 Z"
                                                    fill="url(#priceGradient)"
                                                  />
                                                  <path
                                                    d="M 50 38.4 L 150 76.8 L 250 134.4"
                                                    stroke="#a855f7"
                                                    strokeWidth="3"
                                                    fill="none"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                  />

                                                  {[50, 150, 250].map((x, i) => (
                                                    <circle
                                                      key={i}
                                                      cx={x}
                                                      cy={[38.4, 76.8, 134.4][i]}
                                                      r="5"
                                                      fill="#a855f7"
                                                      stroke="#18181b"
                                                      strokeWidth="2"
                                                    />
                                                  ))}
                                                </svg>
                                              </div>
                                            </div>

                                            <div className="flex justify-around text-xs text-zinc-400 pt-2 border-t border-zinc-700">
                                              <div className="text-center">
                                                <div className="text-zinc-300 font-medium">
                                                  Q1 2024
                                                </div>
                                                <div className="text-purple-400 font-semibold">
                                                  $5.8
                                                </div>
                                              </div>
                                              <div className="text-center">
                                                <div className="text-zinc-300 font-medium">
                                                  Q2 2024
                                                </div>
                                                <div className="text-purple-400 font-semibold">
                                                  $5.1
                                                </div>
                                              </div>
                                              <div className="text-center">
                                                <div className="text-zinc-300 font-medium">
                                                  Q3 2024
                                                </div>
                                                <div className="text-purple-400 font-semibold">
                                                  $4.4
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>

                                        <p className="mt-3 text-sm text-zinc-400">
                                          Declining API prices reflect improving supply depth and
                                          competitive pressure among peptide manufacturers.
                                        </p>
                                      </motion.div>
                                    )}

                                    {/* ================= IMPORT DEPENDENCY ================= */}
                                    <motion.div
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ delay: 0.4 }}
                                    >
                                      <h3 className="text-orange-400 font-semibold mb-3 text-lg">
                                        Import Dependency & Sourcing Risk
                                      </h3>

                                      <div className="bg-zinc-800/50 rounded-lg overflow-hidden">
                                        <table className="w-full text-sm">
                                          <thead className="bg-zinc-800">
                                            <tr>
                                              <th className="text-left p-3 text-zinc-300 font-semibold">
                                                Region
                                              </th>
                                              <th className="text-center p-3 text-zinc-300 font-semibold">
                                                Dependency %
                                              </th>
                                              <th className="text-left p-3 text-zinc-300 font-semibold">
                                                Primary Sources
                                              </th>
                                              <th className="text-center p-3 text-zinc-300 font-semibold">
                                                Risk Level
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            <tr className="border-t border-zinc-700">
                                              <td className="p-3 text-zinc-200 font-medium">
                                                India
                                              </td>
                                              <td className="text-center p-3 text-zinc-300">82%</td>
                                              <td className="p-3 text-zinc-300">Denmark, China</td>
                                              <td className="text-center p-3">
                                                <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-semibold">
                                                  High
                                                </span>
                                              </td>
                                            </tr>
                                            <tr className="border-t border-zinc-700">
                                              <td className="p-3 text-zinc-200 font-medium">EU</td>
                                              <td className="text-center p-3 text-zinc-300">55%</td>
                                              <td className="p-3 text-zinc-300">Denmark</td>
                                              <td className="text-center p-3">
                                                <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs font-semibold">
                                                  Medium
                                                </span>
                                              </td>
                                            </tr>
                                          </tbody>
                                        </table>
                                      </div>

                                      <p className="mt-3 text-sm text-zinc-400">
                                        High import reliance, particularly in India, elevates
                                        supply-chain risk and reinforces the strategic importance of
                                        supplier diversification.
                                      </p>
                                    </motion.div>
                                  </>
                                )}

                                {/* Patent Data */}
                                {currentAgentId === 2 && (
                                  <>
                                    {/* ===================== FIRST PROMPT ===================== */}
                                    {isFirstPrompt && (
                                      <>
                                        <motion.div
                                          initial={{ opacity: 0, y: 10 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ delay: 0.1 }}
                                        >
                                          <h3 className="text-amber-400 font-semibold mb-3 text-lg">
                                            Patent Landscape Overview
                                          </h3>

                                          <div className="bg-zinc-800/50 rounded-lg p-6 space-y-4">
                                            <div className="space-y-3">
                                              <div className="bg-zinc-900/60 border border-amber-500/20 rounded-lg p-4">
                                                <p className="text-zinc-400 text-sm">
                                                  Core Patent Coverage
                                                </p>
                                                <p className="text-amber-300 font-semibold mt-1">
                                                  Composition of matter, peptide formulation, oral
                                                  absorption enhancers
                                                </p>
                                              </div>

                                              <div className="bg-zinc-900/60 border border-amber-500/20 rounded-lg p-4">
                                                <p className="text-zinc-400 text-sm">
                                                  Patent Expiry Timeline
                                                </p>
                                                <p className="text-amber-300 font-semibold mt-1">
                                                  Core molecule expiry ~2028; formulation & dosing
                                                  extend to 2032+
                                                </p>
                                              </div>

                                              <div className="bg-zinc-900/60 border border-amber-500/20 rounded-lg p-4">
                                                <p className="text-zinc-400 text-sm">
                                                  Freedom To Operate (FTO)
                                                </p>
                                                <p className="text-amber-300 font-semibold mt-1">
                                                  Moderate risk post-2028 due to method-of-use
                                                  patents
                                                </p>
                                              </div>
                                            </div>

                                            <p className="text-sm text-zinc-400">
                                              Semaglutide’s IP estate is optimized for lifecycle
                                              extension via formulation, dosing regimens, and
                                              indication-specific claims.
                                            </p>
                                          </div>
                                        </motion.div>

                                        <motion.div
                                          initial={{ opacity: 0, y: 10 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ delay: 0.3 }}
                                        >
                                          <h3 className="text-blue-400 font-semibold mb-3 text-lg">
                                            Strategic Repurposing Patent Strategy
                                          </h3>

                                          <div className="bg-zinc-800/50 rounded-lg p-6 space-y-3 text-sm">
                                            <p className="text-zinc-400">
                                              <span className="text-white font-semibold">
                                                High-confidence targets:
                                              </span>{" "}
                                              Cardiovascular risk reduction and metabolic liver
                                              disease present strong opportunities for
                                              method-of-treatment claims independent of glycemic
                                              control.
                                            </p>
                                            <p className="text-zinc-400">
                                              <span className="text-white font-semibold">
                                                Medium-risk exploratory areas:
                                              </span>{" "}
                                              Neurodegenerative and addiction-related indications
                                              require precise claim construction around
                                              neuro-inflammatory and reward-pathway modulation.
                                            </p>
                                          </div>
                                        </motion.div>

                                        <motion.div
                                          initial={{ opacity: 0, y: 10 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ delay: 0.5 }}
                                        >
                                          <h3 className="text-emerald-400 font-semibold mb-3 text-lg">
                                            Competitive Filing Heatmap
                                          </h3>

                                          <div className="bg-zinc-800/50 rounded-lg p-6">
                                            <div className="grid grid-cols-4 gap-3">
                                              {[
                                                ["US Filings", 42, "amber"],
                                                ["EU Filings", 31, "blue"],
                                                ["China Filings", 18, "red"],
                                                ["India Filings", 9, "green"],
                                              ].map(([label, value, color]) => (
                                                <div key={label} className="text-center">
                                                  <div
                                                    className={`bg-${color}-500/20 border border-${color}-500/30 rounded-lg p-4`}
                                                  >
                                                    <div
                                                      className={`text-2xl font-bold text-${color}-400`}
                                                    >
                                                      {value}
                                                    </div>
                                                    <div className="text-xs text-zinc-400 mt-1">
                                                      {label}
                                                    </div>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>

                                          <p className="mt-3 text-sm text-zinc-400">
                                            Filing density indicates strong defensive coverage in
                                            US/EU markets, with whitespace opportunities in emerging
                                            economies post-expiry.
                                          </p>
                                        </motion.div>

                                        <motion.div
                                          initial={{ opacity: 0, y: 10 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ delay: 0.7 }}
                                        >
                                          <h3 className="text-violet-400 font-semibold mb-3 text-lg">
                                            Key Patent Extract (High Risk)
                                          </h3>

                                          <div className="bg-zinc-800/50 rounded-lg p-4 border-l-4 border-violet-500">
                                            <div className="flex items-start gap-3">
                                              <Shield className="text-violet-400 mt-1" size={20} />
                                              <div>
                                                <div className="text-xs text-violet-400 font-mono mb-2">
                                                  US10765789
                                                </div>
                                                <p className="text-sm text-zinc-300 italic">
                                                  “Methods for administering semaglutide at extended
                                                  dosing intervals to achieve sustained metabolic
                                                  control.”
                                                </p>
                                                <p className="text-xs text-zinc-500 mt-2">
                                                  <span className="text-amber-400 font-semibold">
                                                    ⚠ Risk:
                                                  </span>{" "}
                                                  Potential overlap with alternate dosing strategies
                                                  for neuropsychiatric or addiction-related
                                                  indications.
                                                </p>
                                              </div>
                                            </div>
                                          </div>
                                        </motion.div>

                                        <motion.div
                                          initial={{ opacity: 0, y: 10 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ delay: 0.9 }}
                                        >
                                          <h3 className="text-violet-500 font-semibold mb-3 text-lg">
                                            Forward-Looking IP Opportunities
                                          </h3>

                                          <div className="bg-zinc-800/50 rounded-lg p-6 space-y-3 text-sm">
                                            <div className="bg-zinc-900/60 border border-violet-500/20 rounded-lg p-4">
                                              <p className="text-zinc-400 text-xs">
                                                High-Value Claims
                                              </p>
                                              <p className="text-violet-300 font-semibold mt-1">
                                                Cardiovascular outcomes, neuro-inflammation
                                                modulation, metabolic liver disease
                                              </p>
                                            </div>
                                            <p className="text-zinc-400 text-xs">
                                              Strategic focus on indication-specific method claims
                                              enables durable exclusivity beyond core molecule
                                              expiry.
                                            </p>
                                          </div>
                                        </motion.div>
                                      </>
                                    )}

                                    {/* ===================== SECOND PROMPT (AUD FILTERED) ===================== */}
                                    {!isFirstPrompt && (
                                      <>
                                        <motion.div
                                          initial={{ opacity: 0, y: 10 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ delay: 0.1 }}
                                        >
                                          <h3 className="text-amber-400 font-semibold mb-3 text-lg">
                                            Alcohol Use Disorder (AUD) – Patent Focus
                                          </h3>

                                          <div className="bg-zinc-800/50 rounded-lg p-6 space-y-4">
                                            <div className="space-y-3">
                                              <div className="bg-zinc-900/60 border border-amber-500/20 rounded-lg p-4">
                                                <p className="text-zinc-400 text-sm">
                                                  Relevant Existing Patents
                                                </p>
                                                <p className="text-amber-300 font-semibold mt-1">
                                                  US10765789 (extended dosing), formulation and
                                                  delivery patents
                                                </p>
                                              </div>

                                              <div className="bg-zinc-900/60 border border-amber-500/20 rounded-lg p-4">
                                                <p className="text-zinc-400 text-sm">
                                                  AUD Method-of-Use Coverage
                                                </p>
                                                <p className="text-amber-300 font-semibold mt-1">
                                                  No explicit AUD claims filed – indication-level
                                                  whitespace remains
                                                </p>
                                              </div>

                                              <div className="bg-zinc-900/60 border border-amber-500/20 rounded-lg p-4">
                                                <p className="text-zinc-400 text-sm">
                                                  AUD FTO Assessment
                                                </p>
                                                <p className="text-amber-300 font-semibold mt-1">
                                                  Moderate risk due to dosing-interval overlap;
                                                  manageable via behavioral endpoint differentiation
                                                </p>
                                              </div>
                                            </div>

                                            <p className="text-sm text-zinc-400">
                                              AUD represents a filtered, high-value subset of the
                                              broader IP estate, with defensible method-of-treatment
                                              claims possible without challenging core composition
                                              patents.
                                            </p>
                                          </div>
                                        </motion.div>
                                      </>
                                    )}
                                  </>
                                )}

                                {/* Clinical Trials Data */}
                                {currentAgentId === 3 && (
                                  <>
                                    {/* ===================== FIRST PROMPT ===================== */}
                                    {isFirstPrompt && (
                                      <>
                                        <motion.div
                                          initial={{ opacity: 0, y: 10 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ delay: 0.1 }}
                                        >
                                          <h3 className="text-green-400 font-semibold mb-3 text-lg">
                                            Global Semaglutide Clinical Trial Landscape
                                          </h3>

                                          <p className="text-sm text-zinc-400 mb-4">
                                            Semaglutide has an extensive and mature clinical
                                            development footprint spanning metabolic,
                                            cardiovascular, and exploratory neurobehavioral
                                            indications, with multiple late-stage programs.
                                          </p>
                                        </motion.div>

                                        {/* TRIAL PHASE DISTRIBUTION */}
                                        <motion.div
                                          initial={{ opacity: 0, y: 10 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ delay: 0.3 }}
                                        >
                                          <h3 className="text-indigo-400 font-semibold mb-3 text-lg">
                                            Trial Phase Distribution (All Indications)
                                          </h3>

                                          <div className="bg-zinc-800/50 rounded-lg p-6">
                                            <div className="flex items-center justify-center gap-8">
                                              <div className="relative w-40 h-40">
                                                <svg
                                                  viewBox="0 0 200 200"
                                                  className="transform -rotate-90"
                                                >
                                                  <circle
                                                    cx="100"
                                                    cy="100"
                                                    r="70"
                                                    fill="none"
                                                    stroke="#27272a"
                                                    strokeWidth="30"
                                                  />
                                                  {/* Phase I */}
                                                  <circle
                                                    cx="100"
                                                    cy="100"
                                                    r="70"
                                                    fill="none"
                                                    stroke="#3b82f6"
                                                    strokeWidth="30"
                                                    strokeDasharray="70 439.82"
                                                  />
                                                  {/* Phase II */}
                                                  <circle
                                                    cx="100"
                                                    cy="100"
                                                    r="70"
                                                    fill="none"
                                                    stroke="#10b981"
                                                    strokeWidth="30"
                                                    strokeDasharray="140 439.82"
                                                    strokeDashoffset="-70"
                                                  />
                                                  {/* Phase III */}
                                                  <circle
                                                    cx="100"
                                                    cy="100"
                                                    r="70"
                                                    fill="none"
                                                    stroke="#f59e0b"
                                                    strokeWidth="30"
                                                    strokeDasharray="229.82 439.82"
                                                    strokeDashoffset="-210"
                                                  />
                                                </svg>
                                              </div>

                                              <div className="flex flex-col gap-3 text-sm">
                                                <div className="flex items-center gap-2">
                                                  <div className="w-4 h-4 rounded bg-blue-500"></div>
                                                  <span className="text-zinc-300">Phase I</span>
                                                  <span className="text-blue-400 font-semibold">
                                                    ~5 trials
                                                  </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <div className="w-4 h-4 rounded bg-green-500"></div>
                                                  <span className="text-zinc-300">Phase II</span>
                                                  <span className="text-green-400 font-semibold">
                                                    ~10 trials
                                                  </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <div className="w-4 h-4 rounded bg-amber-500"></div>
                                                  <span className="text-zinc-300">Phase III</span>
                                                  <span className="text-amber-400 font-semibold">
                                                    ~15 trials
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          </div>

                                          <p className="mt-3 text-sm text-zinc-400">
                                            The predominance of Phase III trials reflects clinical
                                            maturity in core metabolic indications, while earlier
                                            phases support lifecycle expansion into new therapeutic
                                            areas.
                                          </p>
                                        </motion.div>

                                        {/* SPONSOR OVERVIEW */}
                                        <motion.div
                                          initial={{ opacity: 0, y: 10 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ delay: 0.5 }}
                                        >
                                          <h3 className="text-teal-400 font-semibold mb-3 text-lg">
                                            Sponsor & Research Profile
                                          </h3>

                                          <div className="bg-zinc-800/50 rounded-lg overflow-hidden">
                                            <table className="w-full text-sm">
                                              <thead className="bg-zinc-800">
                                                <tr>
                                                  <th className="text-left p-3 text-zinc-300 font-semibold">
                                                    Sponsor
                                                  </th>
                                                  <th className="text-center p-3 text-zinc-300 font-semibold">
                                                    Trial Count
                                                  </th>
                                                  <th className="text-left p-3 text-zinc-300 font-semibold">
                                                    Primary Focus
                                                  </th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                <tr className="border-t border-zinc-700">
                                                  <td className="p-3 text-zinc-200 font-medium">
                                                    Novo Nordisk
                                                  </td>
                                                  <td className="text-center p-3 text-blue-400 font-semibold">
                                                    ~20
                                                  </td>
                                                  <td className="p-3 text-zinc-300">
                                                    Diabetes, Obesity, CV Outcomes
                                                  </td>
                                                </tr>
                                                <tr className="border-t border-zinc-700">
                                                  <td className="p-3 text-zinc-200 font-medium">
                                                    NIH / NIAAA
                                                  </td>
                                                  <td className="text-center p-3 text-green-400 font-semibold">
                                                    2
                                                  </td>
                                                  <td className="p-3 text-zinc-300">
                                                    Addiction & AUD
                                                  </td>
                                                </tr>
                                                <tr className="border-t border-zinc-700">
                                                  <td className="p-3 text-zinc-200 font-medium">
                                                    Academic Consortia
                                                  </td>
                                                  <td className="text-center p-3 text-amber-400 font-semibold">
                                                    3
                                                  </td>
                                                  <td className="p-3 text-zinc-300">
                                                    Neurobehavioral & Translational Research
                                                  </td>
                                                </tr>
                                              </tbody>
                                            </table>
                                          </div>

                                          <p className="mt-3 text-sm text-zinc-400">
                                            Public-sector sponsorship highlights emerging scientific
                                            interest beyond commercial metabolic indications.
                                          </p>
                                        </motion.div>
                                      </>
                                    )}

                                    {/* ===================== SECOND PROMPT (AUD-SPECIFIC) ===================== */}
                                    {!isFirstPrompt && (
                                      <>
                                        <motion.div
                                          initial={{ opacity: 0, y: 10 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ delay: 0.1 }}
                                        >
                                          <h3 className="text-green-400 font-semibold mb-3 text-lg">
                                            Alcohol Use Disorder (AUD) – Clinical Trial Focus
                                          </h3>

                                          <p className="text-sm text-zinc-400 mb-4">
                                            Early-stage clinical investigations are evaluating
                                            semaglutide’s impact on alcohol craving, consumption
                                            behavior, and relapse risk through central
                                            reward-pathway modulation.
                                          </p>
                                        </motion.div>

                                        {/* AUD TRIAL DETAILS */}
                                        <motion.div
                                          initial={{ opacity: 0, y: 10 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ delay: 0.3 }}
                                        >
                                          <h3 className="text-indigo-400 font-semibold mb-3 text-lg">
                                            Key AUD Trials & Design Characteristics
                                          </h3>

                                          <div className="bg-zinc-800/50 rounded-lg overflow-hidden">
                                            <table className="w-full text-sm">
                                              <thead className="bg-zinc-800">
                                                <tr>
                                                  <th className="text-left p-3 text-zinc-300 font-semibold">
                                                    Trial ID
                                                  </th>
                                                  <th className="text-center p-3 text-zinc-300 font-semibold">
                                                    Phase
                                                  </th>
                                                  <th className="text-left p-3 text-zinc-300 font-semibold">
                                                    Primary Endpoints
                                                  </th>
                                                  <th className="text-left p-3 text-zinc-300 font-semibold">
                                                    Sponsor
                                                  </th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                <tr className="border-t border-zinc-700">
                                                  <td className="p-3 text-zinc-200 font-mono">
                                                    NCT05512345
                                                  </td>
                                                  <td className="text-center p-3 text-green-400 font-semibold">
                                                    Phase II
                                                  </td>
                                                  <td className="p-3 text-zinc-300">
                                                    Alcohol craving scores, drinks/week, relapse
                                                    frequency
                                                  </td>
                                                  <td className="p-3 text-zinc-300">NIH / NIAAA</td>
                                                </tr>
                                              </tbody>
                                            </table>
                                          </div>

                                          <p className="mt-3 text-sm text-zinc-400">
                                            Current AUD trials are signal-seeking in nature and not
                                            powered for regulatory approval, but provide critical
                                            mechanistic validation.
                                          </p>
                                        </motion.div>

                                        {/* SIGNAL INTERPRETATION */}
                                        <motion.div
                                          initial={{ opacity: 0, y: 10 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ delay: 0.5 }}
                                        >
                                          <h3 className="text-emerald-400 font-semibold mb-3 text-lg">
                                            Clinical Signal Interpretation (AUD)
                                          </h3>

                                          <div className="bg-zinc-800/50 rounded-lg p-6 space-y-3 text-sm">
                                            <div className="bg-zinc-900/60 border border-emerald-500/20 rounded-lg p-4">
                                              <p className="text-zinc-400 text-xs">
                                                Observed Trends
                                              </p>
                                              <p className="text-emerald-300 font-semibold mt-1">
                                                Reduced alcohol craving, improved impulse control,
                                                lower reward-driven consumption
                                              </p>
                                            </div>

                                            <p className="text-zinc-400">
                                              Signal strength remains preliminary but aligns with
                                              preclinical and real-world behavioral observations
                                              seen in GLP-1 treated populations.
                                            </p>
                                          </div>
                                        </motion.div>

                                        {/* DEVELOPMENT GAP */}
                                        <motion.div
                                          initial={{ opacity: 0, y: 10 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ delay: 0.7 }}
                                        >
                                          <h3 className="text-amber-400 font-semibold mb-3 text-lg">
                                            Development Gaps & Next Steps
                                          </h3>

                                          <div className="bg-zinc-800/50 rounded-lg p-6 text-sm space-y-2">
                                            <p className="text-zinc-400">
                                              • No Phase III AUD trials initiated to date
                                            </p>
                                            <p className="text-zinc-400">
                                              • Regulatory endpoints for addiction indications
                                              remain variable
                                            </p>
                                            <p className="text-zinc-400">
                                              • Opportunity to design relapse-prevention focused
                                              pivotal trials
                                            </p>
                                          </div>
                                        </motion.div>
                                      </>
                                    )}
                                  </>
                                )}

                                {/* Internal Knowledge Data */}
                                {currentAgentId === 4 && (
                                  <>
                                    {/* ===================== FIRST PROMPT ===================== */}
                                    {isFirstPrompt && (
                                      <>
                                        <motion.div
                                          initial={{ opacity: 0, y: 10 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ delay: 0.1 }}
                                        >
                                          <h3 className="text-pink-400 font-semibold mb-3 text-lg">
                                            Internal Knowledge Base – Strategic Synthesis
                                          </h3>

                                          <div className="bg-zinc-800/50 rounded-lg p-6 text-sm space-y-4">
                                            <div className="bg-zinc-900/60 border border-pink-500/30 rounded-lg p-4">
                                              <p className="text-zinc-400 text-xs">
                                                Regulatory Signal
                                              </p>
                                              <p className="text-pink-200 font-semibold mt-1">
                                                No approved GLP-1 therapies currently indicated for
                                                addiction or compulsive behavioral disorders
                                              </p>
                                            </div>

                                            <div className="bg-zinc-900/60 border border-pink-500/30 rounded-lg p-4">
                                              <p className="text-zinc-400 text-xs">
                                                Internal Hypothesis
                                              </p>
                                              <p className="text-pink-200 font-semibold mt-1">
                                                Central GLP-1 signaling may modulate reward-driven
                                                behaviors independent of metabolic endpoints
                                              </p>
                                            </div>

                                            <p className="text-zinc-400">
                                              Internal literature scans, post-marketing
                                              observations, and mechanistic models consistently
                                              point toward non-metabolic applications as the next
                                              frontier for GLP-1 lifecycle expansion.
                                            </p>
                                          </div>
                                        </motion.div>

                                        <motion.div
                                          initial={{ opacity: 0, y: 10 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ delay: 0.3 }}
                                        >
                                          <h3 className="text-fuchsia-400 font-semibold mb-3 text-lg">
                                            Cross-Indication Strategic Comparison
                                          </h3>

                                          <div className="bg-zinc-800/50 rounded-lg overflow-hidden">
                                            <table className="w-full text-sm">
                                              <thead className="bg-zinc-800">
                                                <tr>
                                                  <th className="text-left p-3 text-zinc-300 font-semibold">
                                                    Dimension
                                                  </th>
                                                  <th className="text-center p-3 text-zinc-300 font-semibold">
                                                    Diabetes / Obesity
                                                  </th>
                                                  <th className="text-center p-3 text-zinc-300 font-semibold">
                                                    Emerging CNS / Behavioral
                                                  </th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                <tr className="border-t border-zinc-700">
                                                  <td className="p-3 text-zinc-200 font-medium">
                                                    Commercial Readiness
                                                  </td>
                                                  <td className="text-center p-3">
                                                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-semibold">
                                                      Very High
                                                    </span>
                                                  </td>
                                                  <td className="text-center p-3">
                                                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs font-semibold">
                                                      Medium
                                                    </span>
                                                  </td>
                                                </tr>

                                                <tr className="border-t border-zinc-700">
                                                  <td className="p-3 text-zinc-200 font-medium">
                                                    IP Flexibility
                                                  </td>
                                                  <td className="text-center p-3">
                                                    <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-semibold">
                                                      Low
                                                    </span>
                                                  </td>
                                                  <td className="text-center p-3">
                                                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs font-semibold">
                                                      Moderate
                                                    </span>
                                                  </td>
                                                </tr>

                                                <tr className="border-t border-zinc-700">
                                                  <td className="p-3 text-zinc-200 font-medium">
                                                    Strategic White Space
                                                  </td>
                                                  <td className="text-center p-3">
                                                    <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-semibold">
                                                      Low
                                                    </span>
                                                  </td>
                                                  <td className="text-center p-3">
                                                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-semibold">
                                                      High
                                                    </span>
                                                  </td>
                                                </tr>
                                              </tbody>
                                            </table>
                                          </div>

                                          <p className="mt-3 text-sm text-zinc-400">
                                            Internal prioritization favors emerging behavioral
                                            indications where competitive intensity is low and
                                            differentiation is structurally defensible.
                                          </p>
                                        </motion.div>
                                      </>
                                    )}

                                    {/* ===================== SECOND PROMPT (AUD-SPECIFIC) ===================== */}
                                    {!isFirstPrompt && (
                                      <>
                                        <motion.div
                                          initial={{ opacity: 0, y: 10 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ delay: 0.1 }}
                                        >
                                          <h3 className="text-pink-400 font-semibold mb-3 text-lg">
                                            Internal Knowledge Base – AUD Focus
                                          </h3>

                                          <div className="bg-zinc-800/50 rounded-lg p-6 text-sm space-y-4">
                                            <div className="bg-zinc-900/60 border border-pink-500/30 rounded-lg p-4">
                                              <p className="text-zinc-400 text-xs">
                                                Internal Conviction Level
                                              </p>
                                              <p className="text-pink-200 font-semibold mt-1">
                                                Moderate–High (pending controlled clinical
                                                validation)
                                              </p>
                                            </div>

                                            <div className="bg-zinc-900/60 border border-pink-500/30 rounded-lg p-4">
                                              <p className="text-zinc-400 text-xs">
                                                Why AUD Survives Kill-Criteria
                                              </p>
                                              <p className="text-pink-200 font-semibold mt-1">
                                                Clear mechanistic rationale, minimal competitive
                                                crowding, and strong unmet clinical need
                                              </p>
                                            </div>

                                            <p className="text-zinc-400">
                                              Internal screening frameworks consistently rank
                                              Alcohol Use Disorder above other exploratory CNS
                                              indications due to favorable signal-to-risk asymmetry.
                                            </p>
                                          </div>
                                        </motion.div>

                                        <motion.div
                                          initial={{ opacity: 0, y: 10 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ delay: 0.3 }}
                                        >
                                          <h3 className="text-fuchsia-400 font-semibold mb-3 text-lg">
                                            Internal Risk Flags (AUD)
                                          </h3>

                                          <div className="bg-zinc-800/50 rounded-lg p-6 text-sm space-y-2">
                                            <p className="text-zinc-400">
                                              • Translational gap between metabolic and addiction
                                              endpoints
                                            </p>
                                            <p className="text-zinc-400">
                                              • Behavioral trial variability and placebo response
                                              risk
                                            </p>
                                            <p className="text-zinc-400">
                                              • Payer skepticism without relapse-prevention
                                              endpoints
                                            </p>
                                          </div>

                                          <p className="mt-3 text-sm text-zinc-400">
                                            Despite these risks, AUD remains internally categorized
                                            as a “strategic exploration priority” rather than a
                                            speculative edge case.
                                          </p>
                                        </motion.div>
                                      </>
                                    )}
                                  </>
                                )}

                                {/* Report Generator Data */}
                                {currentAgentId === 5 && (
                                  <>
                                    {/* Use isFirstPrompt or currentPromptIndex to show different data */}
                                    <motion.div
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ delay: 0.1 }}
                                    >
                                      <h3 className="text-purple-400 font-semibold mb-2 text-lg">
                                        {isFirstPrompt
                                          ? "Report Compilation Progress"
                                          : "Deep-Dive Report: AUD Indication Analysis"}
                                      </h3>
                                      <p className="mb-3">
                                        {isFirstPrompt
                                          ? "Synthesizing insights from all specialized agents to generate a comprehensive repurposing assessment report for Semaglutide."
                                          : "Compiling focused analysis on Alcohol Use Disorder indication with GLP-1 receptor linkage, clinical signals, sponsor activity, and strategic considerations."}
                                      </p>
                                      <div className="text-green-400 text-sm">
                                        ✓ Executive Summary - Complete
                                      </div>
                                    </motion.div>

                                    <motion.div
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ delay: 0.3 }}
                                    >
                                      <h3 className="text-blue-400 font-semibold mb-2 text-lg">
                                        Market & Competitive Analysis
                                      </h3>
                                      <p className="mb-3">
                                        Integrated market sizing data, competitive landscape, and
                                        white space opportunities from IQVIA insights.
                                      </p>
                                      <div className="text-green-400 text-sm">
                                        ✓ Section Complete
                                      </div>
                                    </motion.div>

                                    <motion.div
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ delay: 0.5 }}
                                    >
                                      <h3 className="text-green-400 font-semibold mb-2 text-lg">
                                        Clinical & Mechanistic Rationale
                                      </h3>
                                      <p className="mb-3">
                                        Compiled mechanism of action, clinical trial data, and
                                        signal strength assessments for addiction disorders
                                        indication.
                                      </p>
                                      <div className="text-green-400 text-sm">
                                        ✓ Section Complete
                                      </div>
                                    </motion.div>

                                    <motion.div
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ delay: 0.7 }}
                                    >
                                      <h3 className="text-amber-400 font-semibold mb-2 text-lg">
                                        Final Report Status
                                      </h3>
                                      <p className="mb-2">
                                        Generating{" "}
                                        <span className="text-white font-semibold">
                                          PDF document
                                        </span>{" "}
                                        with all sections, charts, and strategic recommendations...
                                      </p>
                                      <div className="text-purple-400 text-sm animate-pulse">
                                        ⏳ Finalizing report for download
                                      </div>
                                    </motion.div>
                                  </>
                                )}
                              </>
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
