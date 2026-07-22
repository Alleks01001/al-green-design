import { PLANT_CATALOG } from "@/data/plants/catalog";
import type { CadEntity, PlantDefinition, PlantingSettings } from "@/types/domain";

export type PlantAssessment = { entityId:string; name:string; suitability:number; issues:string[]; definition?:PlantDefinition };
export type SpacingConflict = { a:string; b:string; distance:number; required:number };
export type PlantingAnalysis = { assessments:PlantAssessment[]; conflicts:SpacingConflict[]; speciesCount:number; nativeShare:number; pollinatorScore:number; annualWaterIndex:number; bloomCoverage:number[] };

export function definitionForEntity(entity: CadEntity) {
  const definitionId = String(entity.metadata?.plantDefinitionId ?? "");
  const botanical = String(entity.metadata?.botanicalName ?? "");
  return PLANT_CATALOG.find(item => item.id === definitionId || item.botanicalName === botanical || item.commonName === entity.name);
}

export function growthFactor(definition: PlantDefinition | undefined, years: number) {
  if (!definition) return Math.min(1, .35 + years * .08);
  const maturity = definition.growthRate === "fast" ? 5 : definition.growthRate === "medium" ? 8 : 12;
  return Math.max(.18, Math.min(1, .18 + years / maturity * .82));
}

export function analyzePlanting(entities: CadEntity[], settings: PlantingSettings): PlantingAnalysis {
  const plants = entities.filter(entity => entity.kind === "plant" && entity.visible);
  const assessments = plants.map(entity => {
    const definition = definitionForEntity(entity);
    if (!definition) return { entityId:entity.id, name:entity.name, suitability:45, issues:["Pflanze ist nicht mit dem Katalog verknüpft."] };
    let score = 100;
    const issues:string[] = [];
    if (definition.light !== settings.siteLight) { score -= 22; issues.push(`Licht: bevorzugt ${definition.light}.`); }
    if (!definition.soil.includes("any") && !definition.soil.includes(settings.soil)) { score -= 18; issues.push(`Boden ${settings.soil} ist nur bedingt geeignet.`); }
    if (!definition.moisture.includes(settings.moisture)) { score -= 18; issues.push(`Feuchte: bevorzugt ${definition.moisture.join("/")}.`); }
    if (settings.hardinessZone < definition.hardinessZoneMin || settings.hardinessZone > definition.hardinessZoneMax) { score -= 35; issues.push("Winterhärtezone liegt außerhalb der Empfehlung."); }
    return { entityId:entity.id, name:entity.name, suitability:Math.max(0,score), issues, definition };
  });
  const conflicts:SpacingConflict[] = [];
  for (let i=0;i<plants.length;i+=1) for (let j=i+1;j<plants.length;j+=1) {
    const a=plants[i], b=plants[j];
    const da=definitionForEntity(a), db=definitionForEntity(b);
    const required=Math.max(.35, ((da?.spacing ?? a.width*.65)+(db?.spacing ?? b.width*.65))/2);
    const distance=Math.hypot(a.position.x-b.position.x,a.position.y-b.position.y);
    if (distance < required*.82) conflicts.push({a:a.name,b:b.name,distance,required});
  }
  const defs = assessments.flatMap(item => item.definition ? [item.definition] : []);
  const speciesCount = new Set(defs.map(item=>item.botanicalName)).size;
  const nativeShare = defs.length ? defs.filter(item=>item.native).length/defs.length*100 : 0;
  const pollinatorScore = defs.length ? defs.reduce((sum,item)=>sum+item.pollinatorValue,0)/defs.length : 0;
  const annualWaterIndex = defs.reduce((sum,item)=>sum+item.waterNeed,0);
  const bloomCoverage = Array.from({length:12},(_,month)=>defs.filter(item=>item.bloomMonths.includes(month+1)).length);
  return { assessments, conflicts, speciesCount, nativeShare, pollinatorScore, annualWaterIndex, bloomCoverage };
}
