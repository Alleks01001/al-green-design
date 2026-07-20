import type {EntityId,Vec2} from "@/core/types";
export type GeometryKind="surface"|"path"|"wall"|"stairs"|"pool"|"pond"|"pergola"|"fence";
export type GeometryEntity={id:EntityId;kind:GeometryKind;name:string;points:Vec2[];elevation:number;height:number;width:number;rotation:number;materialId?:EntityId;layerId:EntityId};
