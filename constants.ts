
export const STANDARD_HEIGHTS_MM = [3000, 2500, 2000, 1750, 1500, 1250, 1000, 750, 500];
export const BASEJACK_TYPES_MM = [600, 800]; // Adjustable jacks
export const JACK_PIPE_COMPATIBILITY: Record<number, number[]> = {
  600: [0, 200, 400], // Example pipe lengths
  800: [0, 200, 400, 600]
};

export const DECK_THICKNESS = 0.05; // 50mm
export const SOLE_BOARD_THICKNESS = 0.038; // 38mm

export const STANDARD_DESCRIPTIONS: Record<number, string> = {
  3000: "3000mm standard (6 x v pressing clusters starting 250mm from the bottom spaced 500mm apart)",
  2500: "2500mm standard (5 x v pressing clusters starting 250mm from the bottom spaced 500mm apart)",
  2000: "2000mm standard (4 x v pressing clusters starting 250mm from the bottom spaced 500mm apart)",
  1750: "1750mm standard (1 x v pressing cluster 250mm from the bottom)",
  1500: "1500mm standard (1 x v pressing cluster 250mm from the bottom)",
  1250: "1250mm standard (1 x v pressing cluster 250mm from the bottom)",
  1000: "1000mm standard (1 x v pressing cluster 250mm from the bottom)",
  750:  "750mm standard (1 x v pressing cluster 250mm from the bottom)",
  500:  "500mm standard (1 x v pressing cluster 250mm from the bottom)"
};

export const COMPONENT_COLORS = {
  STANDARDS: {
    3: "#3b82f6",     // 3m - Blue
    2.5: "#8b5cf6",   // 2.5m - Purple
    2: "#22c55e",     // 2m - Green
    1.75: "#14b8a6",  // 1.75m - Teal
    1.5: "#eab308",   // 1.5m - Yellow
    1.25: "#f59e0b",  // 1.25m - Amber
    1: "#f97316",     // 1m - Orange
    0.75: "#f43f5e",  // 0.75m - Rose
    0.5: "#ef4444"    // 0.5m - Red
  },
  INFRASTRUCTURE: {
    PIPE: "#94a3b8"
  }
};
