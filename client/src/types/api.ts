export type PrintType = "SILKSCREEN" | "DTF";

export type ScreenStatus =
  | "CLEAN_RECLAIMED"
  | "COATED_EMULSION"
  | "DEVELOPED"
  | "EXPOSED_READY"
  | "ON_PRESS"
  | "NEEDS_RECLAIM";

export interface Category {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { rawMaterials: number };
}

export interface RawMaterial {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  reorderLevel: number;
  pricePerUnit: number | null;
  courierFee: number | null;
  brand: string | null;
  styleNumber: string | null;
  color: string | null;
  size: string | null;
  unit: string | null;
  imageUrl: string | null;
  categoryId: string;
  category: Category;
  createdAt: string;
  updatedAt: string;
}

export interface DesignColorway {
  id: string;
  colorwayName: string;
  imageUrl: string;
  // Sheet size for DTF designs — unique per colorway, the same way a
  // silkscreen colorway links to its own screen.
  dtfPrintSize: DtfPrintSize | null;
  // How many physical screens this colorway needs (silkscreen only).
  screensNeeded: number;
  // On-hand count of already-printed DTF transfer sheets, ready to press (DTF only).
  dtfStockQuantity: number;
  shirtDesignId: string;
}

// A colorway can need more than one screen (e.g. halftone separations), and a screen
// can cover multiple colorways (e.g. a one-color logo on several shirt colors) — the
// two are linked many-to-many rather than through the design directly.
export interface DesignColorwayWithScreens extends DesignColorway {
  screens: Omit<PhysicalScreen, "colorways">[];
}

export interface ScreenColorway extends DesignColorway {
  shirtDesign: Omit<ShirtDesign, "colorways">;
}

export interface ShirtDesign {
  id: string;
  designName: string;
  printType: PrintType;
  mainProductImage: string;
  availableFits: string[];
  price: number | null;
  // Soft-delete flag — unlisted designs keep all their history (colorways,
  // screens, finished goods, sales) but are hidden from pickers for new
  // production.
  active: boolean;
  colorways: DesignColorwayWithScreens[];
  createdAt: string;
  updatedAt: string;
}

export interface PhysicalScreen {
  id: string;
  screenNumber: string;
  meshCount: number;
  frameType: string;
  frameSize: string | null;
  status: ScreenStatus;
  colorways: ScreenColorway[];
  createdAt: string;
  updatedAt: string;
}

export interface FinishedGood {
  id: string;
  garmentStyle: string;
  color: string;
  size: string;
  quantityOnHand: number;
  unitPrice: number | null;
  designId: string;
  design: Omit<ShirtDesign, "colorways">;
  colorwayId: string | null;
  colorway: DesignColorway | null;
  createdAt: string;
  updatedAt: string;
}

export type PrintRunStatus = "PLANNED" | "FINISHED";

export interface PrintRunSize {
  id: string;
  size: string;
  quantity: number;
  printRunItemId: string;
}

export interface PrintRunItem {
  id: string;
  garmentStyle: string;
  color: string;
  done: boolean;
  printRunId: string;
  designId: string;
  design: Omit<ShirtDesign, "colorways">;
  colorwayId: string | null;
  colorway: DesignColorway | null;
  sizes: PrintRunSize[];
  createdAt: string;
  updatedAt: string;
}

export interface PrintRun {
  id: string;
  status: PrintRunStatus;
  finishedAt: string | null;
  items: PrintRunItem[];
  createdAt: string;
  updatedAt: string;
}

export type DtfPrintSize = "A4" | "A3" | "A3_PLUS";

export interface DtfPrintOrder {
  id: string;
  colorwayId: string;
  colorway: DesignColorway & { shirtDesign: Omit<ShirtDesign, "colorways"> };
  quantity: number;
  ordered: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Sale {
  id: string;
  finishedGoodId: string | null;
  designId: string | null;
  designName: string;
  garmentStyle: string;
  color: string;
  size: string;
  quantity: number;
  unitPrice: number | null;
  totalPrice: number | null;
  createdAt: string;
}

export type ActivityAction = "CREATE" | "UPDATE" | "DELETE" | "STOCK_ADJUST";

export interface ActivityLogEntry {
  id: string;
  action: ActivityAction;
  entityType: string;
  entityId: string | null;
  message: string;
  userId: string | null;
  user: { email: string } | null;
  createdAt: string;
}

export interface ActivityLogPage {
  entries: ActivityLogEntry[];
  nextCursor: string | null;
}
