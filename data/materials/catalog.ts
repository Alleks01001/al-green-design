
import type { MaterialDefinition } from "@/types/domain";

export const MATERIAL_CATALOG: MaterialDefinition[] = [
  { id: "mat-natural-stone", name: "Naturstein warm", category: "stone", color: "#a88c6a", roughness: 0.92, metalness: 0, pricePerSquareMeter: 115 },
  { id: "mat-thermowood", name: "Thermoholz", category: "wood", color: "#6f3f2d", roughness: 0.8, metalness: 0, pricePerSquareMeter: 145 },
  { id: "mat-concrete", name: "Sichtbeton", category: "concrete", color: "#a7a29a", roughness: 0.95, metalness: 0, pricePerSquareMeter: 88 },
  { id: "mat-burgundy-metal", name: "Burgunder Metall", category: "metal", color: "#7f1d2d", roughness: 0.35, metalness: 0.8, pricePerSquareMeter: 190 }
];
