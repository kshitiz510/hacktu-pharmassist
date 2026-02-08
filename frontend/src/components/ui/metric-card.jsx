/**
 * MetricCard - Unified metric card component for consistent agent outputs
 *
 * All cards have fixed dimensions for visual consistency across all agents
 */

import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

// Fixed card dimensions for consistency
const CARD_HEIGHT = "h-[120px]";
const CARD_MIN_HEIGHT = "min-h-[120px]";

// Color themes matching agent colors
const colorThemes = {
  blue: {
    bg: "bg-blue-500/5",
    border: "border-blue-500/20",
    accent: "text-blue-400",
    gradient: "from-blue-500/10 to-transparent",
  },
  teal: {
    bg: "bg-teal-500/5",
    border: "border-teal-500/20",
    accent: "text-teal-400",
    gradient: "from-teal-500/10 to-transparent",
  },
  amber: {
    bg: "bg-amber-500/5",
    border: "border-amber-500/20",
    accent: "text-amber-400",
    gradient: "from-amber-500/10 to-transparent",
  },
  emerald: {
    bg: "bg-emerald-500/5",
    border: "border-emerald-500/20",
    accent: "text-emerald-400",
    gradient: "from-emerald-500/10 to-transparent",
  },
  violet: {
    bg: "bg-violet-500/5",
    border: "border-violet-500/20",
    accent: "text-violet-400",
    gradient: "from-violet-500/10 to-transparent",
  },
  pink: {
    bg: "bg-pink-500/5",
    border: "border-pink-500/20",
    accent: "text-pink-400",
    gradient: "from-pink-500/10 to-transparent",
  },
  cyan: {
    bg: "bg-cyan-500/5",
    border: "border-cyan-500/20",
    accent: "text-cyan-400",
    gradient: "from-cyan-500/10 to-transparent",
  },
};

/**
 * MetricCard - Display a single metric with optional trend indicator
 */
export function MetricCard({
  label,
  value,
  unit = "",
  trend,
  trendValue,
  color = "blue",
  icon: Icon,
  delay = 0,
  compact = false,
}) {
  const theme = colorThemes[color] || colorThemes.blue;

  // Determine trend direction
  const trendDirection =
    trend === "up" || (typeof trendValue === "number" && trendValue > 0)
      ? "up"
      : trend === "down" || (typeof trendValue === "number" && trendValue < 0)
        ? "down"
        : null;

  const TrendIcon =
    trendDirection === "up" ? TrendingUp : trendDirection === "down" ? TrendingDown : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.05, duration: 0.3 }}
      className={`
        relative overflow-hidden rounded-xl border ${theme.border} ${theme.bg}
        ${compact ? "p-3" : "p-4"}
        ${compact ? "min-h-[80px]" : CARD_MIN_HEIGHT}
        bg-gradient-to-br ${theme.gradient}
        hover:border-opacity-40 transition-all duration-300
        flex flex-col justify-between
      `}
    >
      {/* Label */}
      <div className="flex items-start justify-between gap-2">
        <p
          className={`text-muted-foreground font-medium ${compact ? "text-[10px]" : "text-xs"} uppercase tracking-wider leading-tight`}
        >
          {label}
        </p>
        {Icon && (
          <Icon className={`${theme.accent} flex-shrink-0 opacity-60`} size={compact ? 14 : 16} />
        )}
      </div>

      {/* Value */}
      <div className="flex items-end justify-between gap-2 mt-auto">
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span
            className={`font-bold ${theme.accent} ${compact ? "text-xl" : "text-2xl"} truncate leading-none`}
          >
            {value ?? "—"}
          </span>
          {unit && (
            <span
              className={`text-muted-foreground ${compact ? "text-[10px]" : "text-xs"} font-medium`}
            >
              {unit}
            </span>
          )}
        </div>

        {/* Trend Indicator - Simple text only, no box */}
        {trendValue !== undefined && trendValue !== null && (
          <div
            className={`flex items-center gap-1 text-xs font-medium flex-shrink-0
            ${trendDirection === "up" ? "text-emerald-400" : trendDirection === "down" ? "text-red-400" : "text-muted-foreground"}
          `}
          >
            {TrendIcon && <TrendIcon size={12} />}
            <span>
              {typeof trendValue === "number"
                ? `${trendValue > 0 ? "+" : ""}${trendValue}%`
                : trendValue}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/**
 * MetricGrid - Container for metric cards with consistent grid layout
 */
export function MetricGrid({ children, columns = 3, className = "" }) {
  return <div className={`grid grid-cols-${columns} gap-3 ${className}`}>{children}</div>;
}

/**
 * DataTable - Compact table component for tabular data
 */
export function DataTable({ headers = [], rows = [], color = "blue", compact = false }) {
  const theme = colorThemes[color] || colorThemes.blue;

  if (!rows.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`rounded-xl border ${theme.border} overflow-hidden`}
    >
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            {headers.map((header, idx) => (
              <th
                key={idx}
                className={`text-left ${compact ? "px-2 py-1.5" : "px-3 py-2"} text-foreground font-semibold text-xs uppercase tracking-wider`}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              className="border-t border-border/50 hover:bg-muted/30 transition-colors"
            >
              {row.map((cell, cellIdx) => (
                <td
                  key={cellIdx}
                  className={`${compact ? "px-2 py-1.5" : "px-3 py-2"} text-muted-foreground`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
}

/**
 * InfoCard - Card for text-based information
 */
export function InfoCard({ title, content, items = [], color = "blue", icon: Icon, delay = 0 }) {
  const theme = colorThemes[color] || colorThemes.blue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.05, duration: 0.3 }}
      className={`
        rounded-xl border ${theme.border} ${theme.bg}
        bg-gradient-to-br ${theme.gradient}
        p-4 space-y-2
      `}
    >
      {title && (
        <div className="flex items-center gap-2">
          {Icon && <Icon className={theme.accent} size={16} />}
          <h4 className="font-semibold text-foreground text-sm">{title}</h4>
        </div>
      )}

      {content && <p className="text-muted-foreground text-sm leading-relaxed">{content}</p>}

      {items.length > 0 && (
        <ul className="space-y-1.5">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className={`${theme.accent} mt-1`}>•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}

/**
 * SectionHeader - Section title with optional badge
 */
export function SectionHeader({ title, badge, color = "blue" }) {
  const theme = colorThemes[color] || colorThemes.blue;

  return (
    <div className="flex items-center gap-2 mb-3">
      <h3 className={`font-semibold ${theme.accent} text-base`}>{title}</h3>
      {badge && (
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${theme.bg} ${theme.accent} font-medium`}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

/**
 * SummaryBanner - Canonical summary banner for all agents
 * 
 * Displays:
 * - Researcher question
 * - Yes/No/Risky answer badge
 * - 3 explainer bullet points
 */
export function SummaryBanner({ summary, color = "blue", delay = 0 }) {
  if (!summary || !summary.researcherQuestion) {
    return null;
  }

  const theme = colorThemes[color] || colorThemes.blue;
  
  // Safely convert question to string
  const questionText = typeof summary.researcherQuestion === 'string'
    ? summary.researcherQuestion
    : (summary.researcherQuestion?.text || String(summary.researcherQuestion));
  
  // Determine badge styling based on answer
  const rawAnswer = summary.answer || "Unknown";
  const answer = typeof rawAnswer === 'string' ? rawAnswer : (rawAnswer?.text || String(rawAnswer));
  const answerLower = answer.toLowerCase();
  
  let badgeStyle = "";
  
  if (answerLower === "yes" || answerLower === "positive" || answerLower === "clear") {
    badgeStyle = "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  } else if (answerLower === "no" || answerLower === "blocked" || answerLower === "caution") {
    badgeStyle = "bg-red-500/20 text-red-400 border-red-500/30";
  } else if (answerLower === "risky" || answerLower === "unclear" || answerLower === "mixed" || answerLower === "developing" || answerLower === "stable") {
    badgeStyle = "bg-amber-500/20 text-amber-400 border-amber-500/30";
  } else {
    badgeStyle = `${theme.bg} ${theme.accent} ${theme.border}`;
  }

  const explainers = summary.explainers || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.05, duration: 0.3 }}
      className={`
        relative overflow-hidden rounded-xl border ${theme.border} ${theme.bg}
        p-4 mb-4
        bg-gradient-to-br ${theme.gradient}
      `}
    >
      {/* Question and Answer Row */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-muted-foreground font-medium">
          {questionText}
        </p>
        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${badgeStyle}`}>
          {answer}
        </span>
      </div>
      
      {/* Explainers */}
      {explainers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {explainers.slice(0, 3).map((explainer, idx) => {
            // Ensure explainer is a string
            const explainerText = typeof explainer === 'string' 
              ? explainer 
              : (explainer && typeof explainer === 'object' 
                  ? (explainer.text || explainer.value || JSON.stringify(explainer)) 
                  : String(explainer));
            
            return (
              <span
                key={idx}
                className={`text-xs px-2 py-1 rounded-md ${theme.bg} text-muted-foreground border ${theme.border}`}
              >
                {explainerText}
              </span>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

/**
 * SuggestedPrompts - Display suggested next prompts
 */
export function SuggestedPrompts({ prompts, onPromptClick, color = "blue" }) {
  if (!prompts || prompts.length === 0) {
    return null;
  }

  const theme = colorThemes[color] || colorThemes.blue;

  return (
    <div className="mt-4 pt-4 border-t border-white/5">
      <p className="text-xs text-muted-foreground mb-2">Suggested follow-ups:</p>
      <div className="flex flex-wrap gap-2">
        {prompts.slice(0, 2).map((item, idx) => (
          <button
            key={idx}
            onClick={() => onPromptClick?.(item.prompt)}
            className={`
              text-xs px-3 py-1.5 rounded-lg
              ${theme.bg} ${theme.accent} border ${theme.border}
              hover:bg-opacity-80 transition-all duration-200
              cursor-pointer
            `}
          >
            {item.prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

export default MetricCard;
