'use client';

import { useMemo, useRef, useState } from 'react';

type Tab = 'cad'|'gis'|'bim'|'plants'|'terrain'|'water'|'drainage'|'costs'|'analysis'|'project'|'exports';
type Tool = 'select'|'line'|'polyline'|'rect'|'circle'|'plant'|'terrainPoint'|'irrigation'|'drainage'|'light';
type Point = {x:number;y:number};

type CadObject = {
  id:number;
  kind:'line'|'polyline'|'rect'|'circle'|'plant'|'terrainPoint'|'irrigation'|'drainage'|'light';
  layer:string;
  name:string;
  points:Point[];
  x:number;
  y:number;
  width:number;
  height:number;
  radius:number;
  color:string;
  transparency:number;
  lineType:string;
  hatch:string;
  elevation:number;
  attributes:Record<string,string|number|boolean>;
};

type Plant = {
  id:number;
  german:string;
  botanical:string;
  family:string;
  type:string;
  height:number;
  width:number;
  sun:string;
  soil:string;
  waterNeed:number;
  hardy:string;
  bee:boolean;
  bird:boolean;
  co2:number;
  biodiversity:number;
  price:number;
  supplier:string;
};

type Material = {
  id:number;
  name:string;
  category:string;
  unit:string;
  price:number;
  weight:number;
  manufacturer:string;
  article:string;
};

type CostItem = {
  id:number;
  title:string;
  category:string;
  quantity:number;
  unit:string;
  unitPrice:number;
  laborHours:number;
  machineHours:number;
};

type Task = {
  id:number;
  title:string;
  status:string;
  owner:string;
  due:string;
  note:string;
};

type IrrigationZone = {
  id:number;
  name:string;
  plantType:string;
  area:number;
  emitters:number;
  flowPerEmitter:number;
  pipeLength:number;
  pressureBar:number;
};

type DrainageSystem = {
  id:number;
  name:string;
  type:string;
  catchmentArea:number;
  rainfallMm:number;
  infiltrationRate:number;
  storageVolume:number;
};

const SCALE=45;

const plantDbSeed:Plant[]=[
  {id:1,german:'Felsenbirne',botanical:'Amelanchier lamarckii',family:'Rosaceae',type:'Baum/Strauch',height:5,width:4,sun:'Sonne/Halbschatten',soil:'normal/frisch',waterNeed:2,hardy:'sehr winterhart',bee:true,bird:true,co2:42,biodiversity:88,price:68,supplier:'Baumschule Standard'},
  {id:2,german:'Lavendel',botanical:'Lavandula angustifolia',family:'Lamiaceae',type:'Staude',height:.6,width:.5,sun:'Sonne',soil:'trocken/durchlässig',waterNeed:1,hardy:'winterhart',bee:true,bird:false,co2:2,biodiversity:80,price:4.8,supplier:'Staudengärtnerei'},
  {id:3,german:'Hainbuche',botanical:'Carpinus betulus',family:'Betulaceae',type:'Hecke/Baum',height:12,width:7,sun:'Sonne/Halbschatten/Schatten',soil:'normal',waterNeed:2,hardy:'sehr winterhart',bee:false,bird:true,co2:95,biodiversity:82,price:18,supplier:'Heckenpflanzen'},
  {id:4,german:'Ziergras',botanical:'Calamagrostis x acutiflora',family:'Poaceae',type:'Gras',height:1.3,width:.6,sun:'Sonne',soil:'normal/trocken',waterNeed:1,hardy:'winterhart',bee:false,bird:true,co2:5,biodiversity:55,price:7.5,supplier:'Staudengärtnerei'},
  {id:5,german:'Japanischer Ahorn',botanical:'Acer palmatum',family:'Sapindaceae',type:'Baum',height:4,width:4,sun:'Halbschatten',soil:'frisch/humos',waterNeed:3,hardy:'winterhart',bee:false,bird:false,co2:31,biodiversity:45,price:120,supplier:'Solitärpflanzen'}
];

const materialSeed:Material[]=[
  {id:1,name:'Betonpflaster 8 cm',category:'Belag',unit:'m²',price:38,weight:180,manufacturer:'Standard',article:'PFL-8'},
  {id:2,name:'Natursteinplatten',category:'Belag',unit:'m²',price:86,weight:95,manufacturer:'Steinwerk',article:'NST-60'},
  {id:3,name:'Rollrasen',category:'Vegetation',unit:'m²',price:9.5,weight:18,manufacturer:'Regional',article:'RAS-01'},
  {id:4,name:'Tropfschlauch 16 mm',category:'Bewässerung',unit:'m',price:1.9,weight:.12,manufacturer:'Irrigate',article:'DRIP-16'},
  {id:5,name:'Rigole / Sickerschacht',category:'Entwässerung',unit:'Stk',price:420,weight:80,manufacturer:'DrainTec',article:'RIG-01'}
];

function distance(a:Point,b:Point){return Math.hypot(a.x-b.x,a.y-b.y)}
function polygonArea(points:Point[]){if(points.length<3)return 0;let s=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];s+=a.x*b.y-b.x*a.y}return Math.abs(s/2)}
function download(name:string,content:string,type:string){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url)}
function csv(rows:any[][]){return rows.map(r=>r.map(c=>`"${String(c??'').replaceAll('"','""')}"`).join(';')).join('\n')}
function objectArea(o:CadObject){if(o.kind==='rect')return Math.abs(o.width*o.height);if(o.kind==='circle')return Math.PI*o.radius*o.radius;if(o.kind==='polyline')return polygonArea(o.points);return 0}
function objectLength(o:CadObject){if(o.kind==='line'&&o.points.length>=2)return distance(o.points[0],o.points[1]);if(o.kind==='polyline')return o.points.slice(1).reduce((s,p,i)=>s+distance(o.points[i],p),0);return 0}

export default function LandscapePlatform(){
  const svgRef=useRef<SVGSVGElement|null>(null);
  const [tab,setTab]=useState<Tab>('cad');
  const [tool,setTool]=useState<Tool>('rect');
  const [layer,setLayer]=useState('Entwurf');
  const [selected,setSelected]=useState<number|null>(null);
  const [status,setStatus]=useState('Bereit: V0.11 Landschaftsarchitektur-Plattform.');
  const [cam,setCam]=useState({x:-12,y:-8,width:28,height:18});
  const [objects,setObjects]=useState<CadObject[]>([
    {id:101,kind:'rect',layer:'Bestand',name:'Grundstück / Bearbeitungsfläche',points:[],x:0,y:0,width:12,height:8,radius:0,color:'#dcfce7',transparency:.35,lineType:'durchgezogen',hatch:'Rasen',elevation:0,attributes:{bimClass:'Site',phase:'Bestand'}},
    {id:102,kind:'rect',layer:'Belag',name:'Terrasse Naturstein',points:[],x:-2,y:1,width:4,height:2.2,radius:0,color:'#a8a29e',transparency:.15,lineType:'durchgezogen',hatch:'Naturstein',elevation:.05,attributes:{material:'Natursteinplatten',costCode:'BEL-01'}},
    {id:103,kind:'circle',layer:'Pflanzen',name:'Baum Felsenbirne',points:[],x:3,y:-1.5,width:0,height:0,radius:.8,color:'#16a34a',transparency:.1,lineType:'Symbol',hatch:'Krone',elevation:0,attributes:{plantId:1,age:0,spacing:3}}
  ]);
  const [draft,setDraft]=useState<Point[]>([]);
  const [plants,setPlants]=useState<Plant[]>(plantDbSeed);
  const [materials,setMaterials]=useState<Material[]>(materialSeed);
  const [costItems,setCostItems]=useState<CostItem[]>([
    {id:1,title:'Natursteinplatten liefern und verlegen',category:'Belag',quantity:8.8,unit:'m²',unitPrice:118,laborHours:6,machineHours:1},
    {id:2,title:'Felsenbirne liefern und pflanzen',category:'Pflanzen',quantity:1,unit:'Stk',unitPrice:145,laborHours:1.5,machineHours:0}
  ]);
  const [irrigation,setIrrigation]=useState<IrrigationZone[]>([
    {id:1,name:'Zone Stauden trocken',plantType:'Stauden/Gräser',area:18,emitters:36,flowPerEmitter:2,pipeLength:42,pressureBar:2.2}
  ]);
  const [drainage,setDrainage]=useState<DrainageSystem[]>([
    {id:1,name:'Terrassenentwässerung',type:'Rigole',catchmentArea:32,rainfallMm:35,infiltrationRate:12,storageVolume:1.2}
  ]);
  const [tasks,setTasks]=useState<Task[]>([
    {id:1,title:'Bestandsplan importieren',status:'offen',owner:'Planung',due:'',note:'GeoJSON/PDF/DXF vorbereiten'},
    {id:2,title:'Pflanzenliste freigeben',status:'in Arbeit',owner:'Kunde',due:'',note:'Pflegeleicht + trockenheitsresistent'}
  ]);
  const [plantFilter,setPlantFilter]=useState({sun:'Sonne',soil:'trocken',water:2,goal:'pflegeleicht mediterran biodivers'});
  const [geoJsonInfo,setGeoJsonInfo]=useState('Noch keine GIS-Datei importiert.');
  const [projectInfo,setProjectInfo]=useState({name:'Neues Landschaftsprojekt',client:'',budget:30000,climate:'Oberösterreich',soil:'normal/trocken',sunHours:6});

  const selectedObject=objects.find(o=>o.id===selected)||null;

  const totals=useMemo(()=>{
    const area=objects.reduce((s,o)=>s+objectArea(o),0);
    const line=objects.reduce((s,o)=>s+objectLength(o),0);
    const plantCount=objects.filter(o=>o.kind==='plant'||o.attributes.plantId).length;
    const hardscape=objects.filter(o=>['Belag','Gebäude','Mauern','Entwurf'].includes(o.layer)).reduce((s,o)=>s+objectArea(o),0);
    const green=objects.filter(o=>o.layer==='Pflanzen'||o.hatch==='Rasen').reduce((s,o)=>s+objectArea(o),0);
    return {area,line,plantCount,hardscape,green};
  },[objects]);

  const costs=useMemo(()=>{
    const material=costItems.reduce((s,i)=>s+i.quantity*i.unitPrice,0);
    const labor=costItems.reduce((s,i)=>s+i.laborHours*58,0);
    const machine=costItems.reduce((s,i)=>s+i.machineHours*72,0);
    return {material,labor,machine,total:material+labor+machine};
  },[costItems]);

  const eco=useMemo(()=>{
    const selectedPlantIds=objects.map(o=>Number(o.attributes.plantId||0)).filter(Boolean);
    const plantRecords=selectedPlantIds.map(id=>plants.find(p=>p.id===id)).filter(Boolean) as Plant[];
    const biodiversity=plantRecords.length?plantRecords.reduce((s,p)=>s+p.biodiversity,0)/plantRecords.length:35;
    const co2=plantRecords.reduce((s,p)=>s+p.co2,0);
    const totalSurface=Math.max(totals.area,1);
    const sealed=Math.min(100,Math.round((totals.hardscape/totalSurface)*100));
    const rainRetention=Math.max(0,Math.min(100,Math.round((100-sealed)+(drainage.reduce((s,d)=>s+d.storageVolume,0)*4))));
    const heatProtection=Math.max(0,Math.min(100,Math.round((totals.green/totalSurface)*80 + plantRecords.length*2)));
    return {biodiversity:Math.round(biodiversity),co2:Math.round(co2),sealed,rainRetention,heatProtection,score:Math.round((biodiversity+rainRetention+heatProtection+(100-sealed))/4)};
  },[objects,plants,totals,drainage]);

  function svgPoint(e:any):Point{
    const svg=svgRef.current;
    if(!svg)return{x:0,y:0};
    const r=svg.getBoundingClientRect();
    const x=cam.x+((e.clientX-r.left)/r.width)*cam.width;
    const y=cam.y+((e.clientY-r.top)/r.height)*cam.height;
    return {x:Math.round(x*2)/2,y:Math.round(y*2)/2};
  }

  function addObjectAt(p:Point){
    const id=Date.now();
    if(tool==='rect'){
      setObjects(v=>[...v,{id,kind:'rect',layer,name:'Rechteckfläche',points:[],x:p.x,y:p.y,width:3,height:2,radius:0,color:'#a7f3d0',transparency:.25,lineType:'durchgezogen',hatch:'Fläche',elevation:0,attributes:{bimClass:'LandscapeArea'}}]);
      setSelected(id);
      return;
    }
    if(tool==='circle'){
      setObjects(v=>[...v,{id,kind:'circle',layer,name:'Kreis / Radiusfläche',points:[],x:p.x,y:p.y,width:0,height:0,radius:1,color:'#93c5fd',transparency:.2,lineType:'durchgezogen',hatch:'Kreis',elevation:0,attributes:{bimClass:'RadiusArea'}}]);
      setSelected(id);
      return;
    }
    if(tool==='plant'){
      const plant=smartPlantSuggestions()[0]||plants[0];
      setObjects(v=>[...v,{id,kind:'plant',layer:'Pflanzen',name:plant.german,points:[],x:p.x,y:p.y,width:plant.width,height:plant.height,radius:Math.max(.25,plant.width/2),color:'#16a34a',transparency:.05,lineType:'Symbol',hatch:'Pflanze',elevation:0,attributes:{plantId:plant.id,botanical:plant.botanical,waterNeed:plant.waterNeed,biodiversity:plant.biodiversity,year0:plant.height,year10:plant.height*1.65}}]);
      setSelected(id);
      return;
    }
    if(tool==='terrainPoint'){
      setObjects(v=>[...v,{id,kind:'terrainPoint',layer:'Gelände',name:'Höhenpunkt',points:[],x:p.x,y:p.y,width:0,height:0,radius:.15,color:'#7c3aed',transparency:0,lineType:'Punkt',hatch:'Höhe',elevation:1,attributes:{height:1,breakline:false}}]);
      setSelected(id);
      return;
    }
    if(tool==='irrigation'){
      setObjects(v=>[...v,{id,kind:'irrigation',layer:'Bewässerung',name:'Tropfleitung',points:[p,{x:p.x+3,y:p.y}],x:p.x,y:p.y,width:0,height:0,radius:0,color:'#2563eb',transparency:0,lineType:'Rohr',hatch:'',elevation:0,attributes:{diameter:16,flow:2,pressure:2.2}}]);
      setSelected(id);
      return;
    }
    if(tool==='drainage'){
      setObjects(v=>[...v,{id,kind:'drainage',layer:'Entwässerung',name:'Drainage/Rinne',points:[p,{x:p.x+3,y:p.y+1}],x:p.x,y:p.y,width:0,height:0,radius:0,color:'#0f766e',transparency:0,lineType:'Drainage',hatch:'',elevation:0,attributes:{capacity:'Starkregen',slope:1.5}}]);
      setSelected(id);
      return;
    }
    if(tool==='light'){
      setObjects(v=>[...v,{id,kind:'light',layer:'Beleuchtung',name:'Bodenstrahler',points:[],x:p.x,y:p.y,width:0,height:0,radius:.3,color:'#f59e0b',transparency:.1,lineType:'Symbol',hatch:'Licht',elevation:0,attributes:{lux:120,powerW:6,nightScene:true}}]);
      setSelected(id);
      return;
    }
  }

  function handleCanvasClick(e:any){
    const p=svgPoint(e);
    if(tool==='line'){
      const next=[...draft,p];
      if(next.length===2){
        const id=Date.now();
        setObjects(v=>[...v,{id,kind:'line',layer,name:'Linie',points:next,x:0,y:0,width:0,height:0,radius:0,color:'#0f172a',transparency:0,lineType:'durchgezogen',hatch:'',elevation:0,attributes:{}}]);
        setDraft([]);
        setSelected(id);
      } else setDraft(next);
      return;
    }
    if(tool==='polyline'){
      setDraft(v=>[...v,p]);
      setStatus('Polyline: Punkte setzen. Mit „Polyline schließen“ erzeugen.');
      return;
    }
    addObjectAt(p);
  }

  function closePolyline(){
    if(draft.length<2){setStatus('Mindestens 2 Punkte nötig.');return}
    const id=Date.now();
    setObjects(v=>[...v,{id,kind:'polyline',layer,name:'Polyline / Freiform',points:draft,x:0,y:0,width:0,height:0,radius:0,color:'#334155',transparency:0,lineType:'durchgezogen',hatch:'Freiform',elevation:0,attributes:{bimClass:'Freeform'}}]);
    setDraft([]);
    setSelected(id);
  }

  function updateSelected(patch:Partial<CadObject>){
    if(!selectedObject)return;
    setObjects(v=>v.map(o=>o.id===selectedObject.id?{...o,...patch}:o));
  }

  function updateAttr(key:string,value:string|number|boolean){
    if(!selectedObject)return;
    setObjects(v=>v.map(o=>o.id===selectedObject.id?{...o,attributes:{...o.attributes,[key]:value}}:o));
  }

  function smartPlantSuggestions(){
    return plants
      .filter(p=>p.sun.toLowerCase().includes(plantFilter.sun.toLowerCase().split('/')[0]) || plantFilter.sun==='egal')
      .filter(p=>p.soil.toLowerCase().includes(plantFilter.soil.toLowerCase()) || plantFilter.soil==='egal')
      .filter(p=>p.waterNeed<=plantFilter.water)
      .sort((a,b)=>b.biodiversity-a.biodiversity);
  }

  function autoPlantBed(){
    const suggestions=smartPlantSuggestions();
    if(!suggestions.length){setStatus('Keine passende Pflanze gefunden. Filter lockern.');return}
    const baseX=-4, baseY=-2;
    const newObjs:CadObject[]=suggestions.slice(0,4).flatMap((p,idx)=>{
      const count=idx===0?1:idx===1?5:7;
      return Array.from({length:count}).map((_,i)=>({
        id:Date.now()+idx*100+i,
        kind:'plant' as const,
        layer:'Pflanzen',
        name:p.german,
        points:[],
        x:baseX+idx*2+(i%3)*.7,
        y:baseY+Math.floor(i/3)*.7,
        width:p.width,
        height:p.height,
        radius:Math.max(.18,p.width/4),
        color:idx===0?'#15803d':idx===1?'#22c55e':'#65a30d',
        transparency:.08,
        lineType:'Symbol',
        hatch:'Pflanze',
        elevation:0,
        attributes:{plantId:p.id,botanical:p.botanical,spacing:Math.max(.4,p.width*.55),waterNeed:p.waterNeed,biodiversity:p.biodiversity,year5:p.height*1.25,year10:p.height*1.6,year20:p.height*2}
      }));
    });
    setObjects(v=>[...v,...newObjs]);
    setStatus('Automatische Pflanzplanung erstellt: Arten, Stückzahlen und Wachstumssimulation als Attribute.');
  }

  function terrainStats(){
    const pts=objects.filter(o=>o.kind==='terrainPoint');
    if(pts.length<2)return {min:0,max:0,slope:0,cut:0,fill:0};
    const h=pts.map(p=>Number(p.attributes.height??p.elevation??0));
    const min=Math.min(...h),max=Math.max(...h);
    const slope=((max-min)/Math.max(1,Math.sqrt(totals.area)))*100;
    const target=h.reduce((a,b)=>a+b,0)/h.length;
    const cut=h.filter(x=>x>target).reduce((s,x)=>s+(x-target)*4,0);
    const fill=h.filter(x=>x<target).reduce((s,x)=>s+(target-x)*4,0);
    return {min,max,slope,cut,fill};
  }

  function importGeoJson(file:File|null){
    if(!file)return;
    const reader=new FileReader();
    reader.onload=()=>{
      try{
        const gj=JSON.parse(String(reader.result));
        const features=gj.type==='FeatureCollection'?gj.features:[gj];
        const newObjects:CadObject[]=[];
        features.forEach((f:any,idx:number)=>{
          const geom=f.geometry||f;
          if(!geom)return;
          if(geom.type==='LineString'){
            const pts=geom.coordinates.map((c:any)=>({x:Number(c[0])%100/5,y:Number(c[1])%100/5}));
            newObjects.push({id:Date.now()+idx,kind:'polyline',layer:'GIS',name:f.properties?.name||'GeoJSON Linie',points:pts,x:0,y:0,width:0,height:0,radius:0,color:'#7c3aed',transparency:0,lineType:'GIS',hatch:'',elevation:0,attributes:{source:'GeoJSON',...f.properties}});
          }
          if(geom.type==='Polygon'){
            const pts=geom.coordinates[0].map((c:any)=>({x:Number(c[0])%100/5,y:Number(c[1])%100/5}));
            newObjects.push({id:Date.now()+idx,kind:'polyline',layer:'GIS',name:f.properties?.name||'GeoJSON Polygon',points:pts,x:0,y:0,width:0,height:0,radius:0,color:'#9333ea',transparency:.15,lineType:'GIS',hatch:'Polygon',elevation:0,attributes:{source:'GeoJSON',...f.properties}});
          }
        });
        setObjects(v=>[...v,...newObjects]);
        setGeoJsonInfo(`${features.length} GeoJSON-Feature(s) gelesen, ${newObjects.length} Objekt(e) importiert.`);
        setStatus('GIS-Import abgeschlossen.');
      }catch{
        setGeoJsonInfo('GeoJSON konnte nicht gelesen werden.');
      }
    };
    reader.readAsText(file);
  }

  function addCostFromObjects(){
    const pavers=objects.filter(o=>o.hatch.toLowerCase().includes('naturstein')||o.name.toLowerCase().includes('terrasse')).reduce((s,o)=>s+objectArea(o),0);
    const plantCount=objects.filter(o=>o.kind==='plant'||o.attributes.plantId).length;
    const next=[
      ...costItems,
      {id:Date.now(),title:'Automatisch: Belagsflächen herstellen',category:'Belag',quantity:Number(pavers.toFixed(2)),unit:'m²',unitPrice:95,laborHours:pavers*.45,machineHours:pavers*.05},
      {id:Date.now()+1,title:'Automatisch: Pflanzen liefern und setzen',category:'Pflanzen',quantity:plantCount,unit:'Stk',unitPrice:38,laborHours:plantCount*.35,machineHours:0}
    ];
    setCostItems(next);
    setStatus('Kostenpositionen aus Zeichnung erzeugt.');
  }

  function exportProject(){download('al-green-design-v011-landscape.algreen',JSON.stringify({projectInfo,objects,plants,materials,costItems,irrigation,drainage,tasks},null,2),'application/json')}
  function exportLV(){download('leistungsverzeichnis-v011.csv',csv([['Pos','Kategorie','Leistung','Menge','Einheit','EP','Material','Lohn','Maschine','Gesamt'],...costItems.map((i,idx)=>[idx+1,i.category,i.title,i.quantity,i.unit,i.unitPrice,(i.quantity*i.unitPrice).toFixed(2),(i.laborHours*58).toFixed(2),(i.machineHours*72).toFixed(2),(i.quantity*i.unitPrice+i.laborHours*58+i.machineHours*72).toFixed(2)])]),'text/csv;charset=utf-8')}
  function exportPlants(){download('pflanzenliste-v011.csv',csv([['Deutsch','Botanisch','Typ','Sonne','Boden','Wasserbedarf','Bienen','Vögel','CO2','Biodiversität','Preis'],...plants.map(p=>[p.german,p.botanical,p.type,p.sun,p.soil,p.waterNeed,p.bee?'ja':'nein',p.bird?'ja':'nein',p.co2,p.biodiversity,p.price])]),'text/csv;charset=utf-8')}
  function exportGeoJson(){
    const features=objects.map(o=>({type:'Feature',properties:{id:o.id,name:o.name,layer:o.layer,kind:o.kind,...o.attributes},geometry:o.kind==='line'||o.kind==='polyline'||o.kind==='irrigation'||o.kind==='drainage'?{type:'LineString',coordinates:o.points.map(p=>[p.x,p.y])}:{type:'Point',coordinates:[o.x,o.y]}}));
    download('al-green-design-v011.geojson',JSON.stringify({type:'FeatureCollection',features},null,2),'application/geo+json');
  }

  const terrain=terrainStats();

  return (
    <section className="platform">
      <aside className="panel">
        <h2>Module</h2>
        <div className="tabs">
          {[
            ['cad','CAD'],['gis','GIS'],['bim','BIM'],['plants','Pflanzen'],['terrain','Gelände'],['water','Bewässerung'],['drainage','Entwässerung'],['costs','Kosten/LV'],['analysis','Analyse'],['project','Projekt'],['exports','Export']
          ].map(([id,label])=><button key={id} className={`tab ${tab===id?'active':''}`} onClick={()=>setTab(id as Tab)}>{label}</button>)}
        </div>

        <hr/>

        {tab==='cad'&&<div>
          <h2>CAD-Werkzeuge</h2>
          <div className="grid2">
            {[
              ['select','Auswählen'],['line','Linie'],['polyline','Polyline'],['rect','Rechteck'],['circle','Kreis'],['plant','Pflanze'],['terrainPoint','Höhenpunkt'],['irrigation','Bewässerung'],['drainage','Drainage'],['light','Licht']
            ].map(([id,label])=><button key={id} className={`tool ${tool===id?'active':''}`} onClick={()=>setTool(id as Tool)}>{label}</button>)}
          </div>
          <div className="form" style={{marginTop:8}}>
            <label>Layer
              <select value={layer} onChange={e=>setLayer(e.target.value)}>
                {['Bestand','Entwurf','Belag','Pflanzen','Gelände','Bewässerung','Entwässerung','Beleuchtung','GIS','BIM'].map(l=><option key={l}>{l}</option>)}
              </select>
            </label>
            <label>Aktion
              <button className="btn primary" onClick={closePolyline}>Polyline schließen</button>
            </label>
          </div>
          <div className="hint">Snapping: 0,5 m Raster. Formen anklicken zum Auswählen. Attribute rechts bearbeiten.</div>
        </div>}

        {tab==='gis'&&<div>
          <h2>GIS / Geodaten</h2>
          <label className="file">GeoJSON importieren<input type="file" accept=".geojson,.json" onChange={e=>importGeoJson(e.target.files?.[0]??null)}/></label>
          <div className="hint">{geoJsonInfo}</div>
          <div className="form">
            <label>Koordinatensystem<input defaultValue="WGS84 / Projekt lokal"/></label>
            <label>Quelle<input defaultValue="OSM/Kataster/Drohne"/></label>
          </div>
          <p className="small">Vorbereitet für WMS/WMTS, SHP, LandXML, GPS und Drohnendaten als spätere Module.</p>
        </div>}

        {tab==='plants'&&<div>
          <h2>Intelligente Pflanzplanung</h2>
          <div className="form">
            <label>Sonne<select value={plantFilter.sun} onChange={e=>setPlantFilter({...plantFilter,sun:e.target.value})}><option>Sonne</option><option>Halbschatten</option><option>Schatten</option><option>egal</option></select></label>
            <label>Boden<select value={plantFilter.soil} onChange={e=>setPlantFilter({...plantFilter,soil:e.target.value})}><option>trocken</option><option>normal</option><option>frisch</option><option>feucht</option><option>egal</option></select></label>
            <label>max. Wasserbedarf<input type="number" min="1" max="5" value={plantFilter.water} onChange={e=>setPlantFilter({...plantFilter,water:Number(e.target.value)})}/></label>
            <label>Ziel<input value={plantFilter.goal} onChange={e=>setPlantFilter({...plantFilter,goal:e.target.value})}/></label>
          </div>
          <button className="btn primary" style={{marginTop:8}} onClick={autoPlantBed}>Automatisch Pflanzbeet erzeugen</button>
          <div className="list" style={{marginTop:8}}>
            {smartPlantSuggestions().map(p=><div className="item" key={p.id}><strong>{p.german}</strong><span>{p.botanical} · {p.sun} · {p.soil} · Biodiversität {p.biodiversity}</span></div>)}
          </div>
        </div>}

        {tab==='terrain'&&<div>
          <h2>Geländemodell</h2>
          <div className="kpis">
            <div className="kpi"><small>min. Höhe</small><strong>{terrain.min.toFixed(2)} m</strong></div>
            <div className="kpi"><small>max. Höhe</small><strong>{terrain.max.toFixed(2)} m</strong></div>
            <div className="kpi"><small>Gefälle</small><strong>{terrain.slope.toFixed(1)} %</strong></div>
            <div className="kpi"><small>Abtrag/Auftrag</small><strong>{terrain.cut.toFixed(1)} / {terrain.fill.toFixed(1)} m³</strong></div>
          </div>
          <div className="hint">Höhenpunkte setzen über CAD → Höhenpunkt. Rechts beim Objekt die Höhe ändern.</div>
        </div>}

        {tab==='costs'&&<div>
          <h2>Kosten / LV</h2>
          <button className="btn primary" onClick={addCostFromObjects}>Mengen aus Zeichnung übernehmen</button>
          <div className="kpis" style={{marginTop:8}}>
            <div className="kpi"><small>Material</small><strong>{costs.material.toFixed(0)} €</strong></div>
            <div className="kpi"><small>Lohn</small><strong>{costs.labor.toFixed(0)} €</strong></div>
            <div className="kpi"><small>Maschinen</small><strong>{costs.machine.toFixed(0)} €</strong></div>
            <div className="kpi"><small>Gesamt</small><strong>{costs.total.toFixed(0)} €</strong></div>
          </div>
        </div>}

        {tab==='analysis'&&<div>
          <h2>Öko-/Klima-Analyse</h2>
          {[
            ['Öko-Score',eco.score],['Biodiversität',eco.biodiversity],['Regenrückhalt',eco.rainRetention],['Hitzeschutz',eco.heatProtection],['Versiegelung niedrig gut',100-eco.sealed]
          ].map(([label,val])=><div className="item" key={label as string}><strong>{label}: {val}</strong><div className="score"><span style={{width:`${val}%`}}/></div></div>)}
          <div className="hint">CO₂-Speicherung geschätzt: {eco.co2} kg/Jahr. Versiegelung: {eco.sealed}%.</div>
        </div>}

        {tab==='exports'&&<div>
          <h2>Export</h2>
          <div className="grid2">
            <button className="btn blue" onClick={exportProject}>Projekt .algreen</button>
            <button className="btn" onClick={exportLV}>LV CSV</button>
            <button className="btn" onClick={exportPlants}>Pflanzenliste CSV</button>
            <button className="btn" onClick={exportGeoJson}>GeoJSON</button>
          </div>
          <div className="hint">Vorbereitet für spätere Exporte: DXF, DWG, IFC, FBX, OBJ, STL, LandXML, SHP, GAEB, Excel, PDF.</div>
        </div>}
      </aside>

      <div className="workspace">
        <div className="topbar">
          <span className="pill">V0.11 Landschaftsarchitektur</span>
          <span className="pill">Modul: {tab.toUpperCase()}</span>
          <span className="pill">Tool: {tool}</span>
          <span className="pill">Layer: {layer}</span>
        </div>
        <svg ref={svgRef} className="canvas" viewBox={`${cam.x*SCALE} ${cam.y*SCALE} ${cam.width*SCALE} ${cam.height*SCALE}`} onClick={handleCanvasClick}>
          <Grid/>
          {objects.map(o=><Drawable key={o.id} object={o} selected={selected===o.id} onSelect={(e:any)=>{e.stopPropagation();setSelected(o.id);setStatus(`${o.name} ausgewählt.`)}} />)}
          {draft.map((p,i)=><circle key={i} cx={p.x*SCALE} cy={p.y*SCALE} r={5} fill="#f97316"/>)}
        </svg>
        <div className="status">
          <span>{status}</span>
          <span className="badge">{objects.length} Objekte</span>
        </div>
      </div>

      <aside className="panel">
        <h2>Projekt-Kennzahlen</h2>
        <div className="kpis">
          <div className="kpi"><small>Fläche gesamt</small><strong>{totals.area.toFixed(1)} m²</strong></div>
          <div className="kpi"><small>Linien</small><strong>{totals.line.toFixed(1)} m</strong></div>
          <div className="kpi"><small>Pflanzen</small><strong>{totals.plantCount}</strong></div>
          <div className="kpi"><small>Kosten</small><strong>{costs.total.toFixed(0)} €</strong></div>
          <div className="kpi"><small>Öko-Score</small><strong>{eco.score}/100</strong></div>
          <div className="kpi"><small>Regenrückhalt</small><strong>{eco.rainRetention}/100</strong></div>
        </div>

        <hr/>

        <h2>BIM / Objektinformationen</h2>
        {!selectedObject&&<p>Objekt anklicken, um BIM-Daten, Attribute, Kosten- und Pflanzinformationen zu bearbeiten.</p>}
        {selectedObject&&<div>
          <div className="form">
            <label>Name<input value={selectedObject.name} onChange={e=>updateSelected({name:e.target.value})}/></label>
            <label>Layer<input value={selectedObject.layer} onChange={e=>updateSelected({layer:e.target.value})}/></label>
            <label>Farbe<input type="color" value={selectedObject.color} onChange={e=>updateSelected({color:e.target.value})}/></label>
            <label>Transparenz<input type="number" min="0" max="1" step=".05" value={selectedObject.transparency} onChange={e=>updateSelected({transparency:Number(e.target.value)})}/></label>
            <label>Breite<input type="number" step=".1" value={selectedObject.width} onChange={e=>updateSelected({width:Number(e.target.value)})}/></label>
            <label>Höhe/Tiefe<input type="number" step=".1" value={selectedObject.height} onChange={e=>updateSelected({height:Number(e.target.value)})}/></label>
            <label>Radius<input type="number" step=".1" value={selectedObject.radius} onChange={e=>updateSelected({radius:Number(e.target.value)})}/></label>
            <label>Höhe Gelände<input type="number" step=".1" value={Number(selectedObject.attributes.height??selectedObject.elevation)} onChange={e=>updateAttr('height',Number(e.target.value))}/></label>
          </div>
          <div className="hint">BIM-Attribute: {JSON.stringify(selectedObject.attributes)}</div>
          <div className="grid2">
            <button className="btn danger" onClick={()=>{setObjects(v=>v.filter(o=>o.id!==selectedObject.id));setSelected(null)}}>Löschen</button>
            <button className="btn warn" onClick={()=>setObjects(v=>[...v,{...selectedObject,id:Date.now(),x:selectedObject.x+1,y:selectedObject.y+1,name:selectedObject.name+' Kopie'}])}>Duplizieren</button>
          </div>
        </div>}

        <hr/>

        {tab==='water'&&<WaterPanel irrigation={irrigation} setIrrigation={setIrrigation}/>}
        {tab==='drainage'&&<DrainagePanel drainage={drainage} setDrainage={setDrainage}/>}
        {tab==='project'&&<ProjectPanel projectInfo={projectInfo} setProjectInfo={setProjectInfo} tasks={tasks} setTasks={setTasks}/>}
        {tab==='plants'&&<PlantDbPanel plants={plants} setPlants={setPlants}/>}
        {tab==='costs'&&<CostPanel costItems={costItems} setCostItems={setCostItems}/>}
        {tab==='bim'&&<BimPanel objects={objects}/>}
        {tab==='gis'&&<GisPanel objects={objects}/>}
        {tab==='cad'&&<LayerPanel objects={objects}/>}
        {tab==='terrain'&&<TerrainPanel objects={objects}/>}
        {tab==='analysis'&&<AnalysisPanel eco={eco}/>}
        {tab==='exports'&&<ExportInfo/>}
      </aside>
    </section>
  );
}

function Grid(){
  const lines=[];
  for(let x=-100;x<=100;x+=.5)lines.push(<line key={'v'+x} x1={x*SCALE} y1={-100*SCALE} x2={x*SCALE} y2={100*SCALE} stroke={x%1===0?'#cbd5e1':'#e2e8f0'} strokeWidth={x%1===0?1:.6}/>);
  for(let y=-100;y<=100;y+=.5)lines.push(<line key={'h'+y} x1={-100*SCALE} y1={y*SCALE} x2={100*SCALE} y2={y*SCALE} stroke={y%1===0?'#cbd5e1':'#e2e8f0'} strokeWidth={y%1===0?1:.6}/>);
  return <g>{lines}<line x1={-100*SCALE} y1={0} x2={100*SCALE} y2={0} stroke="#94a3b8" strokeWidth={2}/><line x1={0} y1={-100*SCALE} x2={0} y2={100*SCALE} stroke="#94a3b8" strokeWidth={2}/></g>
}

function Drawable({object,selected,onSelect}:any){
  const stroke=selected?'#f59e0b':'#0f172a';
  const sw=selected?4:2;
  if(object.kind==='line'||object.kind==='irrigation'||object.kind==='drainage'){
    const p=object.points;
    if(p.length<2)return null;
    return <g onClick={onSelect}><polyline points={p.map((q:Point)=>`${q.x*SCALE},${q.y*SCALE}`).join(' ')} fill="none" stroke={object.color} strokeWidth={selected?5:3} strokeDasharray={object.kind==='irrigation'?'8 5':object.kind==='drainage'?'4 4':''}/><text x={p[0].x*SCALE} y={(p[0].y-.2)*SCALE} fontSize={12} fill="#0f172a" paintOrder="stroke" stroke="#fff" strokeWidth={3}>{object.name}</text></g>
  }
  if(object.kind==='polyline'){
    return <g onClick={onSelect}><polygon points={object.points.map((q:Point)=>`${q.x*SCALE},${q.y*SCALE}`).join(' ')} fill={object.color} fillOpacity={object.transparency||.12} stroke={stroke} strokeWidth={sw}/><text x={object.points[0]?.x*SCALE} y={object.points[0]?.y*SCALE} fontSize={12} fill="#0f172a" paintOrder="stroke" stroke="#fff" strokeWidth={3}>{object.name}</text></g>
  }
  if(object.kind==='rect'){
    return <g onClick={onSelect}><rect x={(object.x-object.width/2)*SCALE} y={(object.y-object.height/2)*SCALE} width={object.width*SCALE} height={object.height*SCALE} fill={object.color} fillOpacity={1-object.transparency} stroke={stroke} strokeWidth={sw}/><text x={object.x*SCALE} y={object.y*SCALE} fontSize={13} fontWeight="700" textAnchor="middle" fill="#0f172a" paintOrder="stroke" stroke="#fff" strokeWidth={3}>{object.name}</text></g>
  }
  if(object.kind==='circle'||object.kind==='plant'||object.kind==='terrainPoint'||object.kind==='light'){
    const r=Math.max(object.radius,.15)*SCALE;
    return <g onClick={onSelect}><circle cx={object.x*SCALE} cy={object.y*SCALE} r={r} fill={object.color} fillOpacity={1-object.transparency} stroke={stroke} strokeWidth={sw}/>{object.kind==='plant'&&<><circle cx={(object.x+.18)*SCALE} cy={(object.y-.15)*SCALE} r={r*.45} fill="#22c55e" fillOpacity=".85"/><circle cx={(object.x-.16)*SCALE} cy={(object.y+.12)*SCALE} r={r*.35} fill="#15803d" fillOpacity=".85"/></>}{object.kind==='terrainPoint'&&<text x={object.x*SCALE} y={(object.y-.25)*SCALE} fontSize={12} textAnchor="middle" fill="#581c87" paintOrder="stroke" stroke="#fff" strokeWidth={3}>H {object.attributes.height??object.elevation}</text>}{object.kind==='light'&&<circle cx={object.x*SCALE} cy={object.y*SCALE} r={r*2.2} fill="#fde68a" fillOpacity=".25"/>}<text x={object.x*SCALE} y={(object.y+object.radius+.25)*SCALE} fontSize={12} textAnchor="middle" fill="#0f172a" paintOrder="stroke" stroke="#fff" strokeWidth={3}>{object.name}</text></g>
  }
  return null;
}

function WaterPanel({irrigation,setIrrigation}:any){
  const totalFlow=irrigation.reduce((s:any,z:any)=>s+z.emitters*z.flowPerEmitter,0);
  const totalPipe=irrigation.reduce((s:any,z:any)=>s+z.pipeLength,0);
  return <div><h2>Bewässerung</h2><div className="kpis"><div className="kpi"><small>Wasserbedarf</small><strong>{totalFlow.toFixed(1)} l/h</strong></div><div className="kpi"><small>Rohrlänge</small><strong>{totalPipe.toFixed(1)} m</strong></div></div><div className="list" style={{marginTop:8}}>{irrigation.map((z:any)=><div className="item" key={z.id}><strong>{z.name}</strong><span>{z.emitters} Tropfer · {z.flowPerEmitter} l/h · {z.pipeLength} m</span></div>)}</div><button className="btn primary" style={{marginTop:8}} onClick={()=>setIrrigation((v:any[])=>[...v,{id:Date.now(),name:'Neue Bewässerungszone',plantType:'gemischt',area:20,emitters:40,flowPerEmitter:2,pipeLength:35,pressureBar:2.2}])}>Zone hinzufügen</button></div>
}
function DrainagePanel({drainage,setDrainage}:any){
  const volume=drainage.reduce((s:any,d:any)=>s+d.catchmentArea*d.rainfallMm/1000,0);
  const storage=drainage.reduce((s:any,d:any)=>s+d.storageVolume,0);
  return <div><h2>Entwässerung</h2><div className="kpis"><div className="kpi"><small>Regenereignis</small><strong>{volume.toFixed(2)} m³</strong></div><div className="kpi"><small>Speicher</small><strong>{storage.toFixed(2)} m³</strong></div></div><div className="list" style={{marginTop:8}}>{drainage.map((d:any)=><div className="item" key={d.id}><strong>{d.name}</strong><span>{d.type} · {d.catchmentArea} m² · {d.rainfallMm} mm</span></div>)}</div><button className="btn primary" style={{marginTop:8}} onClick={()=>setDrainage((v:any[])=>[...v,{id:Date.now(),name:'Neue Mulde/Rigole',type:'Mulde',catchmentArea:25,rainfallMm:35,infiltrationRate:10,storageVolume:1}])}>System hinzufügen</button></div>
}
function ProjectPanel({projectInfo,setProjectInfo,tasks,setTasks}:any){
  return <div><h2>Projektmanagement</h2><div className="form"><label>Projekt<input value={projectInfo.name} onChange={e=>setProjectInfo({...projectInfo,name:e.target.value})}/></label><label>Budget €<input type="number" value={projectInfo.budget} onChange={e=>setProjectInfo({...projectInfo,budget:Number(e.target.value)})}/></label><label>Klima<input value={projectInfo.climate} onChange={e=>setProjectInfo({...projectInfo,climate:e.target.value})}/></label><label>Sonnenstunden<input type="number" value={projectInfo.sunHours} onChange={e=>setProjectInfo({...projectInfo,sunHours:Number(e.target.value)})}/></label></div><h3>Aufgaben</h3><div className="list">{tasks.map((t:any)=><div className="item" key={t.id}><strong>{t.title}</strong><span>{t.status} · {t.owner} · {t.note}</span></div>)}</div><button className="btn primary" style={{marginTop:8}} onClick={()=>setTasks((v:any[])=>[...v,{id:Date.now(),title:'Neue Aufgabe',status:'offen',owner:'',due:'',note:''}])}>Aufgabe hinzufügen</button></div>
}
function PlantDbPanel({plants,setPlants}:any){
  return <div><h2>Pflanzendatenbank</h2><div className="list">{plants.map((p:any)=><div className="item" key={p.id}><strong>{p.german}</strong><span>{p.botanical} · {p.type} · {p.price} € · Bio {p.biodiversity}</span></div>)}</div><button className="btn primary" style={{marginTop:8}} onClick={()=>setPlants((v:any[])=>[...v,{id:Date.now(),german:'Neue Pflanze',botanical:'Botanischer Name',family:'',type:'Staude',height:1,width:1,sun:'Sonne',soil:'normal',waterNeed:2,hardy:'winterhart',bee:true,bird:false,co2:3,biodiversity:50,price:5,supplier:''}])}>Pflanze hinzufügen</button></div>
}
function CostPanel({costItems,setCostItems}:any){
  return <div><h2>LV-Positionen</h2><div className="list">{costItems.map((i:any)=><div className="item" key={i.id}><strong>{i.title}</strong><span>{i.quantity} {i.unit} × {i.unitPrice} € + Lohn/Maschine</span></div>)}</div><button className="btn primary" style={{marginTop:8}} onClick={()=>setCostItems((v:any[])=>[...v,{id:Date.now(),title:'Neue LV-Position',category:'Allgemein',quantity:1,unit:'Stk',unitPrice:100,laborHours:1,machineHours:0}])}>Position hinzufügen</button></div>
}
function BimPanel({objects}:any){return <div><h2>BIM-Übersicht</h2><table className="table"><tbody>{objects.slice(0,8).map((o:any)=><tr key={o.id}><td>{o.name}</td><td>{o.layer}</td><td>{o.attributes.bimClass||o.kind}</td></tr>)}</tbody></table></div>}
function GisPanel({objects}:any){const count=objects.filter((o:any)=>o.layer==='GIS'||o.attributes.source==='GeoJSON').length;return <div><h2>GIS-Objekte</h2><div className="kpi"><small>Importierte Geodaten</small><strong>{count}</strong></div></div>}
function LayerPanel({objects}:any){const layers=Array.from(new Set(objects.map((o:any)=>o.layer)));return <div><h2>Layer-System</h2><div className="list">{layers.map((l:any)=><div className="item" key={l}><strong>{l}</strong><span>{objects.filter((o:any)=>o.layer===l).length} Objekt(e)</span></div>)}</div></div>}
function TerrainPanel({objects}:any){const pts=objects.filter((o:any)=>o.kind==='terrainPoint');return <div><h2>Höhenpunkte</h2><div className="list">{pts.map((p:any)=><div className="item" key={p.id}><strong>{p.name}</strong><span>X {p.x}, Y {p.y}, H {p.attributes.height??p.elevation} m</span></div>)}</div></div>}
function AnalysisPanel({eco}:any){return <div><h2>Premium-Analyse</h2><p className="small">Digital Twin, KI-Generatives Design, 20 Varianten, Wasser-/Pflege-/Kostenoptimierung sind als nächste Module vorbereitet.</p><div className="hint">Aktueller Score: {eco.score}/100 · CO₂: {eco.co2} kg/Jahr · Regenrückhalt: {eco.rainRetention}/100</div></div>}
function ExportInfo(){return <div><h2>Schnittstellen</h2><p className="small">Aktiv: JSON, CSV, GeoJSON, .algreen. Nächste technische Module: DXF/DWG, IFC, LandXML, SHP, GAEB, OBJ/FBX/STL, API.</p></div>}
