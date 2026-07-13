'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

type Point = { x:number; y:number };
type ViewMode = '2d'|'3d';
type Tab = 'dashboard'|'chat'|'image'|'cad'|'plants'|'terrain'|'costs'|'gis'|'databases'|'projects'|'admin'|'exports'|'roadmap';
type Tool = 'select'|'rect'|'plant'|'terrainMound'|'terrainDepression'|'terrainSlope'|'irrigation'|'drainage'|'light';
type Role = 'Admin'|'Planer'|'Kunde'|'Bauleitung';

type DesignObject = {
  id:number;
  kind:Tool|'imageZone'|'path'|'pool';
  name:string;
  layer:string;
  x:number;
  y:number;
  width:number;
  depth:number;
  radius:number;
  height:number;
  points:Point[];
  color:string;
  opacity:number;
  attrs:Record<string,any>;
};

type Plant = {
  id:number;
  german:string;
  botanical:string;
  hardinessZone:string;
  waterNeed:number;
  light:string;
  soil:string;
  finalHeight:number;
  finalWidth:number;
  bloomTime:string;
  flowerColor:string;
  maintenance:string;
  insectFriendly:boolean;
  co2:number;
  biodiversity:number;
  price:number;
};

const SCALE=45;

const PLANTS:Plant[]=[
  {id:1,german:'Felsenbirne',botanical:'Amelanchier lamarckii',hardinessZone:'5-8',waterNeed:2,light:'Sonne/Halbschatten',soil:'normal/frisch',finalHeight:6,finalWidth:4.5,bloomTime:'April',flowerColor:'weiß',maintenance:'niedrig',insectFriendly:true,co2:42,biodiversity:88,price:68},
  {id:2,german:'Lavendel',botanical:'Lavandula angustifolia',hardinessZone:'6-9',waterNeed:1,light:'Sonne',soil:'trocken/durchlässig',finalHeight:.65,finalWidth:.55,bloomTime:'Juni-August',flowerColor:'violett',maintenance:'niedrig',insectFriendly:true,co2:2,biodiversity:80,price:4.8},
  {id:3,german:'Salbei',botanical:'Salvia nemorosa',hardinessZone:'5-9',waterNeed:1,light:'Sonne',soil:'trocken/normal',finalHeight:.55,finalWidth:.45,bloomTime:'Juni-September',flowerColor:'blauviolett',maintenance:'niedrig',insectFriendly:true,co2:2,biodiversity:86,price:4.2},
  {id:4,german:'Kornelkirsche',botanical:'Cornus mas',hardinessZone:'5-8',waterNeed:2,light:'Sonne/Halbschatten',soil:'normal/trocken',finalHeight:6,finalWidth:4,bloomTime:'Februar-März',flowerColor:'gelb',maintenance:'niedrig',insectFriendly:true,co2:40,biodiversity:91,price:54},
  {id:5,german:'Hainbuche',botanical:'Carpinus betulus',hardinessZone:'4-8',waterNeed:2,light:'Sonne/Halbschatten/Schatten',soil:'normal',finalHeight:12,finalWidth:7,bloomTime:'April-Mai',flowerColor:'gelblich',maintenance:'mittel',insectFriendly:true,co2:95,biodiversity:82,price:18},
  {id:6,german:'Rosmarin',botanical:'Salvia rosmarinus',hardinessZone:'7-10',waterNeed:1,light:'Sonne',soil:'trocken/durchlässig',finalHeight:1.1,finalWidth:1,bloomTime:'April-Juni',flowerColor:'blau',maintenance:'niedrig',insectFriendly:true,co2:3,biodiversity:74,price:8.5}
];

const DB_MODULES=[
  'Benutzerverwaltung','Login-System','Projektverwaltung','Conversation Memory','Pflanzen-Datenbank',
  'Material-Datenbank','Hersteller-Datenbank','Kosten-Datenbank','Bewässerungs-Datenbank',
  'Wetterdaten-Anbindung','Geocoding','OpenStreetMap','GIS','CAD-Datenmodell',
  'RAG Knowledge Base','Vektordatenbank','Tool Calling','Function Calling','API-System',
  'Mehrsprachigkeit','Rollen/Rechte','Cloud-Speicherung','Team-Kollaboration','Versionierung',
  'Logging','Monitoring','Backup','Zahlungsintegration','SaaS-Abrechnung','Mobile/Tablet','AR/VR'
];

function areaOf(o:DesignObject){if(['plant','terrainMound','terrainDepression'].includes(o.kind))return Math.PI*o.radius*o.radius;return Math.abs(o.width*o.depth)}
function lineLength(points:Point[]){return points.slice(1).reduce((s,p,i)=>s+Math.hypot(p.x-points[i].x,p.y-points[i].y),0)}
function download(name:string,content:string,type:string){const b=new Blob([content],{type});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=name;a.click();URL.revokeObjectURL(u)}
function csv(rows:any[][]){return rows.map(r=>r.map(c=>`"${String(c??'').replaceAll('"','""')}"`).join(';')).join('\n')}

export default function LandscapePlatform(){
  const svgRef=useRef<SVGSVGElement|null>(null);
  const [loggedIn,setLoggedIn]=useState(true);
  const [role,setRole]=useState<Role>('Admin');
  const [tab,setTab]=useState<Tab>('chat');
  const [view,setView]=useState<ViewMode>('2d');
  const [tool,setTool]=useState<Tool>('rect');
  const [selected,setSelected]=useState<number|null>(null);
  const [status,setStatus]=useState('Bereit: V0.13 – Bild hochladen und Gelände automatisch analysieren.');
  const [chat,setChat]=useState('Ich habe zwei Kinder und wenig Zeit. Das Grundstück ist halbschattig in Wien, Budget 5000 Euro.');
  const [memory,setMemory]=useState<string[]>(['User bevorzugt pflegeleichte, visuell starke Gartenkonzepte.']);
  const [project,setProject]=useState({id:1,name:'Neues Grundstück',location:'Wien',budget:5000,area:400,language:'de'});
  const [image,setImage]=useState<{name:string;dataUrl:string;width:number;height:number}|null>(null);
  const [analysis,setAnalysis]=useState('Noch kein Bild analysiert.');
  const [season,setSeason]=useState<'Frühling'|'Sommer'|'Herbst'|'Winter'>('Sommer');
  const [growthYear,setGrowthYear]=useState<0|3|10|20>(0);
  const [nightMode,setNightMode]=useState(false);
  const [walkMode,setWalkMode]=useState(false);
  const [objects,setObjects]=useState<DesignObject[]>([
    {id:1,kind:'rect',name:'Grundstück / Projektfläche',layer:'Bestand',x:0,y:0,width:20,depth:20,radius:0,height:.05,points:[],color:'#dcfce7',opacity:.55,attrs:{source:'MVP',bim:'Site'}},
    {id:2,kind:'rect',name:'Terrasse / Belag',layer:'Belag',x:-4,y:4,width:5,depth:3,radius:0,height:.12,points:[],color:'#a8a29e',opacity:.86,attrs:{unitPrice:115,material:'Naturstein'}},
    {id:3,kind:'plant',name:'Felsenbirne',layer:'Pflanzen',x:4,y:-2,width:0,depth:0,radius:1.1,height:2.2,points:[],color:'#16a34a',opacity:.9,attrs:{plantId:1,finalHeight:6,finalWidth:4.5}}
  ]);

  const selectedObject=objects.find(o=>o.id===selected)||null;

  const costs=useMemo(()=>{
    const plant=objects.filter(o=>o.kind==='plant').reduce((s,o)=>s+(PLANTS.find(p=>p.id===Number(o.attrs.plantId))?.price??25),0);
    const paving=objects.filter(o=>o.layer==='Belag').reduce((s,o)=>s+areaOf(o)*Number(o.attrs.unitPrice??85),0);
    const earth=objects.filter(o=>['terrainMound','terrainDepression','terrainSlope'].includes(o.kind)).reduce((s,o)=>s+Number(o.attrs.earthVolume??areaOf(o)*Math.abs(o.height)*.45)*Number(o.attrs.costPerM3??45),0);
    const water=objects.filter(o=>o.kind==='irrigation').reduce((s,o)=>s+lineLength(o.points)*9+180,0);
    const light=objects.filter(o=>o.kind==='light').length*185;
    const labor=(plant+paving+earth+water+light)*.28;
    return{plant,paving,earth,water,light,labor,total:plant+paving+earth+water+light+labor}
  },[objects]);

  const eco=useMemo(()=>{
    const plantObjects=objects.filter(o=>o.kind==='plant');
    const pData=plantObjects.map(o=>PLANTS.find(p=>p.id===Number(o.attrs.plantId))).filter(Boolean) as Plant[];
    const biodiversity=pData.length?pData.reduce((s,p)=>s+p.biodiversity,0)/pData.length:42;
    const co2=pData.reduce((s,p)=>s+p.co2,0);
    const hard=objects.filter(o=>o.layer==='Belag').reduce((s,o)=>s+areaOf(o),0);
    const green=objects.filter(o=>o.layer==='Pflanzen'||o.name.toLowerCase().includes('rasen')).reduce((s,o)=>s+Math.max(1,areaOf(o)),0);
    const sealed=Math.min(100,Math.round(hard/Math.max(1,hard+green)*100));
    const rain=Math.max(0,Math.min(100,100-sealed+objects.filter(o=>o.kind==='drainage').length*12));
    const heat=Math.max(0,Math.min(100,green*2+plantObjects.length*4));
    return{biodiversity:Math.round(biodiversity),co2:Math.round(co2),sealed,rain,heat,score:Math.round((biodiversity+rain+heat+(100-sealed))/4)}
  },[objects]);

  function pointFromEvent(e:React.MouseEvent<SVGSVGElement>):Point{
    const rect=svgRef.current?.getBoundingClientRect();
    if(!rect)return{x:0,y:0};
    const cam={x:-12,y:-8,width:28,height:18};
    const x=cam.x+((e.clientX-rect.left)/rect.width)*cam.width;
    const y=cam.y+((e.clientY-rect.top)/rect.height)*cam.height;
    return{x:Math.round(x*2)/2,y:Math.round(y*2)/2}
  }

  function addObject(kind:Tool,x:number,y:number,extra:Partial<DesignObject>={}){
    const id=Date.now()+Math.floor(Math.random()*999);
    const base={id,kind,name:'Objekt',layer:'Entwurf',x,y,width:3,depth:2,radius:1,height:.1,points:[] as Point[],color:'#a7f3d0',opacity:.82,attrs:{} as Record<string,any>,...extra};
    setObjects(v=>[...v,base as DesignObject]);
    setSelected(id);
  }

  function handleCanvas(e:React.MouseEvent<SVGSVGElement>){
    if(tool==='select')return;
    const p=pointFromEvent(e);
    if(tool==='rect')addObject(tool,p.x,p.y,{name:'Fläche / Zone',layer:'Entwurf',color:'#a7f3d0'});
    if(tool==='plant')addObject(tool,p.x,p.y,{name:'Pflanze automatisch',layer:'Pflanzen',radius:.7,height:1.2,color:'#16a34a',attrs:{plantId:1,finalHeight:6}});
    if(tool==='terrainMound')addObject(tool,p.x,p.y,{name:'Erhebung',layer:'Gelände',radius:1.8,height:.8,color:'#a3e635',opacity:.68,attrs:{earthVolume:3.5,costPerM3:45}});
    if(tool==='terrainDepression')addObject(tool,p.x,p.y,{name:'Mulde / Senke',layer:'Gelände',radius:1.7,height:-.55,color:'#60a5fa',opacity:.55,attrs:{earthVolume:2.8,costPerM3:48}});
    if(tool==='terrainSlope')addObject(tool,p.x,p.y,{name:'Böschung / Rampe',layer:'Gelände',width:4,depth:2,height:.9,color:'#d9a441',attrs:{earthVolume:3.6,costPerM3:46}});
    if(tool==='irrigation')addObject(tool,p.x,p.y,{name:'Tropfleitung',layer:'Bewässerung',points:[p,{x:p.x+4,y:p.y}],color:'#2563eb',attrs:{pressure:2.2}});
    if(tool==='drainage')addObject(tool,p.x,p.y,{name:'Drainage / Retention',layer:'Regenwasser',points:[p,{x:p.x+3,y:p.y+1}],color:'#0f766e',attrs:{retentionM3:1.5}});
    if(tool==='light')addObject(tool,p.x,p.y,{name:'Leuchte',layer:'Licht',radius:.3,height:.8,color:'#f59e0b',attrs:{lux:120}});
  }

  function uploadImage(file:File|null){
    if(!file)return;
    const reader=new FileReader();
    reader.onload=()=>{
      const dataUrl=String(reader.result);
      const img=new Image();
      img.onload=()=>setImage({name:file.name,dataUrl,width:img.width,height:img.height});
      img.src=dataUrl;
      setStatus('Bild hochgeladen. Jetzt „KI-Bild analysieren“ klicken.');
    };
    reader.readAsDataURL(file);
  }

  function analyzeUploadedImage(){
    if(!image){setStatus('Bitte zuerst ein Bild hochladen.');return}
    const img=new Image();
    img.onload=()=>{
      const canvas=document.createElement('canvas');
      const size=120;
      canvas.width=size;
      canvas.height=size;
      const ctx=canvas.getContext('2d');
      if(!ctx)return;
      ctx.drawImage(img,0,0,size,size);
      const data=ctx.getImageData(0,0,size,size).data;
      const zones:DesignObject[]=[];
      let bright=0,dark=0,green=0,blue=0,edge=0;
      const cell=20;
      let idBase=Date.now();
      for(let y=0;y<size;y+=cell){
        for(let x=0;x<size;x+=cell){
          let r=0,g=0,b=0,count=0;
          for(let yy=y;yy<y+cell;yy+=4){
            for(let xx=x;xx<x+cell;xx+=4){
              const idx=(yy*size+xx)*4;
              r+=data[idx];g+=data[idx+1];b+=data[idx+2];count++;
            }
          }
          r/=count;g/=count;b/=count;
          const brightness=(r+g+b)/3;
          const wx=(x/size)*20-10+cell/size*10;
          const wy=(y/size)*14-7+cell/size*7;
          if(g>r*1.12 && g>b*1.05){
            green++;
            zones.push({id:idBase++,kind:'imageZone',name:'Bildanalyse: Vegetationszone',layer:'KI-Bildanalyse',x:wx,y:wy,width:3,depth:2.1,radius:0,height:.04,points:[],color:'#86efac',opacity:.46,attrs:{source:'imageAI',type:'vegetation',recommendation:'Pflanzzone erhalten/ergänzen'}});
          }else if(b>r*1.08 && b>g*1.02){
            blue++;
            zones.push({id:idBase++,kind:'terrainDepression',name:'Bildanalyse: feuchter/dunkler Bereich',layer:'Gelände/Regenwasser',x:wx,y:wy,width:0,depth:0,radius:1.25,height:-.35,points:[],color:'#60a5fa',opacity:.5,attrs:{source:'imageAI',type:'water/dark',earthVolume:1.6,costPerM3:48,retentionM3:1.0}});
          }else if(brightness>178){
            bright++;
            zones.push({id:idBase++,kind:'rect',name:'Bildanalyse: helle/trockene Fläche',layer:'Belag/Trockenbereich',x:wx,y:wy,width:2.4,depth:1.7,radius:0,height:.08,points:[],color:'#d8b36a',opacity:.55,attrs:{source:'imageAI',type:'dry/bright',recommendation:'Kies, Pflaster oder trockenheitsresistente Pflanzung'}});
          }else if(brightness<72){
            dark++;
            zones.push({id:idBase++,kind:'terrainDepression',name:'Bildanalyse: Senke/Schatten',layer:'Gelände',x:wx,y:wy,width:0,depth:0,radius:1.1,height:-.25,points:[],color:'#93c5fd',opacity:.42,attrs:{source:'imageAI',type:'shadow/depression',earthVolume:1.1,costPerM3:48}});
          }else if(r>g*1.05 && r>b*1.05){
            edge++;
            zones.push({id:idBase++,kind:'terrainMound',name:'Bildanalyse: Erhebung/Strukturkante',layer:'Gelände',x:wx,y:wy,width:0,depth:0,radius:1.1,height:.35,points:[],color:'#a3e635',opacity:.5,attrs:{source:'imageAI',type:'edge/mound',earthVolume:1.4,costPerM3:45}});
          }
        }
      }

      // Add generated planning objects based on analysis
      if(green<6){
        const goodPlants=PLANTS.filter(p=>p.waterNeed<=2&&p.maintenance==='niedrig').slice(0,4);
        goodPlants.forEach((p,i)=>zones.push({id:idBase++,kind:'plant',name:`KI-Pflanze: ${p.german}`,layer:'Pflanzen',x:-5+i*2,y:-4,width:0,depth:0,radius:Math.max(.25,p.finalWidth/5),height:Math.min(2.2,p.finalHeight*.35),points:[],color:'#16a34a',opacity:.9,attrs:{source:'imageAI',plantId:p.id,reason:'Vegetation ergänzen',finalHeight:p.finalHeight,finalWidth:p.finalWidth}}));
      }
      if(blue+dark>3){
        zones.push({id:idBase++,kind:'drainage',name:'KI-Drainage aus Bildanalyse',layer:'Regenwasser',x:0,y:0,width:0,depth:0,radius:0,height:0,points:[{x:3,y:-4},{x:6,y:-2}],color:'#0f766e',opacity:1,attrs:{source:'imageAI',retentionM3:2.2,recommendation:'Entwässerung/Versickerung prüfen'}});
      }
      if(bright>4){
        zones.push({id:idBase++,kind:'irrigation',name:'KI-Tropfbewässerung für trockene Zonen',layer:'Bewässerung',x:0,y:0,width:0,depth:0,radius:0,height:0,points:[{x:-5,y:-5},{x:0,y:-4.2},{x:5,y:-3.5}],color:'#2563eb',opacity:1,attrs:{source:'imageAI',pressure:2.1,waterSaving:true}});
      }

      setObjects(v=>[...v,...zones]);
      setAnalysis(`Bildanalyse erzeugt ${zones.length} Objekte. Grün: ${green}, hell/trocken: ${bright}, dunkel/feucht: ${dark}, blau: ${blue}, Kanten/Erhebungen: ${edge}.`);
      setStatus(`KI-Bildanalyse fertig: ${zones.length} Gelände-/Planungsobjekte erzeugt.`);
    };
    img.src=image.dataUrl;
  }

  function generateFromChat(){
    const text=chat.toLowerCase();
    const base=Date.now();
    const kids=text.includes('kinder')||text.includes('spiel');
    const lowCare=text.includes('wenig zeit')||text.includes('pflegeleicht');
    const mediterran=text.includes('mediterran')||text.includes('pool')||text.includes('lavendel');
    const bio=text.includes('biodivers')||text.includes('bienen')||text.includes('insekten');
    const objs:DesignObject[]=[
      {id:base+1,kind:'rect',name:kids?'robuste Rasen-/Spielfläche':'KI Hauptfläche',layer:kids?'Spiel/Rasen':'Entwurf',x:-2,y:0,width:8,depth:5,radius:0,height:.05,points:[],color:kids?'#86efac':'#dcfce7',opacity:.62,attrs:{source:'KI-Chat',kids,lowCare}},
      {id:base+2,kind:'rect',name:mediterran?'mediterraner Naturstein-Sitzplatz':'Sitzplatz',layer:'Belag',x:-5,y:3.4,width:4.6,depth:2.6,radius:0,height:.12,points:[],color:'#d6d3d1',opacity:.88,attrs:{source:'KI-Chat',unitPrice:115}},
      {id:base+3,kind:'irrigation',name:'KI-Tropfbewässerung',layer:'Bewässerung',x:0,y:0,width:0,depth:0,radius:0,height:0,points:[{x:-4,y:-3.8},{x:0,y:-3.8},{x:4.5,y:-2.8}],color:'#2563eb',opacity:1,attrs:{source:'KI-Chat',pressure:2.1}},
      {id:base+4,kind:'light',name:'KI-Akzentlicht',layer:'Licht',x:-4.8,y:2.3,width:0,depth:0,radius:.3,height:.8,points:[],color:'#f59e0b',opacity:.9,attrs:{source:'KI-Chat',lux:180}}
    ];
    const chosen=PLANTS.filter(p=>(lowCare?p.maintenance==='niedrig':True as any)).filter(p=>(bio?p.insectFriendly:true)).slice(0,4);
    chosen.forEach((p,pi)=>{
      const count=pi===0?2:6;
      for(let i=0;i<count;i++){
        objs.push({id:base+100+pi*20+i,kind:'plant',name:p.german,layer:'Pflanzen',x:-1+pi*1.2+(i%4)*.45,y:-3.2+Math.floor(i/4)*.5,width:0,depth:0,radius:Math.max(.18,p.finalWidth/6),height:Math.min(1.8,p.finalHeight*.3),points:[],color:p.waterNeed<=1?'#65a30d':'#16a34a',opacity:.9,attrs:{source:'KI-Chat',plantId:p.id,finalHeight:p.finalHeight,finalWidth:p.finalWidth,reason:`${p.light}, ${p.soil}`}})
      }
    });
    setObjects(v=>[...v,...objs]);
    setMemory(v=>[...v,`Chat: ${chat.slice(0,120)} → ${objs.length} Objekte erzeugt.`]);
    setStatus(`KI-Chat hat ${objs.length} Objekte eigenständig erzeugt.`);
  }

  function exportProject(){download('al-green-design-v013-image-ai.algreen',JSON.stringify({project,objects,memory,imageAnalysis:analysis},null,2),'application/json')}
  function exportCsv(){download('kosten-v013.csv',csv([['Bereich','Kosten'],['Pflanzen',costs.plant],['Beläge',costs.paving],['Erdarbeiten',costs.earth],['Bewässerung',costs.water],['Licht',costs.light],['Lohn',costs.labor],['Gesamt',costs.total]]),'text/csv;charset=utf-8')}
  async function exportPdf(){
    const { jsPDF } = await import('jspdf');
    const pdf=new jsPDF();
    pdf.text('AL Green Design V0.13 – Projektbericht',10,15);
    pdf.text(`Projekt: ${project.name}`,10,25);
    pdf.text(`Kosten: ${costs.total.toFixed(0)} EUR`,10,35);
    pdf.text(`Öko-Score: ${eco.score}/100`,10,45);
    pdf.text(`Bildanalyse: ${analysis.slice(0,90)}`,10,55);
    pdf.save('al-green-design-bericht-v013.pdf');
  }
  function exportGeoJson(){
    const features=objects.map(o=>({type:'Feature',properties:{id:o.id,name:o.name,layer:o.layer,kind:o.kind,...o.attrs},geometry:o.points.length?{type:'LineString',coordinates:o.points.map(p=>[p.x,p.y])}:{type:'Point',coordinates:[o.x,o.y]}}));
    download('al-green-design-v013.geojson',JSON.stringify({type:'FeatureCollection',features},null,2),'application/geo+json');
  }

  if(!loggedIn){
    return <section className="platform"><aside className="panel"><h2>Login</h2><div className="form"><label>E-Mail<input defaultValue="demo@algreen.local"/></label><label>Passwort<input type="password" defaultValue="demo"/></label></div><button className="btn primary" style={{marginTop:8}} onClick={()=>setLoggedIn(true)}>Einloggen</button></aside></section>
  }

  const tabs:[Tab,string][]=[
    ['dashboard','Dashboard'],['chat','KI-Chat'],['image','Bild/KI-Gelände'],['cad','2D/CAD'],['plants','Pflanzen'],['terrain','Gelände'],['costs','Kosten'],['gis','OSM/GIS'],['databases','Datenbanken'],['projects','Projekte'],['admin','Admin/Rollen'],['exports','Export'],['roadmap','Roadmap']
  ];

  return <section className="platform">
    <aside className="panel">
      <h2>Module</h2>
      <div className="grid2">{tabs.map(([id,label])=><button key={id} className={`tab ${tab===id?'active':''}`} onClick={()=>setTab(id)}>{label}</button>)}</div>
      <hr/>

      {tab==='chat'&&<>
        <h2>KI-Garten-Chat</h2>
        <textarea className="full" value={chat} onChange={e=>setChat(e.target.value)} />
        <button className="btn primary" style={{marginTop:8}} onClick={generateFromChat}>Chat generiert Garten</button>
        <div className="hint">Der Chat erzeugt echte Objekte: Pflanzen, Wege, Licht, Bewässerung, Spielbereiche, Beläge und Kostenlogik.</div>
      </>}

      {tab==='image'&&<>
        <h2>Bild-Upload + KI-Gelände</h2>
        <label className="file">Bild hochladen<input type="file" accept="image/*" onChange={e=>uploadImage(e.target.files?.[0]??null)}/></label>
        <button className="btn primary" style={{marginTop:8}} onClick={analyzeUploadedImage}>KI-Bild analysieren und Gelände erzeugen</button>
        <div className="hint">{analysis}</div>
        <div className="preview">{image?<img src={image.dataUrl} alt="Upload"/>:<span className="small">Noch kein Bild geladen</span>}</div>
      </>}

      {tab==='cad'&&<>
        <h2>Werkzeuge</h2>
        <div className="grid2">{(['select','rect','plant','terrainMound','terrainDepression','terrainSlope','irrigation','drainage','light'] as Tool[]).map(t=><button key={t} className={`tool ${tool===t?'active':''}`} onClick={()=>setTool(t)}>{t}</button>)}</div>
        <div className="hint">Werkzeug wählen und in den 2D-Plan klicken.</div>
      </>}

      {tab==='plants'&&<>
        <h2>Intelligente Pflanzdatenbank</h2>
        <div className="list">{PLANTS.map(p=><div className="item" key={p.id}><strong>{p.german}</strong><span>{p.botanical} · Zone {p.hardinessZone} · {p.light} · Wasser {p.waterNeed}/5 · Endgröße {p.finalHeight}×{p.finalWidth} m · {p.bloomTime} {p.flowerColor} · CO₂ {p.co2} · Bio {p.biodiversity}</span></div>)}</div>
      </>}

      {tab==='dashboard'&&<ModuleOverview costs={costs} eco={eco} role={role}/>}
      {tab==='terrain'&&<Info text="Geländemodellierung: Erhebungen, Mulden, Böschungen, Erdbewegung, Volumen und 3D-Geländekörper."/>}
      {tab==='costs'&&<CostsPanel costs={costs}/>}
      {tab==='gis'&&<Info text="OSM/GIS: Geocoding, Standortanalyse, OpenStreetMap, Satellitenbilder und PostGIS sind als API-Module vorbereitet. GeoJSON Export ist aktiv."/>}
      {tab==='databases'&&<DatabasePanel/>}
      {tab==='projects'&&<ProjectPanel project={project} setProject={setProject}/>}
      {tab==='admin'&&<AdminPanel role={role} setRole={setRole} setLoggedIn={setLoggedIn}/>}
      {tab==='exports'&&<div><h2>Export</h2><div className="grid2"><button className="btn blue" onClick={exportProject}>Projekt JSON</button><button className="btn" onClick={exportCsv}>Excel/CSV</button><button className="btn" onClick={exportPdf}>PDF</button><button className="btn" onClick={exportGeoJson}>GeoJSON</button></div><div className="hint">DXF/DWG/IFC sind als Roadmap-Modul vorgesehen. DWG braucht Backend/Converter.</div></div>}
      {tab==='roadmap'&&<Roadmap/>}
    </aside>

    <div className="workspace">
      <div className="topbar">
        <span className="pill">V0.13 IMAGE AI</span>
        <span className="pill">{tab.toUpperCase()}</span>
        <span className="pill">{role}</span>
        <span className="pill">{season}</span>
        <span className="pill">{growthYear===0?'heute':growthYear+' Jahre'}</span>
        <button className={`pill ${view==='2d'?'active':''}`} onClick={()=>setView('2d')}>2D</button>
        <button className={`pill ${view==='3d'?'active':''}`} onClick={()=>setView('3d')}>3D</button>
      </div>
      {view==='2d'?<svg ref={svgRef} className="canvas" viewBox={`${-12*SCALE} ${-8*SCALE} ${28*SCALE} ${18*SCALE}`} onClick={handleCanvas}>
        <Grid/>
        {image&&<image href={image.dataUrl} x={-10*SCALE} y={-7*SCALE} width={20*SCALE} height={14*SCALE} opacity=".35" preserveAspectRatio="none"/>}
        {objects.map(o=><Object2D key={o.id} o={o} selected={selected===o.id} onSelect={(e:any)=>{e.stopPropagation();setSelected(o.id);setStatus(o.name+' ausgewählt.')}} />)}
      </svg>:<ThreeView objects={objects} image={image} selected={selected} season={season} growthYear={growthYear} nightMode={nightMode} walkMode={walkMode}/>}
      <div className="status"><span>{status}</span><span>{objects.length} Objekte · {view}</span></div>
    </div>

    <aside className="panel">
      <h2>Projekt-Kennzahlen</h2>
      <div className="kpis">
        <div className="kpi"><small>Projektkosten</small><strong>{costs.total.toFixed(0)} €</strong></div>
        <div className="kpi"><small>Objekte</small><strong>{objects.length}</strong></div>
        <div className="kpi"><small>Öko-Score</small><strong>{eco.score}/100</strong></div>
        <div className="kpi"><small>CO₂</small><strong>{eco.co2} kg</strong></div>
      </div>
      <hr/>
      <h2>Objekt / BIM</h2>
      {!selectedObject&&<p>Objekt anklicken, um Attribute zu bearbeiten.</p>}
      {selectedObject&&<ObjectEditor o={selectedObject} setObjects={setObjects} setSelected={setSelected}/>}
      <hr/>
      <h2>Conversation Memory</h2>
      <div className="list">{memory.map((m,i)=><div className="item" key={i}><span>{m}</span></div>)}</div>
    </aside>
  </section>
}

function Grid(){
  const lines=[];
  for(let x=-100;x<=100;x+=.5)lines.push(<line key={'v'+x} x1={x*SCALE} y1={-100*SCALE} x2={x*SCALE} y2={100*SCALE} stroke={x%1===0?'#cbd5e1':'#e2e8f0'} strokeWidth={x%1===0?1:.6}/>);
  for(let y=-100;y<=100;y+=.5)lines.push(<line key={'h'+y} x1={-100*SCALE} y1={y*SCALE} x2={100*SCALE} y2={y*SCALE} stroke={y%1===0?'#cbd5e1':'#e2e8f0'} strokeWidth={y%1===0?1:.6}/>);
  return <g>{lines}<line x1={-100*SCALE} y1={0} x2={100*SCALE} y2={0} stroke="#94a3b8" strokeWidth={2}/><line x1={0} y1={-100*SCALE} x2={0} y2={100*SCALE} stroke="#94a3b8" strokeWidth={2}/></g>
}

function Object2D({o,selected,onSelect}:{o:DesignObject;selected:boolean;onSelect:any}){
  const stroke=selected?'#f59e0b':'#0f172a', sw=selected?4:2;
  if(o.points.length>1)return <g onClick={onSelect}><polyline points={o.points.map(p=>`${p.x*SCALE},${p.y*SCALE}`).join(' ')} fill="none" stroke={o.color} strokeWidth={sw+1} strokeDasharray={o.kind==='drainage'?'6 5':''}/><text x={o.points[0].x*SCALE} y={(o.points[0].y-.2)*SCALE} fontSize={12} paintOrder="stroke" stroke="#fff" strokeWidth={3}>{o.name}</text></g>;
  if(o.kind==='rect'||o.kind==='imageZone'||o.kind==='pool'||o.kind==='terrainSlope')return <g onClick={onSelect}><rect x={(o.x-o.width/2)*SCALE} y={(o.y-o.depth/2)*SCALE} width={o.width*SCALE} height={o.depth*SCALE} fill={o.color} fillOpacity={o.opacity} stroke={stroke} strokeWidth={sw} strokeDasharray={o.kind.startsWith('terrain')?'8 5':''}/><text x={o.x*SCALE} y={o.y*SCALE} fontSize={12} textAnchor="middle" fontWeight="700" paintOrder="stroke" stroke="#fff" strokeWidth={3}>{o.name}</text></g>;
  return <g onClick={onSelect}><circle cx={o.x*SCALE} cy={o.y*SCALE} r={Math.max(o.radius,.18)*SCALE} fill={o.color} fillOpacity={o.opacity} stroke={stroke} strokeWidth={sw} strokeDasharray={o.kind.startsWith('terrain')?'8 5':''}/><text x={o.x*SCALE} y={(o.y+Math.max(o.radius,.3)+.25)*SCALE} fontSize={12} textAnchor="middle" paintOrder="stroke" stroke="#fff" strokeWidth={3}>{o.name}</text></g>
}

function ThreeView({objects,image,selected,season,growthYear,nightMode,walkMode}:{objects:DesignObject[];image:any;selected:number|null;season:string;growthYear:number;nightMode:boolean;walkMode:boolean}){
  const mountRef=useRef<HTMLDivElement|null>(null), groupRef=useRef<THREE.Group|null>(null), bgRef=useRef<THREE.Group|null>(null);
  useEffect(()=>{
    const mount=mountRef.current;if(!mount)return;
    const scene=new THREE.Scene();scene.background=new THREE.Color(nightMode?0x0f172a:0xdbeafe);
    const camera=new THREE.PerspectiveCamera(55,mount.clientWidth/mount.clientHeight,.1,1000);camera.position.set(walkMode?6:14,walkMode?2.1:13,walkMode?9:18);
    const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(mount.clientWidth,mount.clientHeight);renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));mount.appendChild(renderer.domElement);
    const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.target.set(0,0,0);
    scene.add(new THREE.AmbientLight(nightMode?0x9db4ff:0xffffff,nightMode?.35:.82));
    const sun=new THREE.DirectionalLight(nightMode?0x94a3b8:0xffffff,nightMode?.35:1.25);sun.position.set(9,16,10);scene.add(sun);
    scene.add(new THREE.GridHelper(60,60,0x64748b,0xcbd5e1));
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(60,60),new THREE.MeshStandardMaterial({color:nightMode?0x1e293b:0xf8fafc,roughness:.95}));ground.rotation.x=-Math.PI/2;scene.add(ground);
    const bg=new THREE.Group();bgRef.current=bg;scene.add(bg);
    const group=new THREE.Group();groupRef.current=group;scene.add(group);
    let frame=0;const loop=()=>{controls.update();renderer.render(scene,camera);frame=requestAnimationFrame(loop)};loop();
    const resize=()=>{renderer.setSize(mount.clientWidth,mount.clientHeight);camera.aspect=mount.clientWidth/mount.clientHeight;camera.updateProjectionMatrix()};window.addEventListener('resize',resize);
    return()=>{cancelAnimationFrame(frame);window.removeEventListener('resize',resize);controls.dispose();renderer.dispose();if(mount.contains(renderer.domElement))mount.removeChild(renderer.domElement)}
  },[nightMode,walkMode]);
  useEffect(()=>{const g=groupRef.current;if(!g)return;while(g.children.length)g.remove(g.children[0]);objects.forEach(o=>g.add(make3D(o,selected===o.id,season,growthYear)))},[objects,selected,season,growthYear]);
  useEffect(()=>{const g=bgRef.current;if(!g)return;while(g.children.length)g.remove(g.children[0]);if(!image)return;new THREE.TextureLoader().load(image.dataUrl,tex=>{tex.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(20,14),new THREE.MeshBasicMaterial({map:tex,transparent:true,opacity:.38,side:THREE.DoubleSide}));m.rotation.x=-Math.PI/2;m.position.y=.015;g.add(m)})},[image]);
  return <div ref={mountRef} className="three"/>
}

function mat(color:string,opacity=1){return new THREE.MeshStandardMaterial({color:new THREE.Color(color),transparent:opacity<1,opacity,roughness:.72})}
function make3D(o:DesignObject,selected:boolean,season:string,growthYear:number){
  const g=new THREE.Group();
  if(o.kind==='rect'||o.kind==='imageZone'||o.kind==='pool'){
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(Math.max(o.width,.1),Math.max(o.height,.06),Math.max(o.depth,.1)),mat(o.color,o.opacity));mesh.position.set(o.x,Math.max(o.height,.06)/2,o.y);g.add(mesh);
  }else if(o.kind==='plant'){
    const p=PLANTS.find(p=>p.id===Number(o.attrs.plantId));const finalH=p?.finalHeight??o.attrs.finalHeight??o.height;const factor=growthYear===0?1:growthYear===3?1.25:growthYear===10?1.75:2.35;const h=Math.max(.35,Math.min(finalH,o.height*factor));const r=Math.max(.22,o.radius*(growthYear===0?1:growthYear===3?1.2:growthYear===10?1.65:2.1));const leaf=season==='Herbst'?'#d97706':season==='Winter'?'#94a3b8':season==='Frühling'?'#22c55e':'#16a34a';const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.08,.14,Math.max(.5,h*.35),12),mat('#7c2d12'));trunk.position.set(o.x,Math.max(.5,h*.35)/2,o.y);const crown=new THREE.Mesh(new THREE.SphereGeometry(r,24,16),mat(leaf,season==='Winter'?.45:.9));crown.position.set(o.x,h*.65,o.y);g.add(trunk,crown);
  }else if(o.kind==='terrainMound'||o.kind==='terrainDepression'){
    const geo=new THREE.SphereGeometry(Math.max(o.radius,.2),32,16,0,Math.PI*2,o.kind==='terrainDepression'?Math.PI/2:0,Math.PI/2);const mesh=new THREE.Mesh(geo,mat(o.color,o.opacity));mesh.scale.y=Math.max(.1,Math.abs(o.height));mesh.position.set(o.x,o.kind==='terrainDepression'?.02:0,o.y);g.add(mesh);
  }else if(o.kind==='terrainSlope'){
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(Math.max(o.width,.1),.18,Math.max(o.depth,.1)),mat(o.color,o.opacity));mesh.position.set(o.x,Math.max(.1,o.height)/2,o.y);mesh.rotation.z=o.height*.08;g.add(mesh);
  }else if(o.points.length>1){
    for(let i=0;i<o.points.length-1;i++){const a=o.points[i],b=o.points[i+1],len=Math.hypot(b.x-a.x,b.y-a.y);const tube=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,len,12),mat(o.color));tube.position.set((a.x+b.x)/2,.09,(a.y+b.y)/2);tube.rotation.z=Math.PI/2;tube.rotation.y=-Math.atan2(b.y-a.y,b.x-a.x);g.add(tube)}
  }else{
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(Math.max(o.radius,.18),Math.max(o.radius,.18),Math.max(o.height,.1),24),mat(o.color,o.opacity));mesh.position.set(o.x,Math.max(o.height,.1)/2,o.y);g.add(mesh);
  }
  if(selected){const marker=new THREE.Mesh(new THREE.SphereGeometry(.18,16,12),mat('#f59e0b'));marker.position.set(o.x||0,1.5,o.y||0);g.add(marker)}
  return g;
}

function ObjectEditor({o,setObjects,setSelected}:any){
  const update=(patch:any)=>setObjects((v:DesignObject[])=>v.map(x=>x.id===o.id?{...x,...patch}:x));
  const attr=(k:string,v:any)=>setObjects((old:DesignObject[])=>old.map(x=>x.id===o.id?{...x,attrs:{...x.attrs,[k]:v}}:x));
  return <div className="form"><label>Name<input value={o.name} onChange={e=>update({name:e.target.value})}/></label><label>Layer<input value={o.layer} onChange={e=>update({layer:e.target.value})}/></label><label>Breite<input type="number" step=".1" value={o.width} onChange={e=>update({width:Number(e.target.value)})}/></label><label>Tiefe<input type="number" step=".1" value={o.depth} onChange={e=>update({depth:Number(e.target.value)})}/></label><label>Radius<input type="number" step=".1" value={o.radius} onChange={e=>update({radius:Number(e.target.value)})}/></label><label>Höhe<input type="number" step=".1" value={o.height} onChange={e=>update({height:Number(e.target.value)})}/></label><label>Erdmasse<input type="number" step=".1" value={Number(o.attrs.earthVolume??0)} onChange={e=>attr('earthVolume',Number(e.target.value))}/></label><label>Kosten €/m³<input type="number" step="1" value={Number(o.attrs.costPerM3??45)} onChange={e=>attr('costPerM3',Number(e.target.value))}/></label><button className="btn danger" onClick={()=>{setObjects((v:DesignObject[])=>v.filter(x=>x.id!==o.id));setSelected(null)}}>Löschen</button></div>
}

function ModuleOverview({costs,eco,role}:any){return <div><h2>Dashboard</h2><div className="kpis"><div className="kpi"><small>Rolle</small><strong>{role}</strong></div><div className="kpi"><small>Kosten</small><strong>{costs.total.toFixed(0)} €</strong></div><div className="kpi"><small>Öko</small><strong>{eco.score}/100</strong></div><div className="kpi"><small>CO₂</small><strong>{eco.co2} kg</strong></div></div></div>}
function CostsPanel({costs}:any){return <div><h2>Kostenrechner</h2><div className="kpis"><div className="kpi"><small>Pflanzen</small><strong>{costs.plant.toFixed(0)} €</strong></div><div className="kpi"><small>Belag</small><strong>{costs.paving.toFixed(0)} €</strong></div><div className="kpi"><small>Erdarbeiten</small><strong>{costs.earth.toFixed(0)} €</strong></div><div className="kpi"><small>Gesamt</small><strong>{costs.total.toFixed(0)} €</strong></div></div></div>}
function DatabasePanel(){return <div><h2>Datenbank-Module</h2><div className="list">{DB_MODULES.map(x=><div className="item" key={x}><strong>{x}</strong><span>MVP-Struktur vorhanden / Backend-Roadmap</span></div>)}</div></div>}
function ProjectPanel({project,setProject}:any){return <div><h2>Projektverwaltung</h2><div className="form"><label>Name<input value={project.name} onChange={e=>setProject({...project,name:e.target.value})}/></label><label>Standort<input value={project.location} onChange={e=>setProject({...project,location:e.target.value})}/></label><label>Budget<input type="number" value={project.budget} onChange={e=>setProject({...project,budget:Number(e.target.value)})}/></label><label>Fläche<input type="number" value={project.area} onChange={e=>setProject({...project,area:Number(e.target.value)})}/></label></div></div>}
function AdminPanel({role,setRole,setLoggedIn}:any){return <div><h2>Benutzer / Rollen</h2><select value={role} onChange={e=>setRole(e.target.value)}><option>Admin</option><option>Planer</option><option>Kunde</option><option>Bauleitung</option></select><button className="btn danger" style={{marginTop:8}} onClick={()=>setLoggedIn(false)}>Logout</button></div>}
function Info({text}:{text:string}){return <div className="hint">{text}</div>}
function Roadmap(){return <div><h2>Roadmap / Enterprise</h2><div className="list">{['GPT-API','RAG-System','Vektordatenbank','PostgreSQL + PostGIS','OpenStreetMap API','Satellitenbilder','DWG Import/Export','IFC','Cloud Storage','Team-Kollaboration','Zahlungsintegration','AR/VR','Digital Twin','Mehragenten-KI-System'].map(x=><div className="item" key={x}><strong>{x}</strong></div>)}</div></div>}
