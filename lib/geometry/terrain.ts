export type TerrainModifier = {
  x: number;
  y: number;
  radius: number;
  height: number;
  softness: number;
};

export function sampleTerrainHeight(x: number, y: number, modifiers: TerrainModifier[]) {
  return modifiers.reduce((sum, modifier) => {
    const dx = x - modifier.x;
    const dy = y - modifier.y;
    const distanceSquared = dx * dx + dy * dy;
    const sigma = Math.max(0.2, modifier.radius * modifier.softness);
    const influence = Math.exp(-distanceSquared / (2 * sigma * sigma));
    return sum + modifier.height * influence;
  }, 0);
}
