import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Globe, Shield, Activity, BookOpen, Zap, AlertCircle, Bot } from "lucide-react";

// Stagger animation for children
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 12,
    },
  },
};

const colorClasses = {
  blue: {
    gradient: "from-blue-500/15 via-blue-500/8 to-transparent",
    border: "border-blue-500/30 hover:border-blue-400/70",
    icon: "bg-blue-500/15 border-blue-500/30",
    iconColor: "text-blue-400",
  },
  teal: {
    gradient: "from-teal-500/15 via-teal-500/8 to-transparent",
    border: "border-teal-500/30 hover:border-teal-400/70",
    icon: "bg-teal-500/15 border-teal-500/30",
    iconColor: "text-teal-400",
  },
  amber: {
    gradient: "from-amber-500/15 via-amber-500/8 to-transparent",
    border: "border-amber-500/30 hover:border-amber-400/70",
    icon: "bg-amber-500/15 border-amber-500/30",
    iconColor: "text-amber-400",
  },
  emerald: {
    gradient: "from-emerald-500/15 via-emerald-500/8 to-transparent",
    border: "border-emerald-500/30 hover:border-emerald-400/70",
    icon: "bg-emerald-500/15 border-emerald-500/30",
    iconColor: "text-emerald-400",
  },
  pink: {
    gradient: "from-pink-500/15 via-pink-500/8 to-transparent",
    border: "border-pink-500/30 hover:border-pink-400/70",
    icon: "bg-pink-500/15 border-pink-500/30",
    iconColor: "text-pink-400",
  },
  violet: {
    gradient: "from-violet-500/15 via-violet-500/8 to-transparent",
    border: "border-violet-500/30 hover:border-violet-400/70",
    icon: "bg-violet-500/15 border-violet-500/30",
    iconColor: "text-violet-400",
  },
};

const agents = [
  {
    id: 0,
    name: "IQVIA Insights",
    desc: "Market intelligence & analysis",
    icon: TrendingUp,
    color: "blue",
  },
  {
    id: 1,
    name: "Exim Trends",
    desc: "Global trade & export-import data",
    icon: Globe,
    color: "teal",
  },
  {
    id: 2,
    name: "Patent Landscape",
    desc: "IP strategy & FTO analysis",
    icon: Shield,
    color: "amber",
  },
  {
    id: 3,
    name: "Clinical Trials",
    desc: "Pipeline & clinical data analysis",
    icon: Activity,
    color: "emerald",
  },
  {
    id: 4,
    name: "Internal Knowledge",
    desc: "Company research & documents",
    icon: BookOpen,
    color: "pink",
  },
  {
    id: 5,
    name: "Web Intelligence",
    desc: "Real-time market insights",
    icon: Globe,
    color: "violet",
  },
];

export function LandingPage({ onSelectFeature, showFullGrid = false, apiError = null }) {
  // Simple features for in-chat view
  const simpleFeatures = [
    { icon: TrendingUp, title: "Market Analysis", desc: "IQVIA insights & data" },
    { icon: Shield, title: "Patent Strategy", desc: "FTO & IP landscape" },
    { icon: Activity, title: "Clinical Trials", desc: "Pipeline analysis" },
  ];

  if (!showFullGrid) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 flex items-center justify-center py-6 pt-10 hide-scrollbar overflow-hidden"
      >
        <div className="text-center px-6 max-w-xl">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-6"
          >
            <div className="w-14 h-14 mx-auto rounded-xl bg-gradient-to-br from-primary/80 to-blue-600/80 backdrop-blur-sm flex items-center justify-center mb-4 shadow-lg">
              <Bot className="text-white" size={26} />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">How can I help you?</h2>
            <p className="text-muted-foreground text-sm">
              Ask about drugs, markets, patents, or clinical trials.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-3 gap-3"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {simpleFeatures.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={idx}
                  variants={itemVariants}
                  onClick={() => onSelectFeature?.(feature.title)}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="p-4 rounded-xl bg-card/50 backdrop-blur-md border border-border/60 hover:border-primary/50 cursor-pointer transition-colors shadow-sm hover:shadow-md"
                >
                  <Icon className="mb-2 text-primary" size={20} />
                  <h3 className="font-medium text-foreground text-sm mb-1">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground">{feature.desc}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full h-full flex flex-col items-center justify-center px-4 pt-16 pb-6 hide-scrollbar overflow-hidden relative"
    >
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* Smooth bottom fade - shortened height, starts from very bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none z-20"
        style={{
          background:
            "linear-gradient(to top, hsl(var(--background)) 0%, hsl(var(--background) / 0.6) 40%, hsl(var(--background) / 0.2) 70%, transparent 100%)",
        }}
      />

      <div className="w-full max-w-5xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-5"
        >
          <motion.h1
            className="text-5xl md:text-6xl font-extrabold text-foreground mb-3 tracking-tight"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            Welcome to{" "}
            <span className="bg-gradient-to-r from-blue-500 via-teal-500 to-emerald-400 bg-clip-text text-transparent inline-block">
              PharmAssist
            </span>
          </motion.h1>
          <motion.p
            className="text-xl text-foreground/70 mb-2 max-w-2xl mx-auto font-normal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            Multi-agent pharmaceutical intelligence powered by AI
          </motion.p>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="flex items-center justify-center gap-2 mb-4"
          >
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary/50"></div>
            <Zap className="text-primary/80" size={16} />
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary/50"></div>
          </motion.div>
        </motion.div>

        {apiError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center gap-2 max-w-lg mx-auto"
          >
            <AlertCircle className="text-destructive flex-shrink-0" size={16} />
            <p className="text-xs text-destructive">{apiError}</p>
          </motion.div>
        )}

        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <motion.div
            className="flex items-center justify-center gap-3 mb-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-card/60 backdrop-blur-xl border border-primary/30 shadow-sm">
              {/* <Zap className="text-primary" size={18} /> */}
              <span className="text-base font-bold text-foreground tracking-wide">
                Powered by{" "}
                <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  6 Specialized AI Agents
                </span>
              </span>
            </div>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            {agents.map((agent) => {
              const Icon = agent.icon;
              const colors = colorClasses[agent.color];

              return (
                <motion.div
                  key={agent.id}
                  variants={itemVariants}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                >
                  <Card
                    className={`group relative overflow-hidden bg-card/50 backdrop-blur-2xl border ${colors.border} transition-all duration-500 h-full hover:scale-[1.02] shadow-sm hover:shadow-lg`}
                  >
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-30 group-hover:opacity-60 transition-opacity duration-500 pointer-events-none`}
                    />
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                      <div className="absolute inset-0 bg-white/5 backdrop-blur-sm" />
                    </div>
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1500" />
                    </div>

                    <CardContent className="relative p-6 h-full flex items-center">
                      <div className="flex items-start gap-4 w-full">
                        <motion.div
                          className={`p-3 rounded-xl ${colors.icon} border shrink-0 shadow-md group-hover:shadow-xl transition-shadow duration-300`}
                          initial={{ rotate: 0, scale: 1 }}
                          animate={{ rotate: 0, scale: 1 }}
                          whileHover={{
                            scale: 1.1,
                            rotate: [0, -8, 8, -5, 5, 0],
                            transition: {
                              rotate: {
                                duration: 0.6,
                                ease: "easeInOut",
                              },
                              scale: {
                                type: "spring",
                                stiffness: 400,
                                damping: 10,
                              },
                            },
                          }}
                          transition={{ type: "spring", stiffness: 400, damping: 20 }}
                        >
                          <Icon
                            className={`${colors.iconColor} transition-transform duration-300 group-hover:scale-110`}
                            size={24}
                          />
                        </motion.div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-foreground text-base leading-tight mb-2 group-hover:text-primary transition-colors duration-300">
                            {agent.name}
                          </h3>
                          <p className="text-sm text-foreground/60 leading-tight font-normal truncate">
                            {agent.desc}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="text-center mt-6 mb-8 relative z-30"
        >
          <motion.p
            className="text-base text-muted-foreground/90 flex items-center justify-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.5 }}
          >
            <span className="inline-block w-8 h-px bg-gradient-to-r from-transparent to-primary/40"></span>
            Type a query below to begin
            <span className="inline-block w-8 h-px bg-gradient-to-l from-transparent to-primary/40"></span>
          </motion.p>
        </motion.div>
      </div>
    </motion.div>
  );
}
