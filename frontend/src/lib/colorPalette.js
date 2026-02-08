/**
 * Professional Color Palette System
 *
 * A comprehensive color system with:
 * - Primary vibrancy palette (professional & distinct)
 * - Monochromatic shades for sequential/heatmap visualizations
 * - Complementary gradients for emphasis
 *
 * Base colors: Designed with professional pharmaceutical/healthcare aesthetics
 */

// ============================================================================
// PRIMARY COLOR PALETTE - Professional & Distinct
// ============================================================================

export const PRIMARY_PALETTE = [
  "#003f5c", // Dark Navy Blue
  "#2f4b7c", // Royal Blue
  "#665191", // Blue-Purple
  "#a05195", // Muted Purple
  "#d45087", // Rose-Pink
  "#f95d6a", // Coral-Pink
  "#ff7c43", // Burnt Orange
  "#ffa600", // Amber-Gold
];

// ============================================================================
// EXTENDED PALETTE - More colors for larger datasets
// ============================================================================

export const EXTENDED_PALETTE = [
  // Dark to light blues
  "#003f5c",
  "#1a5276",
  "#2f4b7c",
  "#445fa0",
  "#5873b4",

  // Blues to purples
  "#665191",
  "#7560a0",
  "#844faf",
  "#933ebe",

  // Purples to magentas
  "#a05195",
  "#b05aa5",
  "#c063b5",

  // Magentas to pinks
  "#d45087",
  "#e06c95",
  "#eb88a3",

  // Pinks to corals
  "#f95d6a",
  "#fa7a72",
  "#fb977a",

  // Corals to oranges
  "#ff7c43",
  "#ff8e52",
  "#ffa061",

  // Oranges to golds
  "#ffa600",
  "#ffb319",
  "#ffc033",
];

// ============================================================================
// MONOCHROMATIC SCALES - For sequential/heatmap data
// ============================================================================

/**
 * Dark Navy Blue - 8 shades from dark to light
 */
export const NAVY_SCALE = [
  "#001a2e", // Very Dark
  "#002041",
  "#003f5c", // Base
  "#1a5276",
  "#2874a6",
  "#5dade2",
  "#aed6f1",
  "#d6eaf8", // Very Light
];

/**
 * Royal Blue - 8 shades
 */
export const BLUE_SCALE = [
  "#0d2e52",
  "#1a3d6f",
  "#2f4b7c", // Base
  "#445fa0",
  "#5873b4",
  "#7a96c8",
  "#a8b9dc",
  "#d6dcf0", // Very Light
];

/**
 * Blue-Purple - 8 shades
 */
export const BLUE_PURPLE_SCALE = [
  "#372855",
  "#4f3370",
  "#665191", // Base
  "#7860a0",
  "#8a6faf",
  "#a689bf",
  "#c3afd5",
  "#dfd5eb", // Very Light
];

/**
 * Muted Purple - 8 shades
 */
export const PURPLE_SCALE = [
  "#522d6b",
  "#703f84",
  "#a05195", // Base
  "#b567a8",
  "#ca7dbb",
  "#dd9cce",
  "#edbbde",
  "#f5d6ea", // Very Light
];

/**
 * Rose-Pink - 8 shades
 */
export const ROSE_SCALE = [
  "#8b1538",
  "#b8227d",
  "#d45087", // Base
  "#dd6695",
  "#e680a3",
  "#f0a3b8",
  "#f8c4d6",
  "#fce3e8", // Very Light
];

/**
 * Coral-Pink - 8 shades
 */
export const CORAL_SCALE = [
  "#c81b3b",
  "#e63859",
  "#f95d6a", // Base
  "#fa7a80",
  "#fb9296",
  "#fdaaad",
  "#ffc3c8",
  "#fde0e1", // Very Light
];

/**
 * Burnt Orange - 8 shades
 */
export const ORANGE_SCALE = [
  "#b85c1d",
  "#d46e2a",
  "#ff7c43", // Base
  "#ff8e56",
  "#ffaa6f",
  "#ffc08f",
  "#ffd6af",
  "#ffecdf", // Very Light
];

/**
 * Amber-Gold - 8 shades
 */
export const AMBER_SCALE = [
  "#cc8a00",
  "#e69a00",
  "#ffa600", // Base
  "#ffb319",
  "#ffc033",
  "#ffce66",
  "#ffdb99",
  "#fff0cc", // Very Light
];

// ============================================================================
// HEATMAP SCALES - For intensity visualization
// ============================================================================

/**
 * Cold to Hot heatmap (blue -> red)
 */
export const COLD_TO_HOT = [
  "#003f5c", // Cold
  "#2f4b7c",
  "#665191",
  "#a05195",
  "#d45087",
  "#f95d6a",
  "#ff7c43",
  "#ffa600", // Hot
];

/**
 * Diverging scale (for comparing ranges)
 * Low | Middle | High
 */
export const DIVERGING_SCALE = [
  "#003f5c", // Low
  "#2f4b7c",
  "#5873b4",
  "#7fa6d8",
  "#b8d4e8",
  "#e8e8e8", // Middle neutral
  "#f0cac3",
  "#e89f8c",
  "#e07562",
  "#ff7c43",
  "#ffa600", // High
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get a specific color from palette by index
 */
export const getColor = (index, palette = PRIMARY_PALETTE) => {
  return palette[index % palette.length];
};

/**
 * Get multiple colors for a dataset
 */
export const getColors = (count, palette = PRIMARY_PALETTE) => {
  return Array.from({ length: count }, (_, i) => getColor(i, palette));
};

/**
 * Get a monochromatic scale for a given base color
 */
export const getMonochromaticScale = (baseColorName = "BLUE") => {
  const scales = {
    NAVY: NAVY_SCALE,
    BLUE: BLUE_SCALE,
    BLUE_PURPLE: BLUE_PURPLE_SCALE,
    PURPLE: PURPLE_SCALE,
    ROSE: ROSE_SCALE,
    CORAL: CORAL_SCALE,
    ORANGE: ORANGE_SCALE,
    AMBER: AMBER_SCALE,
  };

  return scales[baseColorName.toUpperCase()] || BLUE_SCALE;
};

/**
 * Generate a gradient definition for SVG (used in Recharts)
 */
export const generateGradient = (id, color1, color2) => {
  return {
    id,
    x1: "0",
    y1: "0",
    x2: "1",
    y2: "0",
    stops: [
      { offset: "0%", color: color1, opacity: 1 },
      { offset: "100%", color: color2, opacity: 0.6 },
    ],
  };
};

/**
 * Get alternating complementary colors from palette
 * Useful for distinguishing series in charts
 */
export const getAlternatingColors = (count, palette = PRIMARY_PALETTE) => {
  const colors = [];
  const step = Math.max(1, Math.floor(palette.length / Math.min(count, palette.length)));

  for (let i = 0; i < count; i++) {
    colors.push(palette[(i * step) % palette.length]);
  }

  return colors;
};

/**
 * Get contrasting text color (black or white) based on background color brightness
 */
export const getContrastColor = (hexColor) => {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? "#000000" : "#ffffff";
};

/**
 * Lighten a color by a certain percentage
 */
export const lightenColor = (color, percent = 20) => {
  const num = parseInt(color.slice(1), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;

  return (
    "#" +
    (0x1000000 + (R < 255 ? R : 255) * 0x10000 + (G < 255 ? G : 255) * 0x100 + (B < 255 ? B : 255))
      .toString(16)
      .slice(1)
  );
};

/**
 * Darken a color by a certain percentage
 */
export const darkenColor = (color, percent = 20) => {
  const num = parseInt(color.slice(1), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) - amt;
  const G = ((num >> 8) & 0x00ff) - amt;
  const B = (num & 0x0000ff) - amt;

  return (
    "#" +
    (0x1000000 + (R > 0 ? R : 0) * 0x10000 + (G > 0 ? G : 0) * 0x100 + (B > 0 ? B : 0))
      .toString(16)
      .slice(1)
  );
};

/**
 * Get a palette appropriate for a chart type
 */
export const getPaletteForChartType = (chartType = "bar") => {
  switch (chartType) {
    case "pie":
      return PRIMARY_PALETTE; // Distinct colors for pie slices
    case "heatmap":
      return COLD_TO_HOT; // Sequential scale
    case "treemap":
      return EXTENDED_PALETTE; // Many colors
    case "bar":
    case "line":
    default:
      return PRIMARY_PALETTE; // Default
  }
};

// ============================================================================
// GRADIENT PRESETS
// ============================================================================

export const GRADIENTS = {
  blueGradient: generateGradient("blueGradient", PRIMARY_PALETTE[1], PRIMARY_PALETTE[2]),
  purpleGradient: generateGradient("purpleGradient", PRIMARY_PALETTE[2], PRIMARY_PALETTE[3]),
  warmGradient: generateGradient("warmGradient", PRIMARY_PALETTE[6], PRIMARY_PALETTE[7]),
  coolToWarm: generateGradient("coolToWarm", PRIMARY_PALETTE[0], PRIMARY_PALETTE[7]),
};
