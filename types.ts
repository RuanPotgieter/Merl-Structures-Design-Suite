
export interface Coordinate {
  x: number; 
  y: number; 
}

export interface Rostrum {
  id: string;
  gridRow: number;
  gridCol: number;
  center: Coordinate;
  width: number;
  depth: number;
  rotationY: number;
  isRamp?: boolean;
  slope?: number;
  side?: 'top' | 'bottom' | 'left' | 'right';
  startElevation?: number;
  endElevation?: number;
  rampMaxRows?: number;
}

export interface LandingPadConfig {
  id: string;
  offset: number; // Offset from the start of the ramp
  length: number; // Length of the landing pad
}

export interface RampConfig {
  id: string;
  deckId: string;
  side: 'top' | 'bottom' | 'left' | 'right';
  corner: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
  offset: number | ''; 
  width: number | '';
  length: number | '';
  landingPads?: LandingPadConfig[];
}

export interface LegAssembly {
  basejack: number; // mm
  pipe: number;    // mm
  standards: number[]; // mm, longest first
  totalHeight: number; // m
}

export interface Foot {
  id: string;
  position: Coordinate;
  groundHeight: number;
  targetElevation: number;
  assembly?: LegAssembly;
  error?: string;
}

export interface HandrailConfig {
  id: string;
  deckId: string;
  side: 'top' | 'bottom' | 'left' | 'right';
  corner: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
  offset: number | '';
  length: number | '';
  type?: 'standard' | 'heavy-duty' | 'decorative';
}

export interface Project {
  id: string;
  siteName: string;
  clientName: string;
  decks: DeckConfig[];
  ramps: RampConfig[];
  handrails: HandrailConfig[];
  createdAt: number;
  updatedAt: number;
}

export interface DeckConfig {
  id: string;
  type?: 'standard' | 'raking';
  tiers?: number | '';
  handrailType?: 'standard' | 'none';
  width: number | '';
  depth: number | '';
  originX: number | '';
  originZ: number | '';
  orientation: number | '';
  terrain: TerrainConfig;
}

export interface TerrainConfig {
  deckHeight: number | '';
  groundOffsets: {
    origin: number | '';
    widthEnd: number | '';
    depthEnd: number | '';
    diagonal: number | '';
  };
}

export interface Ledger {
  id: string;
  position: { x: number, y: number, z: number };
  rotation: { x: number, y: number, z: number };
  length: number;
  color: string;
  type: 'blueBlue' | 'blueBlack' | 'blackBlack';
}

export interface Brace {
  id: string;
  startPos: { x: number, y: number, z: number };
  endPos: { x: number, y: number, z: number };
  color: string;
}

export interface Upright {
  id: string;
  x: number;
  y: number;
  zDeck: number;
  type: 'DOUBLE' | 'LEFT' | 'RIGHT' | 'OUTSIDE_CORNER' | 'INSIDE_CORNER';
  rotation: number;
}

export interface Handrail {
  id: string;
  startPos: { x: number, y: number, z: number };
  endPos: { x: number, y: number, z: number };
  length: number;
}

export interface DeckCalculationResult {
  rostrums: Rostrum[];
  feet: Foot[];
  calculatedFeetCount: number;
  fullRostrumsCount: number;
  halfRostrumsCount: number;
  ledgerCounts: {
    blueBlue: number;
    blueBlack: number;
    blackBlack: number;
  };
  ledgers: Ledger[];
  braces: Brace[];
  uprights: Upright[];
  handrails: Handrail[];
  totalArea: number;
  dimensions: {
    width: number;
    depth: number;
  };
  terrain: TerrainConfig;
  status: 'SOLVED' | 'ERROR_NO_VALID_BUILD';
  errors: string[];
}
