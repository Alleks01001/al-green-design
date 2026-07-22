import type { MaterialDefinition } from "@/types/domain";

export const MATERIAL_CATALOG: MaterialDefinition[] = [
  { id: "mat-natural-stone", name: "Naturstein warm", category: "stone", color: "#a88c6a", roughness: 0.92, metalness: 0, pricePerSquareMeter: 115 },
  { id: "mat-granite", name: "Granit grau", category: "stone", color: "#777a7d", roughness: 0.9, metalness: 0, pricePerSquareMeter: 138 },
  { id: "mat-gravel", name: "Kies hell", category: "paving", color: "#c6b99f", roughness: 1, metalness: 0, pricePerSquareMeter: 46 },
  { id: "mat-paving", name: "Betonpflaster", category: "paving", color: "#9d9991", roughness: 0.95, metalness: 0, pricePerSquareMeter: 72 },
  { id: "mat-thermowood", name: "Thermoholz", category: "wood", color: "#6f3f2d", roughness: 0.8, metalness: 0, pricePerSquareMeter: 145 },
  { id: "mat-concrete", name: "Sichtbeton", category: "concrete", color: "#a7a29a", roughness: 0.95, metalness: 0, pricePerSquareMeter: 88 },
  { id: "mat-burgundy-metal", name: "Burgunder Metall", category: "metal", color: "#7f1d2d", roughness: 0.35, metalness: 0.8, pricePerSquareMeter: 190 },
  { id: "mat-anthracite-metal", name: "Metall Anthrazit", category: "metal", color: "#3f4548", roughness: 0.38, metalness: 0.82, pricePerSquareMeter: 175 },
  { id: "mat-corten", name: "Cortenstahl", category: "metal", color: "#9b4f2d", roughness: 0.62, metalness: 0.72, pricePerSquareMeter: 240 },
  { id: "mat-glass", name: "Architekturglas", category: "glass", color: "#a9d7e5", roughness: 0.08, metalness: 0, pricePerSquareMeter: 310 },
  { id: "mat-fabric", name: "Outdoor-Textil", category: "fabric", color: "#e7dfcf", roughness: 0.9, metalness: 0, pricePerSquareMeter: 85 },
  { id: "mat-water", name: "Wasser", category: "water", color: "#4ba7c7", roughness: 0.12, metalness: 0, pricePerSquareMeter: 0 },
  { id: "mat-lawn", name: "Rasen", category: "soil", color: "#719a68", roughness: 1, metalness: 0, pricePerSquareMeter: 18 },
  { id: "mat-soil", name: "Pflanzerde", category: "soil", color: "#6d503d", roughness: 1, metalness: 0, pricePerSquareMeter: 22 }
];
