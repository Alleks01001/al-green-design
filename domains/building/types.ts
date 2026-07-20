import type {EntityId,Vec2} from "@/core/types";
export type BuildingLevel={id:EntityId;name:string;elevation:number;height:number;visible:boolean};
export type WallEntity={id:EntityId;levelId:EntityId;start:Vec2;end:Vec2;thickness:number;height:number;materialId?:EntityId};
export type OpeningEntity={id:EntityId;wallId:EntityId;kind:"door"|"window"|"sliding-door"|"garage-door";offset:number;width:number;height:number;sillHeight:number};
