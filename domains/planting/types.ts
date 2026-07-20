import type {EntityId,Vec2} from "@/core/types";
export type PlantCategory="tree"|"shrub"|"hedge"|"perennial"|"grass";
export type PlantSpecies={id:EntityId;commonName:string;botanicalName:string;category:PlantCategory;matureHeight:number;matureWidth:number;spacing:number;light:Array<"sun"|"partial-shade"|"shade">;waterNeed:1|2|3|4|5};
export type PlantInstance={id:EntityId;speciesId:EntityId;position:Vec2;rotation:number;plantingSize:number};
