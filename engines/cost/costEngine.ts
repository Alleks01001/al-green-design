import type { BimProperties } from "@/types/domain";

export type BimLineCost = {
  entityId: string;
  effectiveQuantity: number;
  materialCost: number;
  laborCost: number;
  total: number;
  carbonKg: number;
};

export function calculateLineCost(item: BimProperties): BimLineCost {
  const effectiveQuantity = Math.max(0, item.quantity) * (1 + Math.max(0, item.wastePercent) / 100);
  const materialCost = effectiveQuantity * Math.max(0, item.unitPrice);
  const laborCost = effectiveQuantity * Math.max(0, item.laborUnitPrice);
  return {
    entityId: item.entityId,
    effectiveQuantity,
    materialCost,
    laborCost,
    total: materialCost + laborCost,
    carbonKg: effectiveQuantity * Math.max(0, item.carbonKgPerUnit)
  };
}

export function calculateProjectCost(items: BimProperties[], vatPercent = 20) {
  const lines = items.map(calculateLineCost);
  const material = lines.reduce((sum, line) => sum + line.materialCost, 0);
  const labor = lines.reduce((sum, line) => sum + line.laborCost, 0);
  const subtotal = material + labor;
  const vat = subtotal * Math.max(0, vatPercent) / 100;
  return {
    lines,
    material,
    labor,
    subtotal,
    vat,
    total: subtotal + vat,
    carbonKg: lines.reduce((sum, line) => sum + line.carbonKg, 0)
  };
}
