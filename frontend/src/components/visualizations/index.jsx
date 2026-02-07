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
// COLOR PALETTE - Beautiful, accessible colors
// ============================================================================
export const CHART_COLORS = [
  "#8b5cf6", // Violet
  "#06b6d4", // Cyan
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#ec4899", // Pink
  "#3b82f6", // Blue
  "#84cc16", // Lime
  "#f97316", // Orange
  "#6366f1", // Indigo
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
// BASE CARD COMPONENT
// ============================================================================

const VizCard = ({ title, description, icon: Icon, children, className = "" }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: "easeOut" }}
    className={`bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow ${className}`}
  >
    <div className="flex items-start justify-between mb-4">
      <div className="flex-1">
        {title && (
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            {Icon && <Icon size={18} className="text-primary" />}
            {title}
          </h3>
        )}
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
    </div>
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
// BAR CHART COMPONENT
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

  const isHorizontal = orientation === "horizontal";

  return (
    <VizCard title={title} description={description} icon={BarChart3}>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart
            data={sanitizedData}
            layout={isHorizontal ? "vertical" : "horizontal"}
            margin={{ top: 10, right: 30, left: isHorizontal ? 80 : 0, bottom: 20 }}
          >
            <defs>
              {GRADIENT_COLORS.map((color, idx) => (
                <linearGradient key={idx} id={`barGradient${idx}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color.start} stopOpacity={1} />
                  <stop offset="100%" stopColor={color.end} stopOpacity={0.8} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
            {isHorizontal ? (
              <>
                <XAxis
                  type="number"
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatValue}
                />
                <YAxis
                  dataKey={xField}
                  type="category"
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={70}
                  tickFormatter={(v) => (v?.length > 12 ? v.slice(0, 12) + "…" : v)}
                />
              </>
            ) : (
              <>
                <XAxis
                  dataKey={xField}
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => (v?.length > 10 ? v.slice(0, 10) + "…" : v)}
                  angle={-35}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatValue}
                />
              </>
            )}
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey={yField} fill="url(#barGradient0)" radius={[4, 4, 0, 0]} maxBarSize={50} />
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
        fontSize={12}
        fontWeight={600}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <VizCard title={title} description={description} icon={PieChartIcon}>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <Pie
              data={sanitizedData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              labelLine={false}
              label={renderCustomLabel}
            >
              {sanitizedData.map((entry, idx) => (
                <Cell
                  key={`cell-${idx}`}
                  fill={CHART_COLORS[idx % CHART_COLORS.length]}
                  stroke="var(--background)"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
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
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsAreaChart
            data={sanitizedData}
            margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
          >
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
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
            <Area
              type="monotone"
              dataKey={yField}
              stroke="#8b5cf6"
              strokeWidth={2}
              fill="url(#areaGradient)"
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

export const MetricCardViz = ({ viz }) => {
  const { data = {}, title, description } = viz;
  const { value, delta, unit, trend } = data;

  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (typeof value === "number") {
      const duration = 1200;
      const steps = 60;
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
      <div className="flex items-end justify-between">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
        >
          <span className="text-4xl font-bold text-foreground">{formatValue(displayValue)}</span>
          {unit && <span className="text-lg font-medium text-muted-foreground ml-1">{unit}</span>}
        </motion.div>

        {typeof delta === "number" && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.3 }}
            className={`flex items-center gap-1 ${trendColor}`}
          >
            <TrendIcon size={18} />
            <span className="text-sm font-medium">
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
  const pageSize = Math.min(config.pageSize || 15, 25);

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
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {normalizedColumns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="text-left p-3 text-muted-foreground font-semibold whitespace-nowrap cursor-pointer hover:text-foreground transition-colors select-none"
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {sortConfig.key === col.key && (
                      <span className="text-xs">{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
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
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                >
                  {normalizedColumns.map((col) => {
                    const cellValue = row[col.key];
                    const displayValue = Array.isArray(cellValue)
                      ? cellValue.join(", ")
                      : (cellValue ?? "—");

                    return (
                      <td
                        key={col.key}
                        className="p-3 text-foreground align-top max-w-[300px] truncate"
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
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
          <span className="text-sm text-muted-foreground">
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, rows.length)} of{" "}
            {rows.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-foreground px-2">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
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
      return <MetricCardViz viz={viz} />;
    default:
      return (
        <VizCard title={viz.title || "Unsupported Chart"}>
          <EmptyState message={`Chart type "${viz.vizType}" is not supported`} />
        </VizCard>
      );
  }
};

// ============================================================================
// VISUALIZATION LIST - Renders array of visualizations
// ============================================================================

export const VizList = ({ visualizations = [], agentName, className = "" }) => {
  if (!visualizations?.length) return null;

  return (
    <div className={`space-y-6 ${className}`}>
      {agentName && (
        <motion.h2
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-lg font-semibold text-foreground"
        >
          {agentName} Results
        </motion.h2>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Metric cards in a row */}
        {visualizations
          .filter((v) => v.vizType?.toLowerCase() === "card")
          .map((viz, idx) => (
            <motion.div
              key={viz.id || `card-${idx}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <VizRenderer viz={viz} />
            </motion.div>
          ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {visualizations
          .filter((v) => ["bar", "pie", "line", "area"].includes(v.vizType?.toLowerCase()))
          .map((viz, idx) => (
            <motion.div
              key={viz.id || `chart-${idx}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + idx * 0.1 }}
            >
              <VizRenderer viz={viz} />
            </motion.div>
          ))}
      </div>

      {/* Tables - full width */}
      {visualizations
        .filter((v) => v.vizType?.toLowerCase() === "table")
        .map((viz, idx) => (
          <motion.div
            key={viz.id || `table-${idx}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + idx * 0.1 }}
          >
            <VizRenderer viz={viz} />
          </motion.div>
        ))}
    </div>
  );
};

export default VizList;
