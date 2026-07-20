import type {EntityId,Vec2} from "@/core/types";
export type IrrigationZone={id:EntityId;name:string;maxFlowLMin:number;targetPressureBar:number};
export type IrrigationEmitter={id:EntityId;zoneId:EntityId;position:Vec2;kind:"sprinkler"|"drip";radius:number;flowLMin:number};
