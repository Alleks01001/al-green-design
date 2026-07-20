import type {EntityId} from "@/core/types";
export type ProjectMeta={id:EntityId;name:string;location:string;description:string;budget:number;area:number;createdAt:string;updatedAt:string};
export type ProjectSettings={gridSize:number;snapEnabled:boolean;units:"metric";theme:"burgundy"};
