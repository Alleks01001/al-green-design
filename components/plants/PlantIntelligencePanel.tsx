"use client";

import { analyzePlanting } from "@/engines/plants/plantIntelligence";
import { useProjectStore } from "@/stores/projectStore";
import type { LightRequirement, SiteMoisture, SoilType } from "@/types/domain";

const monthNames=["J","F","M","A","M","J","J","A","S","O","N","D"];
export function PlantIntelligencePanel(){
  const store=useProjectStore();
  const { entities, plantingSettings, updatePlantingSettings, setSelectedIds }=store;
  const analysis=analyzePlanting(entities,plantingSettings);
  const average=analysis.assessments.length?Math.round(analysis.assessments.reduce((s,a)=>s+a.suitability,0)/analysis.assessments.length):0;
  return <section className="plantIntelPanel">
    <div className="panelHeading"><div><span className="eyebrow">Studio 2.4</span><h3>Plant Intelligence</h3></div><span>{average}%</span></div>
    <div className="plantSiteGrid">
      <label>Licht<select value={plantingSettings.siteLight} onChange={e=>updatePlantingSettings({siteLight:e.target.value as LightRequirement})}><option value="sun">Sonne</option><option value="partial-shade">Halbschatten</option><option value="shade">Schatten</option></select></label>
      <label>Boden<select value={plantingSettings.soil} onChange={e=>updatePlantingSettings({soil:e.target.value as SoilType})}><option value="any">Universal</option><option value="loam">Lehm</option><option value="sand">Sand</option><option value="clay">Ton</option><option value="acidic">Sauer</option><option value="calcareous">Kalkreich</option></select></label>
      <label>Feuchte<select value={plantingSettings.moisture} onChange={e=>updatePlantingSettings({moisture:e.target.value as SiteMoisture})}><option value="dry">Trocken</option><option value="fresh">Frisch</option><option value="moist">Feucht</option></select></label>
      <label>Winterhärte<input type="number" min="1" max="11" value={plantingSettings.hardinessZone} onChange={e=>updatePlantingSettings({hardinessZone:Number(e.target.value)})}/></label>
    </div>
    <label className="growthSlider">Darstellung nach <strong>{plantingSettings.growthYears} Jahren</strong><input type="range" min="1" max="20" value={plantingSettings.growthYears} onChange={e=>updatePlantingSettings({growthYears:Number(e.target.value)})}/></label>
    <div className="plantMetricGrid"><div><span>Arten</span><strong>{analysis.speciesCount}</strong></div><div><span>Heimisch</span><strong>{analysis.nativeShare.toFixed(0)}%</strong></div><div><span>Bestäuber</span><strong>{analysis.pollinatorScore.toFixed(1)}/5</strong></div><div><span>Wasserindex</span><strong>{analysis.annualWaterIndex}</strong></div></div>
    <div className="bloomCalendar">{monthNames.map((m,i)=><span key={i} className={analysis.bloomCoverage[i]>0?"active":""} title={`${analysis.bloomCoverage[i]} blühende Arten`}>{m}</span>)}</div>
    {analysis.conflicts.length>0 && <div className="plantWarnings"><strong>{analysis.conflicts.length} Abstandskonflikt(e)</strong>{analysis.conflicts.slice(0,3).map((c,i)=><p key={i}>{c.a} / {c.b}: {c.distance.toFixed(1)} m statt {c.required.toFixed(1)} m</p>)}</div>}
    <div className="plantAssessments">{analysis.assessments.slice(0,6).map(item=><button type="button" key={item.entityId} onClick={()=>setSelectedIds([item.entityId])}><span>{item.name}</span><strong className={item.suitability>=75?"good":item.suitability>=50?"medium":"poor"}>{item.suitability}%</strong><small>{item.issues[0]??"Standort sehr gut geeignet"}</small></button>)}</div>
  </section>;
}
