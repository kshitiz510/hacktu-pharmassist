import { motion } from "framer-motion";
import {
  Sparkles,
  Plus,
  TrendingUp,
  Scale,
  Microscope,
  Globe,
  Database,
  FileBarChart,
} from "lucide-react";
import { AlertCircle } from "lucide-react";

export function LandingPage({
  onStartNewChat,
  onSelectFeature,
  showFullGrid = false,
  apiError = null,
  isLoading = false,
}) {
  const features = [
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
  ];

  const displayFeatures = showFullGrid ? features : features.slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex items-center justify-center py-12"
    >
      <div className={`text-center ${showFullGrid ? "max-w-2xl" : "px-8 py-8"} px-4`}>
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
          className={showFullGrid ? "mb-8" : "mb-8"}
        >
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center mb-6 shadow-lg shadow-primary/40">
            <Sparkles className="text-white" size={40} />
          </div>
          <h1
            className={`font-bold text-foreground mb-3 ${showFullGrid ? "text-4xl" : "text-3xl"}`}
          >
            Welcome to PharmAssist
          </h1>
          <p className={`text-muted-foreground ${showFullGrid ? "text-lg mb-8" : "max-w-lg"}`}>
            {showFullGrid
              ? "Multi-agent pharmaceutical intelligence system for drug repurposing analysis"
              : "Your AI-powered pharmaceutical intelligence assistant. I can analyze drug repurposing opportunities, clinical trials, patents, and market data."}
          </p>
        </motion.div>

        {apiError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/30 flex items-center gap-3 ${showFullGrid ? "max-w-2xl mx-auto" : ""}`}
          >
            <AlertCircle className="text-destructive flex-shrink-0" size={20} />
            <p className="text-sm text-destructive text-left">{apiError}</p>
          </motion.div>
        )}

        {showFullGrid && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onStartNewChat}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-semibold text-lg text-primary-foreground bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-lg shadow-primary/30 transition-all mb-12 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={20} />
            Start New Analysis
          </motion.button>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: showFullGrid ? 0.6 : 0.2 }}
          className={`grid gap-4 text-left ${
            showFullGrid
              ? "grid-cols-1 md:grid-cols-3"
              : "grid-cols-1 md:grid-cols-3 w-full max-w-2xl"
          }`}
        >
          {displayFeatures.map((feature, idx) => {
            const Icon = feature.icon;
            const isClickable = !showFullGrid;

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (showFullGrid ? 0.7 : 0.2) + idx * 0.1 }}
                onClick={() => isClickable && onSelectFeature?.(feature.title)}
                className={`p-4 rounded-xl bg-card border border-border transition-all ${
                  isClickable
                    ? "hover:border-primary/50 cursor-pointer group"
                    : "hover:border-primary/50"
                }`}
              >
                <Icon
                  className={`mb-3 text-primary ${isClickable ? "group-hover:scale-110 transition-transform" : ""}`}
                  size={24}
                />
                <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                <p className="text-xs text-muted-foreground">{feature.desc}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </motion.div>
  );
}
