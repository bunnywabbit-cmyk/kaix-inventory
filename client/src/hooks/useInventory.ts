import { useApiResource } from "./useApiResource";
import type {
  Category,
  DtfPrintOrder,
  FinishedGood,
  PhysicalScreen,
  PrintRun,
  RawMaterial,
  ShirtDesign,
} from "../types/api";

export const useCategories = () => useApiResource<Category[]>("/categories");
export const useRawMaterials = () => useApiResource<RawMaterial[]>("/raw-materials");
export const useScreens = () => useApiResource<PhysicalScreen[]>("/screens");
export const useFinishedGoods = () => useApiResource<FinishedGood[]>("/finished-goods");
export const useShirtDesigns = () => useApiResource<ShirtDesign[]>("/shirt-designs");
export const usePrintRuns = () => useApiResource<PrintRun[]>("/print-runs");
export const useDtfPrintOrders = () => useApiResource<DtfPrintOrder[]>("/dtf-print-orders");
