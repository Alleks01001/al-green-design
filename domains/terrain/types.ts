import type {EntityId,Vec2} from "@/core/types";
export type TerrainPoint={id:EntityId;position:Vec2;elevation:number;surface:"existing"|"proposed"};
export type TerrainModel={points:TerrainPoint[];contourInterval:number;showContours:boolean};
