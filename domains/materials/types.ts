import type {EntityId} from "@/core/types";
export type MaterialCategory="stone"|"wood"|"concrete"|"metal"|"glass"|"plaster"|"paving"|"gravel"|"soil"|"water";
export type MaterialDefinition={id:EntityId;name:string;category:MaterialCategory;baseColor:string;roughness:number;metalness:number;opacity:number};
