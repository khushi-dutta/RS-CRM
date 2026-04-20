// =============================================================================
// Solar Design Studio — Type Definitions
// =============================================================================

// ─── Geometry ────────────────────────────────────────────────────────────────

export interface Point2D { x: number; y: number; }

// ─── Tool Types ──────────────────────────────────────────────────────────────

export type ToolType =
  | 'select'
  | 'model_flat' | 'model_pitch' | 'model_draw'
  | 'obstruction_cylinder' | 'obstruction_polygon' | 'obstruction_rectangle'
  | 'obstruction_safety_line' | 'obstruction_property_line'
  | 'obstruction_handrail' | 'obstruction_walkway' | 'obstruction_tree'
  | 'module_add' | 'module_delete' | 'module_toggle'
  | 'component_inverter'
  | 'dimension'
  | 'lasso'
  | 'text_block'
  | 'irradiance_map' | 'solar_access'
  | 'add_table';

export type ViewMode = '2d' | '3d' | 'sld';

export type TemplateType = 'tilted_mount' | 'roof_mount' | 'ew_tracking';
export type StructureType = 'default' | 'pergola' | 'tata_power' | 'relay_rack' | 'textile_2500';
export type Orientation = 'portrait' | 'landscape';
export type TreeModelType = 'spruce' | 'pine' | 'apple' | 'oak' | 'palm' | 'conifer';

// ─── Roof ────────────────────────────────────────────────────────────────────

export interface DesignRoof {
  id: string;
  name: string;
  vertices: Point2D[];
  height: number;          // base height (m)
  parapetHeight: number;   // m
  tilt: number;            // degrees
  azimuth: number;         // degrees
  setbacks: { n: number; e: number; s: number; w: number };
  flashType: boolean;
  baseHeight: number;
  templateType: TemplateType;
  structureType: StructureType;
  color: string;
}

// ─── Obstructions ────────────────────────────────────────────────────────────

export type ObstructionType =
  | 'cylinder' | 'polygon' | 'rectangle'
  | 'safety_line' | 'property_line'
  | 'handrail' | 'walkway' | 'tree';

export interface DesignObstruction {
  id: string;
  type: ObstructionType;
  roofId: string;
  vertices: Point2D[];      // polygon/rectangle/lines vertices
  center?: Point2D;         // cylinder center
  radius?: number;          // cylinder radius
  height: number;           // m
  width?: number;           // walkway width
  // Tree
  trunkHeight?: number;
  crownHeight?: number;
  crownRadius?: number;
  treeModel?: TreeModelType;
}

// ─── Modules / Sub-Arrays ────────────────────────────────────────────────────

export interface DesignModule {
  id: string;
  subArrayId: string;
  x: number;
  y: number;
  row: number;
  col: number;
  solarAccess?: number;     // 0–100 % (set after solar access run)
}

export interface ModuleSpec {
  id: string;
  brand: string;
  model: string;
  wattage: number;
  lengthMm: number;
  widthMm: number;
  voc: number;
  isc: number;
  vmpp: number;
  impp: number;
  efficiency: number;
  tempCoeffVoc: number;
  weightKg: number;
}

export interface DesignSubArray {
  id: string;
  roofId: string;
  moduleSpecId: string;
  modules: DesignModule[];
  tilt: number;
  azimuth: number;
  mountHeight: number;
  rowSpacing: number;       // m
  rowSpacingMode: 'auto' | 'manual';
  orientation: Orientation;
  tableRows: number;
  tableCols: number;
  vSpacing: number;         // vertical module spacing (m)
  hSpacing: number;         // horizontal module spacing (m)
  tableSpacing: number;     // gap between tables (m)
  templateType: TemplateType;
  structureType: StructureType;
}

// ─── Inverters & Strings ─────────────────────────────────────────────────────

export interface InverterSpec {
  id: string;
  brand: string;
  model: string;
  capacityKw: number;
  maxInputVoltage: number;
  mpptCount: number;
  minString: number;
  maxString: number;
  efficiency: number;
  phase: string;
}

export interface DesignString {
  id: string;
  inverterPlacementId: string;
  mpptIndex: number;
  moduleIds: string[];
  wireSize?: number; // mm²
}

export interface DesignInverter {
  id: string;
  inverterSpecId: string;
  x: number;
  y: number;
  quantity: number;
  strings: DesignString[];
}

// ─── Dimension Lines ─────────────────────────────────────────────────────────

export interface DesignDimension {
  id: string;
  p1: Point2D;
  p2: Point2D;
}

// ─── Text Blocks ─────────────────────────────────────────────────────────────

export interface DesignTextBlock {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
}

// ─── Layer Settings ──────────────────────────────────────────────────────────

export interface LayerVisibility {
  arc: boolean;
  stringing: boolean;
  hCenter: boolean;
  setbackLines: boolean;
  obstructionLabels: boolean;
}

// ─── Design Defaults ─────────────────────────────────────────────────────────

export interface DesignDefaults {
  id: string;
  name: string;
  isActive: boolean;
  // Sub-array
  moduleSpecId: string;
  templateType: TemplateType;
  structureType: StructureType;
  tilt: number;
  azimuth: number;
  mountHeight: number;
  rowSpacingMode: 'auto' | 'manual';
  rowSpacing: number;
  vSpacing: number;
  hSpacing: number;
  tableRows: number;
  tableCols: number;
  orientation: Orientation;
  // Obstruction
  cylinderDefaultHeight: number;
  handrailDefaultHeight: number;
  setbackDefault: number;
  // Losses
  degradationRate: number;     // % per year
  systemLosses: number;        // %
  monofacialMode: boolean;
}

// ─── Solar Access ────────────────────────────────────────────────────────────

export interface SolarAccessResult {
  [moduleId: string]: number;  // 0–100 %
}

// ─── Full Design State ──────────────────────────────────────────────────────

export interface DesignData {
  roofs: DesignRoof[];
  obstructions: DesignObstruction[];
  subArrays: DesignSubArray[];
  inverters: DesignInverter[];
  dimensions: DesignDimension[];
  textBlocks: DesignTextBlock[];
  solarAccess: SolarAccessResult;
}

// ─── Clipboard ───────────────────────────────────────────────────────────────

export interface ClipboardItem {
  type: 'module' | 'obstruction' | 'textBlock' | 'subArray';
  data: any;
  originalPosition: Point2D;
}
