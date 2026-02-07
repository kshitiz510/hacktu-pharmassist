/**
 * Modular Visualization System
 *
 * A highly modular, agent-agnostic visualization system that:
 * - Renders beautiful charts using Recharts
 * - Handles missing/null data gracefully
 * - Formats column names intelligently
 * - Supports bar, pie, line, area, table, and metric card types
 * - Provides consistent styling across all visualizations
 */

import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
  LineChart as RechartsLineChart,
  Line,
  AreaChart as RechartsAreaChart,
  Area,
} from "recharts";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Table as TableIcon,
  BarChart3,
  PieChart as PieChartIcon,
} from "lucide-react";

// ============================================================================
// COLOR PALETTE - Vibrant, interesting colors
// ============================================================================
export const CHART_COLORS = [
  "#7c3aed", // Vibrant purple
  "#06b6d4", // Bright cyan
  "#14b8a6", // Teal
  "#f59e0b", // Amber
  "#ec4899", // Hot pink
  "#8b5cf6", // Violet
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f97316", // Orange
  "#6366f1", // Indigo
  "#84cc16", // Lime
  "#ef4444", // Red
];

export const GRADIENT_COLORS = [
  { start: "#8b5cf6", end: "#a78bfa" },
  { start: "#06b6d4", end: "#22d3ee" },
  { start: "#10b981", end: "#34d399" },
  { start: "#f59e0b", end: "#fbbf24" },
  { start: "#ef4444", end: "#f87171" },
  { start: "#ec4899", end: "#f472b6" },
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert field keys to human-readable labels
 */
export const formatLabel = (key) => {
  if (!key) return "";

  // Special cases
  const specialLabels = {
    nct_id: "NCT ID",
    id: "ID",
    url: "URL",
    api: "API",
    cagr: "CAGR",
    roi: "ROI",
    usd: "USD",
    eur: "EUR",
    gbp: "GBP",
  };

  const lower = key.toLowerCase();
  if (specialLabels[lower]) return specialLabels[lower];

  // Convert snake_case and camelCase to Title Case
  return key
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/\b\w/g, (m) => m.toUpperCase())
    .trim();
};

/**
 * Format numeric values with appropriate precision and units
 */
export const formatValue = (value, type = "number") => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (type === "currency") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  if (type === "percent") {
    return `${Number(value).toFixed(1)}%`;
  }

  if (typeof value === "number") {
    if (value >= 1_000_000_000) {
      return `${(value / 1_000_000_000).toFixed(1)}B`;
    }
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M`;
    }
    if (value >= 1_000) {
      return `${(value / 1_000).toFixed(1)}K`;
    }
    if (Number.isInteger(value)) {
      return value.toLocaleString();
    }
    return value.toFixed(2);
  }

  return String(value);
};

/**
 * Sanitize data - handle missing values, normalize structure
 */
export const sanitizeData = (data, fields = []) => {
  if (!Array.isArray(data)) return [];

  return data.map((item, idx) => {
    const sanitized = { ...item, _index: idx };
    fields.forEach((field) => {
      if (sanitized[field] === null || sanitized[field] === undefined) {
        sanitized[field] = 0;
      }
    });
    return sanitized;
  });
};

// ============================================================================
// BASE CARD COMPONENT - Enhanced with vibrant styling
// ============================================================================

const VizCard = ({ title, description, icon: Icon, children, className = "" }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
    className={`bg-gradient-to-br from-card via-card/95 to-card/90 border-2 border-border/30 rounded-2xl p-6 shadow-2xl hover:shadow-3xl hover:border-primary/20 transition-all duration-300 backdrop-blur-sm ${className}`}
  >
    {title && (
      <div className="flex items-start justify-between mb-5 pb-4 border-b-2 border-gradient-to-r from-primary/20 via-border/40 to-primary/20">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-3">
            {Icon && (
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 via-primary/15 to-primary/10 border-2 border-primary/30 shadow-md">
                <Icon size={20} className="text-primary" />
              </div>
            )}
            <span className="bg-gradient-to-r from-foreground to-foreground/90 bg-clip-text text-transparent">
              {title}
            </span>
          </h3>
          {description && (
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{description}</p>
          )}
        </div>
      </div>
    )}
    {children}
  </motion.div>
);

// ============================================================================
// CUSTOM TOOLTIP
// ============================================================================

const CustomTooltip = ({ active, payload, label, labelFormatter }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-3 min-w-[120px]">
      <p className="text-sm font-medium text-foreground mb-2">
        {labelFormatter ? labelFormatter(label) : label}
      </p>
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center justify-between gap-4 text-sm">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground">{formatLabel(entry.dataKey)}</span>
          </span>
          <span className="font-medium text-foreground">{formatValue(entry.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// BAR CHART COMPONENT - Supports both vertical and horizontal orientations
// ============================================================================

export const BarChartViz = ({ viz }) => {
  const { data = [], config = {}, title, description } = viz;
  const xField = config.xField || "label";
  const yField = config.yField || "value";
  const orientation = config.orientation || "vertical";

  const sanitizedData = useMemo(() => sanitizeData(data, [yField]), [data, yField]);

  if (!sanitizedData.length) {
    return (
      <VizCard title={title} description={description} icon={BarChart3}>
        <EmptyState message="No data available for chart" />
      </VizCard>
    );
  }

  // In Recharts: layout="vertical" means bars go horizontally (left to right)
  // layout="horizontal" (default) means bars go vertically (bottom to top)
  const isHorizontal = orientation === "horizontal";

  return (
    <VizCard title={title} description={description} icon={BarChart3}>
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart
            data={sanitizedData}
            layout={isHorizontal ? "vertical" : "horizontal"}
            margin={{
              top: 20,
              right: 50,
              left: isHorizontal ? 20 : 40,
              bottom: isHorizontal ? 20 : 70,
            }}
          >
            <defs>
              {sanitizedData.map((_, idx) => {
                const color = CHART_COLORS[idx % CHART_COLORS.length];
                return (
                  <linearGradient
                    key={`barGrad${idx}`}
                    id={`barGrad${idx}`}
                    x1="0"
                    y1="0"
                    x2={isHorizontal ? "1" : "0"}
                    y2={isHorizontal ? "0" : "1"}
                  >
                    <stop offset="0%" stopColor={color} stopOpacity={1} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.65} />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
            {isHorizontal ? (
              <>
                <XAxis
                  type="number"
                  tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
                  tickLine={{ stroke: "hsl(var(--border))" }}
                  axisLine={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                  tickFormatter={formatValue}
                />
                <YAxis
                  dataKey={xField}
                  type="category"
                  tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
                  tickLine={{ stroke: "hsl(var(--border))" }}
                  axisLine={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                  width={180}
                  tickFormatter={(v) => (v?.length > 25 ? v.slice(0, 25) + "…" : v)}
                />
              </>
            ) : (
              <>
                <XAxis
                  dataKey={xField}
                  tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }}
                  tickLine={{ stroke: "hsl(var(--border))" }}
                  axisLine={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                  tickFormatter={(v) => (v?.length > 10 ? v.slice(0, 10) + "…" : v)}
                  angle={-45}
                  textAnchor="end"
                  height={70}
                  interval={0}
                />
                <YAxis
                  tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
                  tickLine={{ stroke: "hsl(var(--border))" }}
                  axisLine={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                  tickFormatter={formatValue}
                />
              </>
            )}
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.15 }}
            />
            <Bar
              dataKey={yField}
              radius={isHorizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]}
              maxBarSize={55}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {sanitizedData.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={`url(#barGrad${idx})`} />
              ))}
            </Bar>
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </VizCard>
  );
};

// ============================================================================
// PIE CHART COMPONENT
// ============================================================================

export const PieChartViz = ({ viz }) => {
  const { data = [], config = {}, title, description } = viz;
  const labelField = config.labelField || "label";
  const valueField = config.valueField || "value";

  const sanitizedData = useMemo(() => {
    const filtered = data.filter(
      (d) => d[valueField] !== null && d[valueField] !== undefined && d[valueField] > 0,
    );
    return filtered.map((d, idx) => ({
      ...d,
      name: d[labelField] || `Item ${idx + 1}`,
      value: Number(d[valueField]) || 0,
    }));
  }, [data, labelField, valueField]);

  const total = useMemo(() => sanitizedData.reduce((sum, d) => sum + d.value, 0), [sanitizedData]);

  if (!sanitizedData.length || total === 0) {
    return (
      <VizCard title={title} description={description} icon={PieChartIcon}>
        <EmptyState message="No data available for chart" />
      </VizCard>
    );
  }

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null; // Hide labels for small slices
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={14}
        fontWeight={700}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Custom legend formatter to show percentages for all slices
  const renderLegendText = (value, entry) => {
    const percent = ((entry.value / total) * 100).toFixed(1);
    return (
      <span className="text-sm text-foreground">
        {value} <span className="text-muted-foreground">({percent}%)</span>
      </span>
    );
  };

  return (
    <VizCard title={title} description={description} icon={PieChartIcon}>
      <div className="h-[450px] w-full flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <defs>
              {sanitizedData.map((_, idx) => (
                <linearGradient key={idx} id={`pieGradient${idx}`} x1="0" y1="0" x2="1" y2="1">
                  <stop
                    offset="0%"
                    stopColor={CHART_COLORS[idx % CHART_COLORS.length]}
                    stopOpacity={1}
                  />
                  <stop
                    offset="100%"
                    stopColor={CHART_COLORS[idx % CHART_COLORS.length]}
                    stopOpacity={0.7}
                  />
                </linearGradient>
              ))}
            </defs>
            <Pie
              data={sanitizedData}
              cx="50%"
              cy="45%"
              innerRadius={80}
              outerRadius={140}
              paddingAngle={3}
              dataKey="value"
              labelLine={false}
              label={renderCustomLabel}
              animationDuration={1000}
              animationEasing="ease-out"
            >
              {sanitizedData.map((entry, idx) => (
                <Cell
                  key={`cell-${idx}`}
                  fill={`url(#pieGradient${idx})`}
                  stroke="var(--background)"
                  strokeWidth={3}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={100}
              iconType="circle"
              iconSize={12}
              wrapperStyle={{ paddingTop: "20px" }}
              formatter={(value, entry) => {
                const percent = ((entry.value / total) * 100).toFixed(1);
                return (
                  <span className="text-sm font-medium text-foreground">
                    {value} <span className="text-muted-foreground">({percent}%)</span>
                  </span>
                );
              }}
            />
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>
    </VizCard>
  );
};

// ============================================================================
// LINE CHART COMPONENT
// ============================================================================

export const LineChartViz = ({ viz }) => {
  const { data = [], config = {}, title, description } = viz;
  const xField = config.xField || "label";
  const yField = config.yField || "value";
  const yFields = config.yFields || [yField];

  const sanitizedData = useMemo(() => sanitizeData(data, yFields), [data, yFields]);

  if (!sanitizedData.length) {
    return (
      <VizCard title={title} description={description}>
        <EmptyState message="No data available for chart" />
      </VizCard>
    );
  }

  return (
    <VizCard title={title} description={description}>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsLineChart
            data={sanitizedData}
            margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
            <XAxis
              dataKey={xField}
              stroke="var(--muted-foreground)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="var(--muted-foreground)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatValue}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {yFields.map((field, idx) => (
              <Line
                key={field}
                type="monotone"
                dataKey={field}
                stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                strokeWidth={2}
                dot={{ fill: CHART_COLORS[idx % CHART_COLORS.length], r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>
    </VizCard>
  );
};

// ============================================================================
// AREA CHART COMPONENT
// ============================================================================

export const AreaChartViz = ({ viz }) => {
  const { data = [], config = {}, title, description } = viz;
  const xField = config.xField || "label";
  const yField = config.yField || "value";

  const sanitizedData = useMemo(() => sanitizeData(data, [yField]), [data, yField]);

  if (!sanitizedData.length) {
    return (
      <VizCard title={title} description={description}>
        <EmptyState message="No data available for chart" />
      </VizCard>
    );
  }

  return (
    <VizCard title={title} description={description}>
      <div className="h-[450px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsAreaChart
            data={sanitizedData}
            margin={{ top: 25, right: 50, left: 60, bottom: 60 }}
          >
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                <stop offset="50%" stopColor="#8b5cf6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.2} />
            <XAxis
              dataKey={xField}
              stroke="var(--muted-foreground)"
              fontSize={13}
              tickLine={{ stroke: "var(--border)" }}
              axisLine={{ stroke: "var(--border)", strokeWidth: 1 }}
              angle={-45}
              textAnchor="end"
              height={80}
              tickFormatter={formatLabel}
            />
            <YAxis
              stroke="var(--muted-foreground)"
              fontSize={13}
              tickLine={{ stroke: "var(--border)" }}
              axisLine={{ stroke: "var(--border)", strokeWidth: 1 }}
              width={70}
              tickFormatter={formatValue}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: "var(--muted)", strokeWidth: 1, strokeDasharray: "5 5" }}
            />
            <Area
              type="monotone"
              dataKey={yField}
              stroke="#8b5cf6"
              strokeWidth={3}
              fill="url(#areaGradient)"
              animationDuration={1200}
              animationEasing="ease-in-out"
              dot={{ fill: "#fff", stroke: "#8b5cf6", strokeWidth: 2, r: 5 }}
              activeDot={{ r: 8, strokeWidth: 3 }}
            />
          </RechartsAreaChart>
        </ResponsiveContainer>
      </div>
    </VizCard>
  );
};

// ============================================================================
// METRIC CARD COMPONENT
// ============================================================================

export const MetricCardViz = ({ viz, index = 0 }) => {
  const { data = {}, title, description } = viz;
  const { value, delta, unit } = data;

  // Different gradient colors for each metric card to avoid back-to-back same colors
  const cardGradients = [
    "from-purple-600 via-purple-500 to-violet-500",
    "from-cyan-600 via-cyan-500 to-blue-500",
    "from-emerald-600 via-emerald-500 to-teal-500",
    "from-amber-600 via-amber-500 to-orange-500",
    "from-pink-600 via-pink-500 to-rose-500",
    "from-indigo-600 via-indigo-500 to-blue-600",
  ];
  const gradient = cardGradients[index % cardGradients.length];

  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (typeof value === "number") {
      const duration = 1500;
      const steps = 70;
      const increment = value / steps;
      let current = 0;
      const interval = setInterval(() => {
        current += increment;
        if (current >= value) {
          setDisplayValue(value);
          clearInterval(interval);
        } else {
          setDisplayValue(Math.round(current * 10) / 10);
        }
      }, duration / steps);
      return () => clearInterval(interval);
    } else {
      setDisplayValue(value ?? "—");
    }
  }, [value]);

  const TrendIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const trendColor =
    delta > 0 ? "text-emerald-500" : delta < 0 ? "text-red-500" : "text-muted-foreground";

  return (
    <VizCard title={title} description={description}>
      <div className="flex items-end justify-between py-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
          className="flex items-baseline gap-2"
        >
          <span
            className={`text-5xl font-bold bg-gradient-to-br ${gradient} bg-clip-text text-transparent drop-shadow-2xl`}
          >
            {formatValue(displayValue)}
          </span>
          {unit && <span className="text-xl font-semibold text-muted-foreground">{unit}</span>}
        </motion.div>

        {typeof delta === "number" && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.3 }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
              delta > 0
                ? "bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 border-2 border-emerald-500/40"
                : delta < 0
                  ? "bg-gradient-to-r from-red-500/20 to-red-600/20 border-2 border-red-500/40"
                  : "bg-muted/50"
            } shadow-lg ${trendColor}`}
          >
            <TrendIcon size={20} />
            <span className="text-base font-semibold">
              {delta > 0 ? "+" : ""}
              {delta}%
            </span>
          </motion.div>
        )}
      </div>
    </VizCard>
  );
};

// ============================================================================
// DATA TABLE COMPONENT
// ============================================================================

export const DataTableViz = ({ viz }) => {
  const { data = {}, title, description, config = {} } = viz;
  const columns = data.columns || [];
  const rows = data.rows || [];
  const pageSize = config.pageSize || 20; // No limit, show all data with pagination

  const [page, setPage] = useState(0);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const normalizedColumns = useMemo(() => {
    return columns
      .map((col) => {
        if (typeof col === "string") {
          return { key: col, label: formatLabel(col) };
        }
        return {
          key: col.key || col.field || col.name,
          label: col.label || formatLabel(col.key || col.field || col.name),
          type: col.type,
        };
      })
      .filter((c) => c.key);
  }, [columns]);

  const sortedRows = useMemo(() => {
    if (!sortConfig.key) return rows;

    return [...rows].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
      }

      const comparison = String(aVal).localeCompare(String(bVal));
      return sortConfig.direction === "asc" ? comparison : -comparison;
    });
  }, [rows, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentRows = sortedRows.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  if (!normalizedColumns.length || !rows.length) {
    return (
      <VizCard title={title} description={description} icon={TableIcon}>
        <EmptyState message="No data available for table" />
      </VizCard>
    );
  }

  return (
    <VizCard title={title} description={description} icon={TableIcon} className="overflow-hidden">
      <div className="overflow-x-auto -mx-5 px-5">
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr className="bg-muted/40">
              {normalizedColumns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="text-left p-4 text-muted-foreground font-bold whitespace-nowrap cursor-pointer hover:text-foreground hover:bg-muted/60 transition-colors select-none first:rounded-tl-xl last:rounded-tr-xl border-b-2 border-border"
                >
                  <span className="flex items-center gap-2">
                    {col.label}
                    {sortConfig.key === col.key && (
                      <span className="text-sm font-bold text-primary">
                        {sortConfig.direction === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {currentRows.map((row, rowIdx) => (
                <motion.tr
                  key={`${page}-${rowIdx}`}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ delay: rowIdx * 0.02, duration: 0.2 }}
                  className="border-b border-border/50 hover:bg-primary/5 transition-all duration-200 hover:shadow-sm"
                >
                  {normalizedColumns.map((col) => {
                    const cellValue = row[col.key];
                    const displayValue = Array.isArray(cellValue)
                      ? cellValue.join(", ")
                      : (cellValue ?? "—");

                    return (
                      <td
                        key={col.key}
                        className="p-4 text-foreground font-medium align-top max-w-[400px] truncate"
                        title={String(displayValue)}
                      >
                        {displayValue}
                      </td>
                    );
                  })}
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-5 border-t-2 border-border/50">
          <span className="text-sm font-medium text-muted-foreground">
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, rows.length)} of{" "}
            <span className="text-foreground font-bold">{rows.length}</span>
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-2.5 rounded-xl border-2 border-border hover:bg-primary/10 hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-bold text-foreground px-3 py-1 bg-muted/50 rounded-lg">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-2.5 rounded-xl border-2 border-border hover:bg-primary/10 hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </VizCard>
  );
};

// ============================================================================
// EMPTY STATE COMPONENT
// ============================================================================

const EmptyState = ({ message = "No data available" }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <AlertCircle size={32} className="text-muted-foreground mb-3" />
    <p className="text-sm text-muted-foreground">{message}</p>
  </div>
);

// ============================================================================
// IMAGE VISUALIZATION - Renders images with captions
// ============================================================================

const ImageViz = ({ viz }) => {
  const { data, title, description } = viz;
  const imageUrl = data?.imageUrl || data?.content;
  const caption = data?.caption || description;
  const sourceUrl = data?.sourceUrl;
  const source = data?.source || "Statista";

  if (!imageUrl) {
    return (
      <VizCard title={title || "Image"}>
        <EmptyState message="No image URL provided" />
      </VizCard>
    );
  }

  return (
    <VizCard title={title || "Market Infographic"} description={description}>
      <div className="space-y-4">
        <div className="relative bg-muted rounded-lg overflow-hidden">
          <img
            src={imageUrl}
            alt={title || "Infographic"}
            className="w-full h-auto"
            onError={(e) => {
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "flex";
            }}
          />
          <div
            className="hidden flex-col items-center justify-center py-12 text-center"
            style={{ display: "none" }}
          >
            <AlertCircle size={32} className="text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Failed to load image</p>
          </div>
        </div>
        {caption && <p className="text-sm text-muted-foreground italic">{caption}</p>}
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
          >
            View on {source} →
          </a>
        )}
      </div>
    </VizCard>
  );
};

// ============================================================================
// VISUALIZATION RENDERER - Routes to correct component
// ============================================================================

export const VizRenderer = ({ viz }) => {
  if (!viz || !viz.vizType) {
    return <EmptyState message="Invalid visualization configuration" />;
  }

  const type = viz.vizType.toLowerCase();

  switch (type) {
    case "bar":
      return <BarChartViz viz={viz} />;
    case "pie":
      return <PieChartViz viz={viz} />;
    case "line":
      return <LineChartViz viz={viz} />;
    case "area":
      return <AreaChartViz viz={viz} />;
    case "table":
      return <DataTableViz viz={viz} />;
    case "card":
      return <MetricCardViz viz={viz} index={viz.index || 0} />;
    case "image":
      return <ImageViz viz={viz} />;
    default:
      return (
        <VizCard title={viz.title || "Unsupported Chart"}>
          <EmptyState message={`Chart type "${viz.vizType}" is not supported`} />
        </VizCard>
      );
  }
};

// ============================================================================
// VISUALIZATION LIST - Renders array of visualizations in logical vertical order
// ============================================================================

export const VizList = ({ visualizations = [], agentName, className = "" }) => {
  if (!visualizations?.length) return null;

  // Group visualizations by type for logical ordering
  const metricCards = visualizations.filter((v) => v.vizType?.toLowerCase() === "card");
  const images = visualizations.filter((v) => v.vizType?.toLowerCase() === "image");
  const barCharts = visualizations.filter((v) => v.vizType?.toLowerCase() === "bar");
  const pieCharts = visualizations.filter((v) => v.vizType?.toLowerCase() === "pie");
  const lineCharts = visualizations.filter((v) => v.vizType?.toLowerCase() === "line");
  const areaCharts = visualizations.filter((v) => v.vizType?.toLowerCase() === "area");
  const tables = visualizations.filter((v) => v.vizType?.toLowerCase() === "table");

  // Logical order: Cards → Charts (Bar, Pie, Line, Area) → Images → Tables
  const orderedSections = [
    { type: "cards", items: metricCards, cols: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" },
    { type: "bar", items: barCharts, cols: "grid-cols-1" },
    { type: "pie", items: pieCharts, cols: "grid-cols-1" },
    { type: "line", items: lineCharts, cols: "grid-cols-1" },
    { type: "area", items: areaCharts, cols: "grid-cols-1" },
    { type: "images", items: images, cols: "grid-cols-1 lg:grid-cols-2" },
    { type: "tables", items: tables, cols: "grid-cols-1" },
  ];

  return (
    <div className={`space-y-8 ${className}`}>
      {orderedSections.map(({ type, items, cols }, sectionIdx) => {
        if (!items.length) return null;

        return (
          <div key={type} className="space-y-6">
            <div className={`grid ${cols} gap-6`}>
              {items.map((viz, idx) => (
                <motion.div
                  key={viz.id || `${type}-${idx}`}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: sectionIdx * 0.1 + idx * 0.05,
                    duration: 0.5,
                    ease: [0.4, 0, 0.2, 1],
                  }}
                  className="w-full"
                >
                  <VizRenderer viz={{ ...viz, index: idx }} />
                </motion.div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default VizList;
