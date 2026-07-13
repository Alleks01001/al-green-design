'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

type Tab = 'cad'|'gis'|'bim'|'plants'|'ai'|'terrain'|'water'|'drainage'|'lighting'|'costs'|'analysis'|'growth'|'chat'|'saas'|'roadmap'|'project'|'exports';
type Tool = 'select'|'line'|'polyline'|'rect'|'circle'|'plant'|'terrainPoint'|'terrainMound'|'terrainDepression'|'terrainSmooth'|'terrainSlope'|'irrigation'|'drainage'|'light';
type Point = {x:number;y:number};

type CadObject = {
  id:number;
  kind:'line'|'polyline'|'rect'|'circle'|'plant'|'terrainPoint'|'terrainMound'|'terrainDepression'|'terrainSmooth'|'terrainSlope'|'irrigation'|'drainage'|'light';
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
  finalHeight:number;
  finalWidth:number;
  sun:string;
  soil:string;
  waterNeed:number;
  hardy:string;
  hardinessZone:string;
  growthRate:string;
  bloomTime:string;
  flowerColor:string;
  pruningTolerance:string;
  maintenance:string;
  insectFriendly:boolean;
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
  {id:1,german:'Felsenbirne',botanical:'Amelanchier lamarckii',family:'Rosaceae',type:'Baum/Strauch',height:3,width:2,finalHeight:6,finalWidth:4.5,sun:'Sonne/Halbschatten',soil:'normal/frisch',waterNeed:2,hardy:'sehr winterhart',hardinessZone:'5-8',growthRate:'mittel',bloomTime:'April',flowerColor:'weiß',pruningTolerance:'gut',maintenance:'niedrig',insectFriendly:true,bee:true,bird:true,co2:42,biodiversity:88,price:68,supplier:'Baumschule Standard'},
  {id:2,german:'Lavendel',botanical:'Lavandula angustifolia',family:'Lamiaceae',type:'Staude',height:.45,width:.45,finalHeight:.65,finalWidth:.55,sun:'Sonne',soil:'trocken/durchlässig',waterNeed:1,hardy:'winterhart',hardinessZone:'6-9',growthRate:'mittel',bloomTime:'Juni-August',flowerColor:'violett',pruningTolerance:'sehr gut',maintenance:'niedrig',insectFriendly:true,bee:true,bird:false,co2:2,biodiversity:80,price:4.8,supplier:'Staudengärtnerei'},
  {id:3,german:'Hainbuche',botanical:'Carpinus betulus',family:'Betulaceae',type:'Hecke/Baum',height:1.5,width:.7,finalHeight:12,finalWidth:7,sun:'Sonne/Halbschatten/Schatten',soil:'normal',waterNeed:2,hardy:'sehr winterhart',hardinessZone:'4-8',growthRate:'schnell',bloomTime:'April-Mai',flowerColor:'gelblich',pruningTolerance:'sehr gut',maintenance:'mittel',insectFriendly:true,bee:false,bird:true,co2:95,biodiversity:82,price:18,supplier:'Heckenpflanzen'},
  {id:4,german:'Reitgras',botanical:'Calamagrostis x acutiflora',family:'Poaceae',type:'Gras',height:1.0,width:.45,finalHeight:1.5,finalWidth:.65,sun:'Sonne',soil:'normal/trocken',waterNeed:1,hardy:'winterhart',hardinessZone:'5-9',growthRate:'mittel',bloomTime:'Juli-Oktober',flowerColor:'beige',pruningTolerance:'gut',maintenance:'niedrig',insectFriendly:false,bee:false,bird:true,co2:5,biodiversity:55,price:7.5,supplier:'Staudengärtnerei'},
  {id:5,german:'Japanischer Ahorn',botanical:'Acer palmatum',family:'Sapindaceae',type:'Baum',height:2,width:1.6,finalHeight:4.5,finalWidth:4, sun:'Halbschatten',soil:'frisch/humos',waterNeed:3,hardy:'winterhart',hardinessZone:'6-8',growthRate:'langsam',bloomTime:'Mai',flowerColor:'rot',pruningTolerance:'mittel',maintenance:'mittel',insectFriendly:false,bee:false,bird:false,co2:31,biodiversity:45,price:120,supplier:'Solitärpflanzen'},
  {id:6,german:'Salbei',botanical:'Salvia nemorosa',family:'Lamiaceae',type:'Staude',height:.35,width:.35,finalHeight:.55,finalWidth:.45,sun:'Sonne',soil:'trocken/normal',waterNeed:1,hardy:'winterhart',hardinessZone:'5-9',growthRate:'mittel',bloomTime:'Juni-September',flowerColor:'blauviolett',pruningTolerance:'sehr gut',maintenance:'niedrig',insectFriendly:true,bee:true,bird:false,co2:2,biodiversity:86,price:4.2,supplier:'Staudengärtnerei'},
  {id:7,german:'Kornelkirsche',botanical:'Cornus mas',family:'Cornaceae',type:'Strauch/Baum',height:2.5,width:2,finalHeight:6,finalWidth:4,sun:'Sonne/Halbschatten',soil:'normal/trocken',waterNeed:2,hardy:'sehr winterhart',hardinessZone:'5-8',growthRate:'langsam',bloomTime:'Februar-März',flowerColor:'gelb',pruningTolerance:'gut',maintenance:'niedrig',insectFriendly:true,bee:true,bird:true,co2:40,biodiversity:91,price:54,supplier:'Baumschule Standard'},
  {id:8,german:'Rosmarin winterhart',botanical:'Salvia rosmarinus',family:'Lamiaceae',type:'Halbstrauch',height:.45,width:.45,finalHeight:1.1,finalWidth:1,sun:'Sonne',soil:'trocken/durchlässig',waterNeed:1,hardy:'bedingt winterhart',hardinessZone:'7-10',growthRate:'langsam',bloomTime:'April-Juni',flowerColor:'blau',pruningTolerance:'gut',maintenance:'niedrig',insectFriendly:true,bee:true,bird:false,co2:3,biodiversity:74,price:8.5,supplier:'Mediterran'}
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
function objectArea(o:CadObject){if(o.kind==='rect'||o.kind==='terrainSlope')return Math.abs(o.width*o.height);if(o.kind==='circle'||o.kind==='terrainMound'||o.kind==='terrainDepression'||o.kind==='terrainSmooth')return Math.PI*o.radius*o.radius;if(o.kind==='polyline')return polygonArea(o.points);return 0}
function objectLength(o:CadObject){if(o.kind==='line'&&o.points.length>=2)return distance(o.points[0],o.points[1]);if(o.kind==='polyline')return o.points.slice(1).reduce((s,p,i)=>s+distance(o.points[i],p),0);return 0}

export default function LandscapePlatform(){
  const svgRef=useRef<SVGSVGElement|null>(null);
  const [tab,setTab]=useState<Tab>('cad');
  const [view,setView]=useState<'2d'|'3d'>('2d');
  const [tool,setTool]=useState<Tool>('rect');
  const [layer,setLayer]=useState('Entwurf');
  const [selected,setSelected]=useState<number|null>(null);
  const [status,setStatus]=useState('Bereit: V0.12 Landschaftsarchitektur-Plattform.');
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
  const [projectInfo,setProjectInfo]=useState({name:'Neues Landschaftsprojekt',client:'',budget:30000,climate:'Oberösterreich',location:'Wien',soil:'normal/trocken',sunHours:6,style:'mediterran',area:400,pool:true,children:false,care:'pflegeleicht'});
  const [aiPrompt,setAiPrompt]=useState('Mediterraner Garten, 400 m², wenig Pflege, Pool vorhanden');
  const [gardenChat,setGardenChat]=useState('Ich habe zwei Kinder und wenig Zeit.');
  const [season,setSeason]=useState<'Frühling'|'Sommer'|'Herbst'|'Winter'>('Sommer');
  const [growthYear,setGrowthYear]=useState<0|3|10|20>(0);
  const [nightMode,setNightMode]=useState(false);
  const [walkMode,setWalkMode]=useState(false);
  const [optimization,setOptimization]=useState({cost:true,biodiversity:true,water:true,shade:true,care:true});

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
    if(tool==='terrainMound'){
      setObjects(v=>[...v,{id,kind:'terrainMound',layer:'Gelände',name:'Runde Erhebung / Hügel',points:[],x:p.x,y:p.y,width:0,height:0,radius:1.6,color:'#a3e635',transparency:.18,lineType:'Gelände',hatch:'Erhebung',elevation:0,attributes:{terrainType:'Auftrag',height:0.8,slope:'gleitend',earthVolume:3.2,costPerM3:42}}]);
      setSelected(id);
      setStatus('Runde Erhebung gesetzt. Höhe/Radius rechts bearbeiten.');
      return;
    }
    if(tool==='terrainDepression'){
      setObjects(v=>[...v,{id,kind:'terrainDepression',layer:'Gelände',name:'Mulde / Senke',points:[],x:p.x,y:p.y,width:0,height:0,radius:1.5,color:'#60a5fa',transparency:.28,lineType:'Gelände',hatch:'Senke',elevation:0,attributes:{terrainType:'Abtrag',height:-0.55,slope:'gleitend',earthVolume:2.4,costPerM3:48}}]);
      setSelected(id);
      setStatus('Mulde/Senke gesetzt. Tiefe/Radius rechts bearbeiten.');
      return;
    }
    if(tool==='terrainSmooth'){
      setObjects(v=>[...v,{id,kind:'terrainSmooth',layer:'Gelände',name:'Gelände glätten / Übergang',points:[],x:p.x,y:p.y,width:0,height:0,radius:2.0,color:'#bbf7d0',transparency:.36,lineType:'Gelände',hatch:'Glättung',elevation:0,attributes:{terrainType:'Glättung',height:0.25,slope:'sehr weich',earthVolume:1.1,costPerM3:35}}]);
      setSelected(id);
      setStatus('Glättungsbereich gesetzt.');
      return;
    }
    if(tool==='terrainSlope'){
      setObjects(v=>[...v,{id,kind:'terrainSlope',layer:'Gelände',name:'Böschung / Rampe',points:[],x:p.x,y:p.y,width:4,height:2,radius:0,color:'#d9a441',transparency:.22,lineType:'Gelände',hatch:'Böschung',elevation:0,attributes:{terrainType:'Böschung',startHeight:0,endHeight:0.9,slopePercent:22.5,earthVolume:3.6,costPerM3:46}}]);
      setSelected(id);
      setStatus('Böschung/Rampe gesetzt. Start-/Endhöhe rechts bearbeiten.');
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
    const locationBoost=projectInfo.location.toLowerCase().includes('wien') ? 1 : 0;
    return plants
      .filter(p=>p.sun.toLowerCase().includes(plantFilter.sun.toLowerCase().split('/')[0]) || plantFilter.sun==='egal')
      .filter(p=>p.soil.toLowerCase().includes(plantFilter.soil.toLowerCase()) || plantFilter.soil==='egal')
      .filter(p=>p.waterNeed<=plantFilter.water)
      .sort((a,b)=>
        (b.biodiversity + (b.maintenance==='niedrig'?12:0) + (b.waterNeed===1?8:0) + locationBoost)
        -
        (a.biodiversity + (a.maintenance==='niedrig'?12:0) + (a.waterNeed===1?8:0) + locationBoost)
      );
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


  function generateAIDesign(){
    const lower=aiPrompt.toLowerCase();
    const mediterran=lower.includes('mediterran');
    const children=lower.includes('kinder') || projectInfo.children;
    const lowCare=lower.includes('wenig pflege') || lower.includes('pflegeleicht') || projectInfo.care.includes('pflege');
    const hasPool=lower.includes('pool') || projectInfo.pool;
    const baseId=Date.now();

    const newObjects:CadObject[]=[
      {id:baseId+1,kind:'rect',layer:'Belag',name:'Sitzbereich / Terrasse',points:[],x:-3,y:1.5,width:4.5,height:2.8,radius:0,color:'#a8a29e',transparency:.12,lineType:'durchgezogen',hatch:'Naturstein',elevation:.05,attributes:{bimClass:'Hardscape',material:mediterran?'Naturstein hell':'Pflaster',costCode:'BEL-KI'}},
      {id:baseId+2,kind:'polyline',layer:'Belag',name:'geschwungener Weg',points:[{x:-5,y:-2},{x:-2,y:-1},{x:1,y:-.5},{x:4,y:1.2}],x:0,y:0,width:0,height:0,radius:0,color:'#d6d3d1',transparency:.15,lineType:'Weg',hatch:'Kiesweg',elevation:.03,attributes:{bimClass:'Path',material:mediterran?'Kies hell':'Pflaster'}},
      {id:baseId+3,kind:'rect',layer:'Pflanzen',name:'pflegeleichte Pflanzfläche',points:[],x:2,y:-2.2,width:6,height:2.4,radius:0,color:'#bbf7d0',transparency:.25,lineType:'Pflanzfläche',hatch:'Stauden/Gräser',elevation:0,attributes:{bimClass:'PlantingArea',maintenance:lowCare?'niedrig':'mittel'}},
      {id:baseId+4,kind:'light',layer:'Beleuchtung',name:'Akzentlicht Sitzbereich',points:[],x:-4.6,y:.2,width:0,height:0,radius:.3,color:'#f59e0b',transparency:.1,lineType:'Symbol',hatch:'Licht',elevation:0,attributes:{lux:180,powerW:8,nightScene:true}},
      {id:baseId+5,kind:'irrigation',layer:'Bewässerung',name:'automatische Tropfleitung',points:[{x:-1,y:-3},{x:2,y:-3},{x:5,y:-2.2}],x:0,y:0,width:0,height:0,radius:0,color:'#2563eb',transparency:0,lineType:'Rohr',hatch:'',elevation:0,attributes:{diameter:16,flow:2.2,pressure:2.1,auto:true}}
    ];

    if(hasPool){
      newObjects.push({id:baseId+6,kind:'rect',layer:'Wasser',name:'Pool Bestand / Wasserfläche',points:[],x:3.5,y:2,width:3.5,height:2.2,radius:0,color:'#38bdf8',transparency:.18,lineType:'Pool',hatch:'Wasser',elevation:.02,attributes:{bimClass:'Pool',safety:children?'Kindersicherung empfohlen':'standard'}});
    }
    if(children){
      newObjects.push({id:baseId+7,kind:'circle',layer:'Entwurf',name:'Spielbereich Rasen',points:[],x:-4,y:-2.2,width:0,height:0,radius:1.4,color:'#86efac',transparency:.2,lineType:'Spielbereich',hatch:'Rasen',elevation:0,attributes:{bimClass:'PlayArea',poisonousPlants:'vermeiden',shade:'mittel'}});
    }

    const suggestions=smartPlantSuggestions().slice(0, mediterran?4:5);
    suggestions.forEach((p,idx)=>{
      const count=idx===0?2:idx===1?8:idx===2?12:5;
      for(let i=0;i<count;i++){
        newObjects.push({id:baseId+100+idx*30+i,kind:'plant',layer:'Pflanzen',name:p.german,points:[],x:1+idx*1.2+(i%4)*.45,y:-3.1+Math.floor(i/4)*.45,width:p.width,height:p.height,radius:Math.max(.18,p.width/4),color:idx<2?'#16a34a':'#65a30d',transparency:.05,lineType:'Symbol',hatch:'Pflanze',elevation:0,attributes:{plantId:p.id,botanical:p.botanical,waterNeed:p.waterNeed,biodiversity:p.biodiversity,maintenance:p.maintenance,finalHeight:p.finalHeight,finalWidth:p.finalWidth,year3:p.height*1.25,year10:p.finalHeight*.75,year20:p.finalHeight}} as CadObject);
      }
    });

    setObjects(v=>[...v,...newObjects]);
    setCostItems(v=>[
      ...v,
      {id:baseId+800,title:'KI-Design: Beläge und Sitzbereich',category:'Belag',quantity:13,unit:'m²',unitPrice:115,laborHours:9,machineHours:2},
      {id:baseId+801,title:'KI-Design: Pflanzflächen und Pflanzen',category:'Pflanzen',quantity:suggestions.length?35:15,unit:'Stk',unitPrice:18,laborHours:10,machineHours:0},
      {id:baseId+802,title:'KI-Design: Bewässerung automatisch',category:'Bewässerung',quantity:1,unit:'Psch',unitPrice:950,laborHours:7,machineHours:1}
    ]);
    setIrrigation(v=>[...v,{id:baseId+900,name:'KI-Zone pflegeleicht',plantType:'Stauden/Gräser',area:42,emitters:84,flowPerEmitter:2,pipeLength:65,pressureBar:2.2}]);
    setStatus('KI-Design erzeugt: Layout, Pflanzen, Weg, Licht, Bewässerung und Kostenpositionen.');
  }

  function applyGardenChat(){
    const text=gardenChat.toLowerCase();
    if(text.includes('kinder')){
      setProjectInfo({...projectInfo,children:true,care:'pflegeleicht'});
      setOptimization({...optimization,shade:true,care:true});
      setStatus('Garten-Chat: Kinder erkannt. Spielbereich, ungiftige Pflanzen und Schatten werden priorisiert.');
    } else if(text.includes('wenig zeit') || text.includes('pflege')){
      setProjectInfo({...projectInfo,care:'pflegeleicht'});
      setPlantFilter({...plantFilter,water:2,goal:'pflegeleicht trockenheitsresistent'});
      setStatus('Garten-Chat: Pflegeaufwand wird reduziert, trockenheitsresistente Pflanzen bevorzugt.');
    } else {
      setStatus('Garten-Chat ausgewertet. Regeln können erweitert werden.');
    }
  }

  function advancedCostTotal(){
    const plantObjects=objects.filter(o=>o.kind==='plant'||o.attributes.plantId);
    const plantCosts=plantObjects.reduce((sum,o)=>{
      const p=plants.find(p=>p.id===Number(o.attributes.plantId));
      return sum+(p?.price??18);
    },0);
    const earthworks=objects.filter(o=>['terrainMound','terrainDepression','terrainSlope','terrainSmooth'].includes(o.kind)).reduce((sum,o)=>sum+Number(o.attributes.earthVolume??0)*Number(o.attributes.costPerM3??45),0);
    const irrigationCost=irrigation.reduce((sum,z)=>sum+z.pipeLength*1.9+z.emitters*1.1+180,0);
    const paving=objects.filter(o=>o.layer==='Belag'||o.hatch.toLowerCase().includes('pflaster')||o.hatch.toLowerCase().includes('naturstein')).reduce((sum,o)=>sum+objectArea(o)*95,0);
    const labor=costItems.reduce((sum,i)=>sum+i.laborHours*58,0);
    return {plantCosts,earthworks,irrigationCost,paving,labor,total:plantCosts+earthworks+irrigationCost+paving+labor+costs.machine+costs.material};
  }

  function terrainStats(){
    const pts=objects.filter(o=>o.kind==='terrainPoint');
    const shapes=objects.filter(o=>['terrainMound','terrainDepression','terrainSmooth','terrainSlope'].includes(o.kind));
    const heights=[
      ...pts.map(p=>Number(p.attributes.height??p.elevation??0)),
      ...shapes.map(s=>Number(s.attributes.height??s.attributes.endHeight??0))
    ];
    if(!heights.length)return {min:0,max:0,slope:0,cut:0,fill:0,shapes:0,cost:0};
    const min=Math.min(...heights),max=Math.max(...heights);
    const slope=((max-min)/Math.max(1,Math.sqrt(totals.area)))*100;
    const target=heights.reduce((a,b)=>a+b,0)/heights.length;
    const cutPts=heights.filter(x=>x>target).reduce((s,x)=>s+(x-target)*4,0);
    const fillPts=heights.filter(x=>x<target).reduce((s,x)=>s+(target-x)*4,0);
    const cutShapes=shapes.filter(s=>s.kind==='terrainDepression').reduce((sum,s)=>sum+Number(s.attributes.earthVolume??objectArea(s)*Math.abs(Number(s.attributes.height??0))*0.45),0);
    const fillShapes=shapes.filter(s=>s.kind!=='terrainDepression').reduce((sum,s)=>sum+Number(s.attributes.earthVolume??objectArea(s)*Math.abs(Number(s.attributes.height??s.attributes.endHeight??0))*0.45),0);
    const cost=shapes.reduce((sum,s)=>sum+Number(s.attributes.earthVolume??0)*Number(s.attributes.costPerM3??45),0);
    return {min,max,slope,cut:cutPts+cutShapes,fill:fillPts+fillShapes,shapes:shapes.length,cost};
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

  function exportProject(){download('al-green-design-v011-landscape.algreen',JSON.stringify({version:'0.12.0',projectInfo,objects,plants,materials,costItems,irrigation,drainage,tasks,aiPrompt,gardenChat,season,growthYear,optimization},null,2),'application/json')}
  function exportLV(){download('leistungsverzeichnis-v011.csv',csv([['Pos','Kategorie','Leistung','Menge','Einheit','EP','Material','Lohn','Maschine','Gesamt'],...costItems.map((i,idx)=>[idx+1,i.category,i.title,i.quantity,i.unit,i.unitPrice,(i.quantity*i.unitPrice).toFixed(2),(i.laborHours*58).toFixed(2),(i.machineHours*72).toFixed(2),(i.quantity*i.unitPrice+i.laborHours*58+i.machineHours*72).toFixed(2)])]),'text/csv;charset=utf-8')}
  function exportPlants(){download('pflanzenliste-v011.csv',csv([['Deutsch','Botanisch','Typ','Sonne','Boden','Wasserbedarf','Bienen','Vögel','CO2','Biodiversität','Preis'],...plants.map(p=>[p.german,p.botanical,p.type,p.sun,p.soil,p.waterNeed,p.bee?'ja':'nein',p.bird?'ja':'nein',p.co2,p.biodiversity,p.price])]),'text/csv;charset=utf-8')}
  function exportGeoJson(){
    const features=objects.map(o=>({type:'Feature',properties:{id:o.id,name:o.name,layer:o.layer,kind:o.kind,...o.attributes},geometry:o.kind==='line'||o.kind==='polyline'||o.kind==='irrigation'||o.kind==='drainage'?{type:'LineString',coordinates:o.points.map(p=>[p.x,p.y])}:{type:'Point',coordinates:[o.x,o.y]}}));
    download('al-green-design-v011.geojson',JSON.stringify({type:'FeatureCollection',features},null,2),'application/geo+json');
  }

  const terrain=terrainStats();
  const proCost=advancedCostTotal();

  return (
    <section className="platform">
      <aside className="panel">
        <h2>Module</h2>
        <div className="tabs">
          {[
            ['cad','CAD'],['gis','GIS'],['bim','BIM'],['plants','Pflanzen'],['ai','KI-Design'],['terrain','Gelände'],['water','Bewässerung'],['drainage','Regenwasser'],['lighting','Licht'],['costs','Kosten/LV'],['analysis','Analyse'],['growth','Wachstum'],['chat','Garten-Chat'],['saas','SaaS'],['roadmap','Technik'],['project','Projekt'],['exports','Export']
          ].map(([id,label])=><button key={id} className={`tab ${tab===id?'active':''}`} onClick={()=>setTab(id as Tab)}>{label}</button>)}
        </div>

        <hr/>

        {tab==='cad'&&<div>
          <h2>CAD-Werkzeuge</h2>
          <div className="grid2">
            {[
              ['select','Auswählen'],['line','Linie'],['polyline','Polyline'],['rect','Rechteck'],['circle','Kreis'],['plant','Pflanze'],['terrainPoint','Höhenpunkt'],['terrainMound','Erhebung rund'],['terrainDepression','Mulde/Senke'],['terrainSmooth','Gelände glätten'],['terrainSlope','Böschung/Rampe'],['irrigation','Bewässerung'],['drainage','Drainage'],['light','Licht']
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
            {smartPlantSuggestions().map(p=><div className="item" key={p.id}><strong>{p.german}</strong><span>{p.botanical} · Zone {p.hardinessZone} · {p.sun} · {p.soil} · Wasser {p.waterNeed}/5 · Endgröße {p.finalHeight}×{p.finalWidth} m · Blüte {p.bloomTime} {p.flowerColor} · CO₂ {p.co2} · Bio {p.biodiversity}</span></div>)}
          </div>
        </div>}

        {tab==='ai'&&<div>
          <h2>KI-Designgenerator</h2>
          <div className="form">
            <label>Standort<input value={projectInfo.location} onChange={e=>setProjectInfo({...projectInfo,location:e.target.value})}/></label>
            <label>Budget €<input type="number" value={projectInfo.budget} onChange={e=>setProjectInfo({...projectInfo,budget:Number(e.target.value)})}/></label>
            <label>Fläche m²<input type="number" value={projectInfo.area} onChange={e=>setProjectInfo({...projectInfo,area:Number(e.target.value)})}/></label>
            <label>Stil<input value={projectInfo.style} onChange={e=>setProjectInfo({...projectInfo,style:e.target.value})}/></label>
          </div>
          <label className="small">Prompt</label>
          <textarea style={{width:'100%',marginTop:6,border:'1px solid #dbe4ee',borderRadius:10,padding:8}} value={aiPrompt} onChange={e=>setAiPrompt(e.target.value)} />
          <button className="btn primary" style={{marginTop:8}} onClick={generateAIDesign}>KI-Design erzeugen</button>
          <div className="hint">Erzeugt Layout, Pflanzen, Wege, Sitzbereiche, Beleuchtung, Bewässerung und Kostenpositionen regelbasiert.</div>
        </div>}

        {tab==='terrain'&&<div>
          <h2>Geländemodell</h2>
          <div className="kpis">
            <div className="kpi"><small>min. Höhe</small><strong>{terrain.min.toFixed(2)} m</strong></div>
            <div className="kpi"><small>max. Höhe</small><strong>{terrain.max.toFixed(2)} m</strong></div>
            <div className="kpi"><small>Gefälle</small><strong>{terrain.slope.toFixed(1)} %</strong></div>
            <div className="kpi"><small>Abtrag/Auftrag</small><strong>{terrain.cut.toFixed(1)} / {terrain.fill.toFixed(1)} m³</strong></div>
            <div className="kpi"><small>Geländeformen</small><strong>{terrain.shapes}</strong></div>
            <div className="kpi"><small>Erdkosten grob</small><strong>{terrain.cost.toFixed(0)} €</strong></div>
          </div>
          <div className="hint">Über CAD-Werkzeuge kannst du Erhebung, Mulde, Glättung und Böschung einzeichnen. Rechts beim Objekt Höhe, Tiefe, Radius und Erdmasse ändern.</div>
        </div>}

        {tab==='lighting'&&<div>
          <h2>Lichtplanung</h2>
          <div className="form">
            <label>Modus<select value={nightMode?'Nacht':'Tag'} onChange={e=>setNightMode(e.target.value==='Nacht')}><option>Tag</option><option>Nacht</option></select></label>
            <label>Lichtobjekt<button className="btn" onClick={()=>setTool('light')}>Leuchte setzen</button></label>
          </div>
          <div className="hint">Lux-Schätzung je Leuchte über Attribute. Nachtansicht in 3D ist als Option vorbereitet.</div>
        </div>}

        {tab==='growth'&&<div>
          <h2>Wachstumsprognose</h2>
          <div className="grid2">
            {[0,3,10,20].map(y=><button key={y} className={`btn ${growthYear===y?'active':''}`} onClick={()=>setGrowthYear(y as 0|3|10|20)}>{y===0?'heute':`${y} Jahre`}</button>)}
          </div>
          <div className="hint">Pflanzenattribute enthalten Endhöhe/Endbreite und Jahresprognose. Überfüllung nach 10/20 Jahren kann damit beurteilt werden.</div>
        </div>}

        {tab==='chat'&&<div>
          <h2>Garten-Chat</h2>
          <textarea style={{width:'100%',border:'1px solid #dbe4ee',borderRadius:10,padding:8}} value={gardenChat} onChange={e=>setGardenChat(e.target.value)} />
          <button className="btn primary" style={{marginTop:8}} onClick={applyGardenChat}>Chat auswerten</button>
          <div className="form" style={{marginTop:8}}>
            <label><input type="checkbox" checked={optimization.cost} onChange={e=>setOptimization({...optimization,cost:e.target.checked})}/> minimale Kosten</label>
            <label><input type="checkbox" checked={optimization.biodiversity} onChange={e=>setOptimization({...optimization,biodiversity:e.target.checked})}/> Biodiversität</label>
            <label><input type="checkbox" checked={optimization.water} onChange={e=>setOptimization({...optimization,water:e.target.checked})}/> Wasser sparen</label>
            <label><input type="checkbox" checked={optimization.shade} onChange={e=>setOptimization({...optimization,shade:e.target.checked})}/> Beschattung</label>
          </div>
        </div>}

        {tab==='saas'&&<div>
          <h2>SaaS-Modell</h2>
          <div className="list">
            <div className="item"><strong>Free</strong><span>2D-Gartenplanung, einfache Pflanzbibliothek</span></div>
            <div className="item"><strong>Pro</strong><span>KI-Design, 3D, Kostenberechnung, Export</span></div>
            <div className="item"><strong>Enterprise</strong><span>CAD, BIM, GIS, Teamarbeit, Ausschreibungen</span></div>
          </div>
        </div>}

        {tab==='roadmap'&&<div>
          <h2>Technik / Must Have</h2>
          <div className="list">
            {['React + TypeScript','Three.js','PostgreSQL + PostGIS','OpenStreetMap Integration','AI Design Agent','Plant Database API','DXF Import/Export','IFC Support','SaaS Backend + Benutzer/Rollen'].map(x=><div className="item" key={x}><strong>{x}</strong></div>)}
          </div>
        </div>}

        {tab==='costs'&&<div>
          <h2>Kosten / LV</h2>
          <button className="btn primary" onClick={addCostFromObjects}>Mengen aus Zeichnung übernehmen</button>
          <div className="kpis" style={{marginTop:8}}>
            <div className="kpi"><small>Pflanzen</small><strong>{proCost.plantCosts.toFixed(0)} €</strong></div>
            <div className="kpi"><small>Erdarbeiten</small><strong>{proCost.earthworks.toFixed(0)} €</strong></div>
            <div className="kpi"><small>Bewässerung</small><strong>{proCost.irrigationCost.toFixed(0)} €</strong></div>
            <div className="kpi"><small>Pflaster/Belag</small><strong>{proCost.paving.toFixed(0)} €</strong></div>
            <div className="kpi"><small>Arbeitsstunden</small><strong>{proCost.labor.toFixed(0)} €</strong></div>
            <div className="kpi"><small>Projektkosten</small><strong>{proCost.total.toFixed(0)} €</strong></div>
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
          <span className="pill">V0.12 Pro</span>
          <span className="pill">Modul: {tab.toUpperCase()}</span>
          <span className="pill">Tool: {tool}</span>
          <span className="pill">Layer: {layer}</span>
          <span className="pill">{season}</span>
          <span className="pill">{growthYear===0?'heute':growthYear+' Jahre'}</span>
          <button className={`pill ${view==='2d'?'active':''}`} onClick={()=>setView('2d')}>2D-Plan</button>
          <button className={`pill ${view==='3d'?'active':''}`} onClick={()=>setView('3d')}>3D-Modell</button>
        </div>
        {view==='2d' ? (
          <svg ref={svgRef} className="canvas" viewBox={`${cam.x*SCALE} ${cam.y*SCALE} ${cam.width*SCALE} ${cam.height*SCALE}`} onClick={handleCanvasClick}>
            <Grid/>
            {objects.map(o=><Drawable key={o.id} object={o} selected={selected===o.id} onSelect={(e:any)=>{e.stopPropagation();setSelected(o.id);setStatus(`${o.name} ausgewählt.`)}} />)}
            {draft.map((p,i)=><circle key={i} cx={p.x*SCALE} cy={p.y*SCALE} r={5} fill="#f97316"/>)}
          </svg>
        ) : (
          <ThreeLandscapeView
            objects={objects}
            selected={selected}
            setSelected={setSelected}
            setStatus={setStatus}
            season={season}
            growthYear={growthYear}
            nightMode={nightMode}
            walkMode={walkMode}
          />
        )}
        <div className="status">
          <span>{status}</span>
          <span className="badge">{view==='2d'?'2D':'3D'} · {objects.length} Objekte</span>
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
            <label>Höhe/Tiefe Gelände<input type="number" step=".1" value={Number(selectedObject.attributes.height??selectedObject.elevation)} onChange={e=>updateAttr('height',Number(e.target.value))}/></label>
            <label>Start-Höhe<input type="number" step=".1" value={Number(selectedObject.attributes.startHeight??0)} onChange={e=>updateAttr('startHeight',Number(e.target.value))}/></label>
            <label>End-Höhe<input type="number" step=".1" value={Number(selectedObject.attributes.endHeight??0)} onChange={e=>updateAttr('endHeight',Number(e.target.value))}/></label>
            <label>Erdmasse m³<input type="number" step=".1" value={Number(selectedObject.attributes.earthVolume??0)} onChange={e=>updateAttr('earthVolume',Number(e.target.value))}/></label>
            <label>Kosten €/m³<input type="number" step="1" value={Number(selectedObject.attributes.costPerM3??45)} onChange={e=>updateAttr('costPerM3',Number(e.target.value))}/></label>
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
        {tab==='ai'&&<AiPanel proCost={proCost} projectInfo={projectInfo}/>} 
        {tab==='growth'&&<GrowthPanel objects={objects} plants={plants} growthYear={growthYear}/>} 
        {tab==='chat'&&<ChatPanel optimization={optimization}/>} 
        {tab==='lighting'&&<LightingPanel objects={objects} nightMode={nightMode}/>} 
        {tab==='saas'&&<SaasPanel/>} 
        {tab==='roadmap'&&<RoadmapPanel/>}}
        {tab==='exports'&&<ExportInfo/>}
      </aside>
    </section>
  );
}


function ThreeLandscapeView({
  objects,
  selected,
  setSelected,
  setStatus,
  season,
  growthYear,
  nightMode,
  walkMode
}:{
  objects:CadObject[];
  selected:number|null;
  setSelected:(id:number|null)=>void;
  setStatus:(s:string)=>void;
  season:string;
  growthYear:number;
  nightMode:boolean;
  walkMode:boolean;
}){
  const mountRef=useRef<HTMLDivElement|null>(null);
  const contentRef=useRef<THREE.Group|null>(null);
  const cameraRef=useRef<THREE.PerspectiveCamera|null>(null);
  const raycasterRef=useRef(new THREE.Raycaster());
  const mouseRef=useRef(new THREE.Vector2());

  useEffect(()=>{
    const mount=mountRef.current;
    if(!mount)return;

    const scene=new THREE.Scene();
    scene.background=new THREE.Color(nightMode?0x0f172a:0xdbeafe);

    const camera=new THREE.PerspectiveCamera(55,mount.clientWidth/mount.clientHeight,0.1,1000);
    camera.position.set(walkMode?6:14,walkMode?2.1:13,walkMode?9:18);
    cameraRef.current=camera;

    const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
    renderer.setSize(mount.clientWidth,mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    renderer.shadowMap.enabled=true;
    mount.appendChild(renderer.domElement);

    const controls=new OrbitControls(camera,renderer.domElement);
    controls.enableDamping=true;
    controls.target.set(0,0,0);

    scene.add(new THREE.AmbientLight(nightMode?0x9db4ff:0xffffff,nightMode?.35:.82));
    const sun=new THREE.DirectionalLight(nightMode?0x94a3b8:0xffffff,nightMode?.35:1.25);
    sun.position.set(9,16,10);
    sun.castShadow=true;
    scene.add(sun);

    const grid=new THREE.GridHelper(60,60,0x64748b,0xcbd5e1);
    scene.add(grid);

    const ground=new THREE.Mesh(
      new THREE.PlaneGeometry(60,60),
      new THREE.MeshStandardMaterial({color:0xf8fafc,roughness:.95,metalness:0})
    );
    ground.rotation.x=-Math.PI/2;
    ground.position.y=-0.015;
    ground.receiveShadow=true;
    scene.add(ground);

    const content=new THREE.Group();
    contentRef.current=content;
    scene.add(content);

    const onPointerDown=(event:PointerEvent)=>{
      const rect=renderer.domElement.getBoundingClientRect();
      mouseRef.current.x=((event.clientX-rect.left)/rect.width)*2-1;
      mouseRef.current.y=-((event.clientY-rect.top)/rect.height)*2+1;
      raycasterRef.current.setFromCamera(mouseRef.current,camera);
      const hits=raycasterRef.current.intersectObjects(content.children,true);
      for(const hit of hits){
        let obj:any=hit.object;
        while(obj && !obj.userData?.id)obj=obj.parent;
        if(obj?.userData?.id){
          setSelected(obj.userData.id);
          setStatus(`${obj.userData.name} in 3D ausgewählt.`);
          return;
        }
      }
      setSelected(null);
    };
    renderer.domElement.addEventListener('pointerdown',onPointerDown);

    let frame=0;
    const loop=()=>{
      controls.update();
      renderer.render(scene,camera);
      frame=requestAnimationFrame(loop);
    };
    loop();

    const resize=()=>{
      if(!mountRef.current)return;
      renderer.setSize(mountRef.current.clientWidth,mountRef.current.clientHeight);
      camera.aspect=mountRef.current.clientWidth/mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize',resize);

    return()=>{
      cancelAnimationFrame(frame);
      window.removeEventListener('resize',resize);
      renderer.domElement.removeEventListener('pointerdown',onPointerDown);
      controls.dispose();
      renderer.dispose();
      if(mount.contains(renderer.domElement))mount.removeChild(renderer.domElement);
    };
  },[setSelected,setStatus]);

  useEffect(()=>{
    const content=contentRef.current;
    if(!content)return;
    while(content.children.length)content.remove(content.children[0]);

    objects.forEach((object)=>{
      const mesh=create3DLandscapeObject(object,object.id===selected,season,growthYear);
      content.add(mesh);
    });
  },[objects,selected]);

  return <div ref={mountRef} className="canvas three-canvas"/>;
}

function createTextSprite(text:string){
  const canvas=document.createElement('canvas');
  canvas.width=512;
  canvas.height=128;
  const ctx=canvas.getContext('2d');
  if(ctx){
    ctx.fillStyle='rgba(255,255,255,.90)';
    ctx.fillRect(0,0,512,128);
    ctx.fillStyle='#0f172a';
    ctx.font='bold 32px Arial';
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.fillText(text.slice(0,28),256,64);
  }
  const tex=new THREE.CanvasTexture(canvas);
  const mat=new THREE.SpriteMaterial({map:tex,transparent:true});
  const sprite=new THREE.Sprite(mat);
  sprite.scale.set(2.6,.65,1);
  return sprite;
}

function makeMaterial(color:string,opacity:number){
  return new THREE.MeshStandardMaterial({
    color:new THREE.Color(color),
    transparent:opacity<1,
    opacity,
    roughness:.72,
    metalness:.04
  });
}

function create3DLandscapeObject(object:CadObject, selected:boolean, season:string='Sommer', growthYear:number=0){
  const group=new THREE.Group();
  group.userData={id:object.id,name:object.name};
  const opacity=Math.max(.18,Math.min(1,1-(object.transparency||0)));
  const mat=makeMaterial(object.color,opacity);
  const strokeMat=new THREE.MeshStandardMaterial({color:selected?0xf59e0b:0x0f172a,roughness:.5});
  const elevation=Number(object.attributes.height??object.elevation??0);

  if(object.kind==='rect'){
    const h=Math.max(.06,elevation>0?elevation:.12);
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(Math.max(object.width,.1),h,Math.max(object.height,.1)),mat);
    mesh.position.set(object.x,h/2,object.y);
    mesh.castShadow=true;
    mesh.receiveShadow=true;
    group.add(mesh);

    if(selected){
      const edge=new THREE.Mesh(new THREE.BoxGeometry(Math.max(object.width,.1)+.08,h+.05,Math.max(object.height,.1)+.08),new THREE.MeshBasicMaterial({color:0xf59e0b,wireframe:true}));
      edge.position.copy(mesh.position);
      group.add(edge);
    }
  }

  if(object.kind==='terrainMound'||object.kind==='terrainDepression'||object.kind==='terrainSmooth'){
    const terrainHeight=Number(object.attributes.height??0.5);
    const absHeight=Math.max(.08,Math.abs(terrainHeight));
    const radius=Math.max(object.radius,.2);
    const geo=object.kind==='terrainMound'
      ? new THREE.SphereGeometry(radius,32,16,0,Math.PI*2,0,Math.PI/2)
      : object.kind==='terrainDepression'
        ? new THREE.SphereGeometry(radius,32,16,0,Math.PI*2,Math.PI/2,Math.PI/2)
        : new THREE.SphereGeometry(radius,32,12,0,Math.PI*2,0,Math.PI/2);
    const terrainMat=makeMaterial(object.color,Math.max(.35,opacity));
    const mesh=new THREE.Mesh(geo,terrainMat);
    mesh.scale.y=object.kind==='terrainSmooth'?absHeight*.35:absHeight;
    mesh.position.set(object.x,object.kind==='terrainDepression'?.03:0,object.y);
    mesh.castShadow=true;
    mesh.receiveShadow=true;
    group.add(mesh);
    const base=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,.035,48),makeMaterial(object.color,.22));
    base.position.set(object.x,.018,object.y);
    group.add(base);
  }

  if(object.kind==='terrainSlope'){
    const startH=Number(object.attributes.startHeight??0);
    const endH=Number(object.attributes.endHeight??.8);
    const avgH=Math.max(.06,(Math.abs(startH)+Math.abs(endH))/2);
    const geo=new THREE.BoxGeometry(Math.max(object.width,.1),.12,Math.max(object.height,.1));
    const slopeMesh=new THREE.Mesh(geo,makeMaterial(object.color,opacity));
    slopeMesh.position.set(object.x,avgH/2,object.y);
    slopeMesh.rotation.z=(endH-startH)*0.08;
    slopeMesh.castShadow=true;
    slopeMesh.receiveShadow=true;
    group.add(slopeMesh);
    const arrow=new THREE.Mesh(new THREE.ConeGeometry(.18,.45,18),makeMaterial('#78350f',1));
    arrow.position.set(object.x+object.width*.32,avgH+.25,object.y-object.height*.32);
    arrow.rotation.z=-Math.PI/2;
    group.add(arrow);
  }


  if(object.kind==='circle'){
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(Math.max(object.radius,.1),Math.max(object.radius,.1),.16,48),mat);
    mesh.position.set(object.x,.08,object.y);
    mesh.castShadow=true;
    mesh.receiveShadow=true;
    group.add(mesh);
  }

  if(object.kind==='plant'){
    const finalHeight=Number(object.attributes.finalHeight??object.attributes.year20??object.height);
    const growthFactor=growthYear===0?1:growthYear===3?1.25:growthYear===10?Math.min(2,finalHeight/Math.max(object.height,.1)*.75):Math.min(3,finalHeight/Math.max(object.height,.1));
    const h=Math.max(.35,object.height*growthFactor);
    const r=Math.max(.18,object.radius*(growthYear===0?1:growthYear===3?1.2:growthYear===10?1.65:2.1));
    const leafColor=season==='Herbst'?'#d97706':season==='Winter'?'#94a3b8':season==='Frühling'?'#22c55e':'#16a34a';
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.08,.14,Math.max(.5,h*.35),12),makeMaterial('#7c2d12',1));
    trunk.position.set(object.x,Math.max(.5,h*.35)/2,object.y);
    const crown=new THREE.Mesh(new THREE.SphereGeometry(r,24,16),makeMaterial(leafColor,season==='Winter'?.45:.92));
    crown.position.set(object.x,Math.max(.8,h*.62),object.y);
    const crown2=new THREE.Mesh(new THREE.SphereGeometry(Math.max(.18,r*.65),18,12),makeMaterial(season==='Herbst'?'#f59e0b':'#22c55e',season==='Winter'?.25:.9));
    crown2.position.set(object.x+r*.45,Math.max(.9,h*.72),object.y-r*.25);
    group.add(trunk,crown,crown2);
  }

  if(object.kind==='terrainPoint'){
    const point=new THREE.Mesh(new THREE.ConeGeometry(.18,.45,16),makeMaterial('#7c3aed',1));
    point.position.set(object.x,elevation+.25,object.y);
    group.add(point);
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,Math.max(.1,elevation),8),makeMaterial('#7c3aed',.7));
    pole.position.set(object.x,Math.max(.1,elevation)/2,object.y);
    group.add(pole);
  }

  if(object.kind==='light'){
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,1,10),makeMaterial('#44403c',1));
    pole.position.set(object.x,.5,object.y);
    const lamp=new THREE.Mesh(new THREE.SphereGeometry(.18,16,12),makeMaterial('#f59e0b',1));
    lamp.position.set(object.x,1.1,object.y);
    const glow=new THREE.Mesh(new THREE.SphereGeometry(.8,24,12),makeMaterial('#fde68a',.23));
    glow.position.set(object.x,1.05,object.y);
    group.add(pole,lamp,glow);
  }

  if(object.kind==='line'||object.kind==='polyline'||object.kind==='irrigation'||object.kind==='drainage'){
    const pts=object.points;
    for(let i=0;i<pts.length-1;i++){
      const a=pts[i],b=pts[i+1];
      const length=distance(a,b);
      const thickness=(object.kind==='irrigation'||object.kind==='drainage') ? .08 : .045;
      const tube=new THREE.Mesh(new THREE.CylinderGeometry(thickness,thickness,length,12),mat);
      tube.position.set((a.x+b.x)/2,.08,(a.y+b.y)/2);
      tube.rotation.z=Math.PI/2;
      tube.rotation.y=-Math.atan2(b.y-a.y,b.x-a.x);
      group.add(tube);
    }

    if(object.kind==='polyline'&&pts.length>=3){
      const shape=new THREE.Shape();
      shape.moveTo(pts[0].x,-pts[0].y);
      pts.slice(1).forEach(p=>shape.lineTo(p.x,-p.y));
      shape.lineTo(pts[0].x,-pts[0].y);
      const geo=new THREE.ExtrudeGeometry(shape,{depth:.08,bevelEnabled:false});
      geo.rotateX(-Math.PI/2);
      const surface=new THREE.Mesh(geo,mat);
      surface.position.y=.02;
      surface.receiveShadow=true;
      group.add(surface);
    }
  }

  if(selected){
    const marker=new THREE.Mesh(new THREE.SphereGeometry(.16,16,10),strokeMat);
    marker.position.set(object.x||0,1.6,object.y||0);
    group.add(marker);
  }

  const label=createTextSprite(object.name);
  label.position.set(object.x||object.points?.[0]?.x||0,1.25+(elevation||0),object.y||object.points?.[0]?.y||0);
  group.add(label);

  return group;
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
  if(object.kind==='circle'||object.kind==='plant'||object.kind==='terrainPoint'||object.kind==='terrainMound'||object.kind==='terrainDepression'||object.kind==='terrainSmooth'||object.kind==='light'){
    const r=Math.max(object.radius,.15)*SCALE;
    const isTerrain=['terrainMound','terrainDepression','terrainSmooth'].includes(object.kind);
    return <g onClick={onSelect}>
      <circle cx={object.x*SCALE} cy={object.y*SCALE} r={r} fill={object.color} fillOpacity={1-object.transparency} stroke={stroke} strokeWidth={sw} strokeDasharray={isTerrain?'10 5':''}/>
      {object.kind==='terrainMound'&&<><circle cx={object.x*SCALE} cy={object.y*SCALE} r={r*.65} fill="#bef264" fillOpacity=".45"/><text x={object.x*SCALE} y={object.y*SCALE} fontSize={13} textAnchor="middle" fontWeight="700" fill="#365314" paintOrder="stroke" stroke="#fff" strokeWidth={3}>+{object.attributes.height} m</text></>}
      {object.kind==='terrainDepression'&&<><circle cx={object.x*SCALE} cy={object.y*SCALE} r={r*.65} fill="#bfdbfe" fillOpacity=".55"/><text x={object.x*SCALE} y={object.y*SCALE} fontSize={13} textAnchor="middle" fontWeight="700" fill="#1e3a8a" paintOrder="stroke" stroke="#fff" strokeWidth={3}>{object.attributes.height} m</text></>}
      {object.kind==='terrainSmooth'&&<><circle cx={object.x*SCALE} cy={object.y*SCALE} r={r*.72} fill="#dcfce7" fillOpacity=".5"/><text x={object.x*SCALE} y={object.y*SCALE} fontSize={12} textAnchor="middle" fill="#166534" paintOrder="stroke" stroke="#fff" strokeWidth={3}>glätten</text></>}
      {object.kind==='plant'&&<><circle cx={(object.x+.18)*SCALE} cy={(object.y-.15)*SCALE} r={r*.45} fill="#22c55e" fillOpacity=".85"/><circle cx={(object.x-.16)*SCALE} cy={(object.y+.12)*SCALE} r={r*.35} fill="#15803d" fillOpacity=".85"/></>}
      {object.kind==='terrainPoint'&&<text x={object.x*SCALE} y={(object.y-.25)*SCALE} fontSize={12} textAnchor="middle" fill="#581c87" paintOrder="stroke" stroke="#fff" strokeWidth={3}>H {object.attributes.height??object.elevation}</text>}
      {object.kind==='light'&&<circle cx={object.x*SCALE} cy={object.y*SCALE} r={r*2.2} fill="#fde68a" fillOpacity=".25"/>}
      <text x={object.x*SCALE} y={(object.y+object.radius+.25)*SCALE} fontSize={12} textAnchor="middle" fill="#0f172a" paintOrder="stroke" stroke="#fff" strokeWidth={3}>{object.name}</text>
    </g>
  }
  if(object.kind==='terrainSlope'){
    return <g onClick={onSelect}>
      <rect x={(object.x-object.width/2)*SCALE} y={(object.y-object.height/2)*SCALE} width={object.width*SCALE} height={object.height*SCALE} fill={object.color} fillOpacity={1-object.transparency} stroke={stroke} strokeWidth={sw} strokeDasharray="10 5"/>
      <line x1={(object.x-object.width/2)*SCALE} y1={(object.y+object.height/2)*SCALE} x2={(object.x+object.width/2)*SCALE} y2={(object.y-object.height/2)*SCALE} stroke="#78350f" strokeWidth={3}/>
      <text x={object.x*SCALE} y={object.y*SCALE} fontSize={13} fontWeight="700" textAnchor="middle" fill="#78350f" paintOrder="stroke" stroke="#fff" strokeWidth={3}>{object.attributes.startHeight} → {object.attributes.endHeight} m</text>
    </g>
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
  return <div><h2>Projektmanagement</h2><div className="form"><label>Projekt<input value={projectInfo.name} onChange={e=>setProjectInfo({...projectInfo,name:e.target.value})}/></label><label>Standort<input value={projectInfo.location} onChange={e=>setProjectInfo({...projectInfo,location:e.target.value})}/></label><label>Budget €<input type="number" value={projectInfo.budget} onChange={e=>setProjectInfo({...projectInfo,budget:Number(e.target.value)})}/></label><label>Fläche m²<input type="number" value={projectInfo.area} onChange={e=>setProjectInfo({...projectInfo,area:Number(e.target.value)})}/></label><label>Klima<input value={projectInfo.climate} onChange={e=>setProjectInfo({...projectInfo,climate:e.target.value})}/></label><label>Sonnenstunden<input type="number" value={projectInfo.sunHours} onChange={e=>setProjectInfo({...projectInfo,sunHours:Number(e.target.value)})}/></label></div><h3>Aufgaben</h3><div className="list">{tasks.map((t:any)=><div className="item" key={t.id}><strong>{t.title}</strong><span>{t.status} · {t.owner} · {t.note}</span></div>)}</div><button className="btn primary" style={{marginTop:8}} onClick={()=>setTasks((v:any[])=>[...v,{id:Date.now(),title:'Neue Aufgabe',status:'offen',owner:'',due:'',note:''}])}>Aufgabe hinzufügen</button></div>
}
function PlantDbPanel({plants,setPlants}:any){
  return <div><h2>Pflanzendatenbank</h2><div className="list">{plants.map((p:any)=><div className="item" key={p.id}><strong>{p.german}</strong><span>{p.botanical} · Zone {p.hardinessZone} · {p.type} · {p.bloomTime} · {p.flowerColor} · Pflege {p.maintenance} · {p.price} € · Bio {p.biodiversity}</span></div>)}</div><button className="btn primary" style={{marginTop:8}} onClick={()=>setPlants((v:any[])=>[...v,{id:Date.now(),german:'Neue Pflanze',botanical:'Botanischer Name',family:'',type:'Staude',height:1,width:1,finalHeight:1.5,finalWidth:1.2,sun:'Sonne',soil:'normal',waterNeed:2,hardy:'winterhart',hardinessZone:'6-8',growthRate:'mittel',bloomTime:'Juni',flowerColor:'weiß',pruningTolerance:'gut',maintenance:'niedrig',insectFriendly:true,bee:true,bird:false,co2:3,biodiversity:50,price:5,supplier:''}])}>Pflanze hinzufügen</button></div>
}
function CostPanel({costItems,setCostItems}:any){
  return <div><h2>LV-Positionen</h2><div className="list">{costItems.map((i:any)=><div className="item" key={i.id}><strong>{i.title}</strong><span>{i.quantity} {i.unit} × {i.unitPrice} € + Lohn/Maschine</span></div>)}</div><button className="btn primary" style={{marginTop:8}} onClick={()=>setCostItems((v:any[])=>[...v,{id:Date.now(),title:'Neue LV-Position',category:'Allgemein',quantity:1,unit:'Stk',unitPrice:100,laborHours:1,machineHours:0}])}>Position hinzufügen</button></div>
}
function BimPanel({objects}:any){return <div><h2>BIM-Übersicht</h2><table className="table"><tbody>{objects.slice(0,8).map((o:any)=><tr key={o.id}><td>{o.name}</td><td>{o.layer}</td><td>{o.attributes.bimClass||o.kind}</td></tr>)}</tbody></table></div>}
function GisPanel({objects}:any){const count=objects.filter((o:any)=>o.layer==='GIS'||o.attributes.source==='GeoJSON').length;return <div><h2>GIS-Objekte</h2><div className="kpi"><small>Importierte Geodaten</small><strong>{count}</strong></div></div>}
function LayerPanel({objects}:any){const layers=Array.from(new Set(objects.map((o:any)=>o.layer)));return <div><h2>Layer-System</h2><div className="list">{layers.map((l:any)=><div className="item" key={l}><strong>{l}</strong><span>{objects.filter((o:any)=>o.layer===l).length} Objekt(e)</span></div>)}</div></div>}
function TerrainPanel({objects}:any){
  const pts=objects.filter((o:any)=>o.kind==='terrainPoint');
  const shapes=objects.filter((o:any)=>['terrainMound','terrainDepression','terrainSmooth','terrainSlope'].includes(o.kind));
  return <div>
    <h2>Geländeobjekte</h2>
    <div className="list">
      {shapes.map((s:any)=><div className="item" key={s.id}><strong>{s.name}</strong><span>{s.attributes.terrainType} · Höhe/Tiefe {s.attributes.height??s.attributes.endHeight} m · Erdmasse {s.attributes.earthVolume??0} m³</span></div>)}
      {pts.map((p:any)=><div className="item" key={p.id}><strong>{p.name}</strong><span>X {p.x}, Y {p.y}, H {p.attributes.height??p.elevation} m</span></div>)}
    </div>
  </div>
}
function AnalysisPanel({eco}:any){return <div><h2>Premium-Analyse</h2><p className="small">Digital Twin, KI-Generatives Design, 20 Varianten, Wasser-/Pflege-/Kostenoptimierung sind als nächste Module vorbereitet.</p><div className="hint">Aktueller Score: {eco.score}/100 · CO₂: {eco.co2} kg/Jahr · Regenrückhalt: {eco.rainRetention}/100</div></div>}

function AiPanel({proCost,projectInfo}:any){
  return <div><h2>KI-Ergebnis</h2><div className="kpis"><div className="kpi"><small>Budget</small><strong>{projectInfo.budget.toFixed(0)} €</strong></div><div className="kpi"><small>Schätzung</small><strong>{proCost.total.toFixed(0)} €</strong></div><div className="kpi"><small>Budgetstatus</small><strong>{proCost.total<=projectInfo.budget?'OK':'zu hoch'}</strong></div><div className="kpi"><small>Stil</small><strong>{projectInfo.style}</strong></div></div><div className="hint">Nächster Schritt: echter AI Design Agent mit Varianten, Ranking und Prompt-Historie.</div></div>
}
function GrowthPanel({objects,plants,growthYear}:any){
  const plantObjects=objects.filter((o:any)=>o.kind==='plant'||o.attributes.plantId);
  return <div><h2>Wachstum {growthYear===0?'heute':growthYear+' Jahre'}</h2><div className="list">{plantObjects.slice(0,10).map((o:any)=>{const p=plants.find((p:any)=>p.id===Number(o.attributes.plantId));const h=growthYear===0?(p?.height??o.height):growthYear===3?(p?.height??o.height)*1.25:growthYear===10?(p?.finalHeight??o.height)*.75:(p?.finalHeight??o.height);return <div className="item" key={o.id}><strong>{o.name}</strong><span>Prognosehöhe {Number(h).toFixed(1)} m · Endbreite {p?.finalWidth??'-'} m</span></div>})}</div></div>
}
function ChatPanel({optimization}:any){
  return <div><h2>Optimierungsziele</h2><div className="list">{Object.entries(optimization).map(([k,v])=><div className="item" key={k}><strong>{k}</strong><span>{v?'aktiv':'aus'}</span></div>)}</div></div>
}
function LightingPanel({objects,nightMode}:any){
  const lights=objects.filter((o:any)=>o.kind==='light');
  const lux=lights.reduce((s:any,o:any)=>s+Number(o.attributes.lux??120),0);
  return <div><h2>Licht / Nacht</h2><div className="kpis"><div className="kpi"><small>Leuchten</small><strong>{lights.length}</strong></div><div className="kpi"><small>Lux grob</small><strong>{lux}</strong></div><div className="kpi"><small>Nachtmodus</small><strong>{nightMode?'AN':'AUS'}</strong></div></div></div>
}
function SaasPanel(){
  return <div><h2>Produktpakete</h2><div className="list"><div className="item"><strong>Free</strong><span>2D, einfache Pflanzen, einfache Exporte</span></div><div className="item"><strong>Pro</strong><span>KI-Design, 3D, Kosten, Export, Wachstum</span></div><div className="item"><strong>Enterprise</strong><span>CAD/BIM/GIS, Teams, API, AVA, IFC/DXF</span></div></div></div>
}
function RoadmapPanel(){
  return <div><h2>Technische Architektur</h2><div className="list">{['React','TypeScript','Three.js','PostgreSQL + PostGIS','OpenStreetMap','AI Design Agent','Plant Database API','DXF Import/Export','IFC Support'].map(x=><div className="item" key={x}><strong>{x}</strong></div>)}</div></div>
}

function ExportInfo(){return <div><h2>Schnittstellen</h2><p className="small">Aktiv: JSON, CSV, GeoJSON, .algreen. Nächste technische Module: DXF/DWG, IFC, LandXML, SHP, GAEB, OBJ/FBX/STL, API.</p></div>}
