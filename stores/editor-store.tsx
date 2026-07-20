"use client";
import {createContext,useContext,useMemo,useState,type ReactNode} from "react";
import type {EditorMode,WorkspaceView} from "@/core/types";
import type {ProjectMeta,ProjectSettings} from "@/domains/project/types";
import type {GeometryEntity} from "@/domains/geometry/types";
import type {TerrainModel} from "@/domains/terrain/types";
import type {BuildingLevel,OpeningEntity,WallEntity} from "@/domains/building/types";
import type {PlantInstance} from "@/domains/planting/types";
import type {MaterialDefinition} from "@/domains/materials/types";
import type {IrrigationEmitter,IrrigationZone} from "@/domains/water/types";
type State={project:ProjectMeta;settings:ProjectSettings;mode:EditorMode;view:WorkspaceView;selectedIds:string[];geometry:GeometryEntity[];terrain:TerrainModel;levels:BuildingLevel[];walls:WallEntity[];openings:OpeningEntity[];plants:PlantInstance[];materials:MaterialDefinition[];irrigationZones:IrrigationZone[];emitters:IrrigationEmitter[]};
type Value=State&{setMode:(v:EditorMode)=>void;setView:(v:WorkspaceView)=>void;setSelectedIds:(v:string[])=>void;updateProjectName:(v:string)=>void};
const Ctx=createContext<Value|null>(null);
const initial:State={project:{id:"project-1",name:"AL Green Design Projekt",location:"Österreich",description:"Modularer V1.0-Neuaufbau",budget:100000,area:500,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},settings:{gridSize:.5,snapEnabled:true,units:"metric",theme:"burgundy"},mode:"select",view:"split",selectedIds:[],geometry:[],terrain:{points:[],contourInterval:.25,showContours:true},levels:[{id:"level-ground",name:"EG",elevation:0,height:3,visible:true}],walls:[],openings:[],plants:[],materials:[{id:"material-burgundy",name:"Burgundy Akzent",category:"metal",baseColor:"#7f1d1d",roughness:.4,metalness:.65,opacity:1}],irrigationZones:[],emitters:[]};
export function EditorStoreProvider({children}:{children:ReactNode}){const[state,setState]=useState(initial);const value=useMemo<Value>(()=>({...state,setMode:mode=>setState(c=>({...c,mode})),setView:view=>setState(c=>({...c,view})),setSelectedIds:selectedIds=>setState(c=>({...c,selectedIds})),updateProjectName:name=>setState(c=>({...c,project:{...c.project,name,updatedAt:new Date().toISOString()}}))}),[state]);return <Ctx.Provider value={value}>{children}</Ctx.Provider>}
export function useEditorStore(){const value=useContext(Ctx);if(!value)throw new Error("EditorStoreProvider fehlt");return value}
