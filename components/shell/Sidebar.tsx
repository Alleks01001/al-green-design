"use client";
import {BrandLogo} from "@/components/shell/BrandLogo";import {useEditorStore} from "@/stores/editor-store";
const modules=["Projekt","2D-Plan","3D-Modell","Gelände","Gebäude","Pflanzen","Materialien","Wasser","KI-Planung","Berichte"];
export function Sidebar(){const{project,updateProjectName}=useEditorStore();return <aside className="sidebar panel"><div className="brand"><BrandLogo/><div><strong>AL Green Design</strong><span>Landscape Architecture Studio V1.0</span></div></div><label className="field">Projektname<input value={project.name} onChange={e=>updateProjectName(e.target.value)}/></label><nav className="module-list">{modules.map((m,i)=><button key={m} className={i===0?"module active":"module"}>{m}</button>)}</nav></aside>}
