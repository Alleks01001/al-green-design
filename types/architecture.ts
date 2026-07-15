export type ArchitectureElementType =
  | 'building'
  | 'floor'
  | 'wall'
  | 'interiorWall'
  | 'roof'
  | 'window'
  | 'door'
  | 'slidingDoor'
  | 'balcony'
  | 'railing'
  | 'column'
  | 'carport'
  | 'winterGarden';

export type RoofType = 'flat' | 'gable' | 'shed' | 'hip';

export type ArchitectureElement = {
  id: number;
  type: ArchitectureElementType;
  name: string;
  x: number;
  y: number;
  width: number;
  depth: number;
  height: number;
  rotation: number;
  level: number;
  thickness: number;
  material: string;
  color: string;
  parentId?: number;
  subtype?: RoofType | string;
};
