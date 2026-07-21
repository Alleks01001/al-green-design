export type LocalGardenObject = {
  id: number;
  type?: string;
  name?: string;
  x?: number;
  y?: number;
  width?: number;
  depth?: number;
  height?: number;
  rotation?: number;
  material?: string | null;
};

export type LocalGardenZone = {
  id: number;
  kind?: 'plantZone' | 'hardscape';
  name?: string;
  x?: number;
  y?: number;
  width?: number;
  depth?: number;
};

export type LocalGardenTerrain = {
  id: number;
  name?: string;
  x?: number;
  y?: number;
  radius?: number;
  height?: number;
  softness?: number;
};

export type LocalGardenProjectContext = {
  editor?: {
    selectedId?: number | null;
    selectedObjectIds?: number[];
    selectedKind?: string | null;
    view?: string;
  };
  objects?: LocalGardenObject[];
  zones?: LocalGardenZone[];
  terrain?: LocalGardenTerrain[];
  project?: {
    name?: string;
    location?: string;
    budget?: number;
    area?: number;
  };
};

export type LocalGardenPreset = {
  width?: number;
  depth?: number;
  height?: number;
  spacing?: number;
  count?: number;
  material?: string;
  arrangement?: 'row' | 'column' | 'grid' | 'circle' | 'cluster';
};

export type LocalGardenMemory = {
  version: 2;
  aliases: Record<string, string>;
  macros: Record<string, string>;
  presets: Record<string, LocalGardenPreset>;
  projectTerms: Record<string, string>;
  preferences: Record<string, string | number | boolean>;
  corrections: Array<{
    id: string;
    trigger: string;
    replacement: string;
    createdAt: string;
  }>;
  lastInteraction: {
    input: string;
    expandedInput: string;
    actionSummary: string[];
    createdAt: string;
  } | null;
  defaults: {
    pathWidth: number;
    objectSpacing: number;
    wallHeight: number;
    fenceHeight: number;
    terraceMaterial: string;
    defaultSurface: 'lawn' | 'bed' | 'terrace';
  };
  learnedStatements: Array<{
    id: string;
    input: string;
    learned: string;
    createdAt: string;
  }>;
};

export type LocalGardenAction = {
  id: string;
  action:
    | 'add_object' | 'update_object' | 'duplicate_object' | 'connect_objects' | 'delete_object'
    | 'add_terrain' | 'update_terrain' | 'delete_terrain'
    | 'add_zone' | 'update_zone' | 'delete_zone'
    | 'update_project' | 'set_view' | 'select_object' | 'run_audit';
  targetId: number | null;
  targetName: string | null;
  referenceId: number | null;
  referenceName: string | null;
  fromId: number | null;
  fromName: string | null;
  toId: number | null;
  toName: string | null;
  objectType: string | null;
  zoneKind: 'plantZone' | 'hardscape' | null;
  relation: 'center' | 'north' | 'south' | 'east' | 'west' | 'northEast' | 'northWest' | 'southEast' | 'southWest' | 'inside' | null;
  arrangement: 'row' | 'column' | 'grid' | 'circle' | 'cluster' | null;
  count: number | null;
  spacing: number | null;
  deltaX: number | null;
  deltaY: number | null;
  name: string | null;
  x: number | null;
  y: number | null;
  width: number | null;
  depth: number | null;
  height: number | null;
  rotation: number | null;
  radius: number | null;
  softness: number | null;
  color: string | null;
  material: string | null;
  note: string | null;
  budget: number | null;
  area: number | null;
  location: string | null;
  view: '2d' | '3d' | 'splitVertical' | 'splitHorizontal' | null;
  destructive: boolean;
  reason: string;
};

export type LocalGardenResult = {
  reply: string;
  actions: LocalGardenAction[];
  suggestions: string[];
  assumptions: string[];
  memory: LocalGardenMemory;
  learned: string[];
  confidence: number;
  editorCommand: 'undo' | 'redo' | null;
};

export const DEFAULT_LOCAL_GARDEN_MEMORY: LocalGardenMemory = {
  version: 2,
  aliases: {
    'sichtschutz': 'hecke',
    'sitzplatz': 'terrasse',
    'rasen': 'rasenflache',
    'gruenflaeche': 'rasenflache',
    'naturweg': 'weg',
    'schwimmbecken': 'pool'
  },
  macros: {},
  presets: {},
  projectTerms: {},
  preferences: {},
  corrections: [],
  lastInteraction: null,
  defaults: {
    pathWidth: 1.2,
    objectSpacing: 2.5,
    wallHeight: 1,
    fenceHeight: 1.8,
    terraceMaterial: 'Naturstein',
    defaultSurface: 'lawn'
  },
  learnedStatements: []
};

const numberWords: Record<string, number> = {
  ein: 1, eine: 1, einen: 1, einer: 1, eins: 1,
  zwei: 2, drei: 3, vier: 4, funf: 5, fuenf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10,
  elf: 11, zwolf: 12, zwoelf: 12
};

const objectAliases: Record<string, string> = {
  baum: 'tree', baume: 'tree', baeume: 'tree', solitaerbaum: 'tree', obstbaum: 'tree',
  strauch: 'shrub', straucher: 'shrub', straeucher: 'shrub', busch: 'shrub',
  hecke: 'hedge', sichtschutzhecke: 'hedge',
  pool: 'pool', schwimmbecken: 'pool',
  teich: 'pond', biotop: 'pond',
  pergola: 'pergola', pavillon: 'pergola',
  mauer: 'gardenWall', gartenmauer: 'gardenWall', stuetzmauer: 'gardenWall', wand: 'wall',
  zaun: 'fence', sichtschutzzaun: 'fence', tor: 'gate',
  treppe: 'stairs', stufen: 'stairs',
  weg: 'path', pfad: 'path', gehweg: 'path', zufahrt: 'path',
  hochbeet: 'planter', pflanzkasten: 'planter',
  bank: 'bench', sitzbank: 'bench',
  leuchte: 'light', licht: 'light', lampe: 'light', pollerleuchte: 'light',
  feuerstelle: 'firepit', feuerplatz: 'firepit',
  felsen: 'rock', findling: 'rock', stein: 'rock',
  bewaesserung: 'irrigation', wasserleitung: 'irrigation', drainage: 'drainage',
  gebaude: 'building', gebaeude: 'building', haus: 'building', gartenhaus: 'building',
  carport: 'carport', wintergarten: 'winterGarden',
  fenster: 'window', tur: 'door', tuer: 'door', schiebetur: 'slidingDoor', schiebetuer: 'slidingDoor',
  balkon: 'balcony', gelander: 'railing', gelaender: 'railing', stutze: 'column', stuetze: 'column', saule: 'column', saeule: 'column',
  dach: 'roof', bodenplatte: 'floor', innenwand: 'interiorWall'
};

const surfaceAliases: Record<string, { kind: 'plantZone' | 'hardscape'; name: string; color: string; material?: string }> = {
  rasenflache: { kind: 'plantZone', name: 'Rasenfläche', color: '#86b96b' },
  rasenflaeche: { kind: 'plantZone', name: 'Rasenfläche', color: '#86b96b' },
  rasen: { kind: 'plantZone', name: 'Rasenfläche', color: '#86b96b' },
  grunflache: { kind: 'plantZone', name: 'Grünfläche', color: '#86b96b' },
  gruenflaeche: { kind: 'plantZone', name: 'Grünfläche', color: '#86b96b' },
  wiese: { kind: 'plantZone', name: 'Wiesenfläche', color: '#78a85e' },
  blumenwiese: { kind: 'plantZone', name: 'Blumenwiese', color: '#73a85d' },
  beet: { kind: 'plantZone', name: 'Pflanzbeet', color: '#6f9b62' },
  pflanzflache: { kind: 'plantZone', name: 'Pflanzfläche', color: '#6f9b62' },
  pflanzflaeche: { kind: 'plantZone', name: 'Pflanzfläche', color: '#6f9b62' },
  terrasse: { kind: 'hardscape', name: 'Terrasse', color: '#b8a58e' },
  pflasterflache: { kind: 'hardscape', name: 'Pflasterfläche', color: '#a8a29e', material: 'Pflaster' },
  pflasterflaeche: { kind: 'hardscape', name: 'Pflasterfläche', color: '#a8a29e', material: 'Pflaster' },
  kiesflache: { kind: 'hardscape', name: 'Kiesfläche', color: '#c7bda9', material: 'Kies' },
  kiesflaeche: { kind: 'hardscape', name: 'Kiesfläche', color: '#c7bda9', material: 'Kies' },
  natursteinflache: { kind: 'hardscape', name: 'Natursteinfläche', color: '#a99a82', material: 'Naturstein' },
  natursteinflaeche: { kind: 'hardscape', name: 'Natursteinfläche', color: '#a99a82', material: 'Naturstein' },
  betonflache: { kind: 'hardscape', name: 'Betonfläche', color: '#a3a3a3', material: 'Beton' },
  betonflaeche: { kind: 'hardscape', name: 'Betonfläche', color: '#a3a3a3', material: 'Beton' },
  flache: { kind: 'plantZone', name: 'Rasenfläche', color: '#86b96b' },
  flaeche: { kind: 'plantZone', name: 'Rasenfläche', color: '#86b96b' }
};

function normalize(value: unknown): string {
  return String(value ?? '')
    .toLocaleLowerCase('de-DE')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9.,x×=:\-\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cloneMemory(memory?: Partial<LocalGardenMemory> | null): LocalGardenMemory {
  const source = memory as Partial<LocalGardenMemory> | null | undefined;
  return {
    version: 2,
    aliases: { ...DEFAULT_LOCAL_GARDEN_MEMORY.aliases, ...(source?.aliases || {}) },
    macros: { ...(source?.macros || {}) },
    presets: { ...(source?.presets || {}) },
    projectTerms: { ...(source?.projectTerms || {}) },
    preferences: { ...(source?.preferences || {}) },
    corrections: Array.isArray(source?.corrections) ? source!.corrections!.slice(-100) : [],
    lastInteraction: source?.lastInteraction || null,
    defaults: { ...DEFAULT_LOCAL_GARDEN_MEMORY.defaults, ...(source?.defaults || {}) },
    learnedStatements: Array.isArray(source?.learnedStatements) ? source!.learnedStatements!.slice(-200) : []
  };
}

function replaceLearnedAliases(text: string, memory: LocalGardenMemory): string {
  let result = ` ${text} `;
  const aliases = Object.entries(memory.aliases)
    .map(([from, to]) => [normalize(from), normalize(to)] as const)
    .filter(([from]) => Boolean(from))
    .sort((a, b) => b[0].length - a[0].length);

  aliases.forEach(([from, to]) => {
    result = result.replace(new RegExp(`\\b${escapeRegExp(from)}\\b`, 'g'), to);
  });
  return result.trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseNumber(raw: string | undefined): number | null {
  if (!raw) return null;
  const normalized = normalize(raw);
  if (normalized in numberWords) return numberWords[normalized];
  const value = Number(normalized.replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

function extractCount(text: string): number {
  const numeric = text.match(/\b(\d{1,2})\s+(?:neue?n?\s+)?[a-z]/);
  if (numeric) return clamp(Math.round(Number(numeric[1])), 1, 30);
  for (const [word, count] of Object.entries(numberWords)) {
    if (new RegExp(`\\b${word}\\b`).test(text)) return count;
  }
  return 1;
}

function extractDistance(text: string): number | null {
  const numeric = text.match(/\b(\d+(?:[.,]\d+)?)\s*(?:m|meter)\b/);
  if (numeric) return parseNumber(numeric[1]);
  for (const [word, value] of Object.entries(numberWords)) {
    if (new RegExp(`\\b${word}\\s+(?:m|meter)\\b`).test(text)) return value;
  }
  return null;
}

function extractDimensions(original: string): { width: number | null; depth: number | null } {
  const match = original.match(/(\d+(?:[.,]\d+)?)\s*(?:m|meter)?\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(?:m|meter)?/i);
  if (!match) return { width: null, depth: null };
  return { width: parseNumber(match[1]), depth: parseNumber(match[2]) };
}

function extractMetric(text: string, labels: string[]): number | null {
  for (const label of labels) {
    const before = text.match(new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*(?:m|meter)?\\s*${label}`));
    if (before) return parseNumber(before[1]);
    const after = text.match(new RegExp(`${label}\\s*(?:von|auf|=|:)?\\s*(\\d+(?:[.,]\\d+)?)\\s*(?:m|meter)?`));
    if (after) return parseNumber(after[1]);
  }
  return null;
}

function extractMaterial(original: string): string | null {
  const text = normalize(original);
  const materials: Array<[RegExp, string]> = [
    [/thermoholz/, 'Thermoholz'], [/naturstein/, 'Naturstein'], [/granit/, 'Granit'], [/kalkstein/, 'Kalkstein'],
    [/holz/, 'Holz'], [/beton/, 'Beton'], [/pflaster/, 'Pflaster'], [/kies/, 'Kies'], [/split/, 'Splitt'],
    [/stahl/, 'Stahl'], [/metall/, 'Metall'], [/glas/, 'Glas'], [/ziegel/, 'Ziegel'], [/rasen/, 'Rasen']
  ];
  return materials.find(([pattern]) => pattern.test(text))?.[1] ?? null;
}

function extractRelation(text: string): LocalGardenAction['relation'] {
  if (/nordost|oben rechts/.test(text)) return 'northEast';
  if (/nordwest|oben links/.test(text)) return 'northWest';
  if (/suedost|unten rechts/.test(text)) return 'southEast';
  if (/suedwest|unten links/.test(text)) return 'southWest';
  if (/nord|noerdlich|oben|hinter/.test(text)) return 'north';
  if (/sued|suedlich|unten|vor/.test(text)) return 'south';
  if (/ost|oestlich|rechts/.test(text)) return 'east';
  if (/west|westlich|links/.test(text)) return 'west';
  if (/innen|innerhalb|in der mitte|zentral|zentrum/.test(text)) return 'center';
  return null;
}

function extractArrangement(text: string, count: number): LocalGardenAction['arrangement'] {
  if (/kreis|kreisfoermig|rundherum/.test(text)) return 'circle';
  if (/gruppe|cluster|locker|natuerlich verteilt/.test(text)) return 'cluster';
  if (/raster|matrix|reihen und spalten/.test(text)) return 'grid';
  if (/senkrecht|spalte/.test(text)) return 'column';
  if (/reihe|entlang|grenze|sichtschutz/.test(text) || count > 1) return 'row';
  return null;
}

function extractObjectType(text: string): string | null {
  const entries = Object.entries(objectAliases).sort((a, b) => b[0].length - a[0].length);
  for (const [alias, type] of entries) {
    if (new RegExp(`\\b${escapeRegExp(normalize(alias))}\\b`).test(text)) return type;
  }
  return null;
}

function extractSurface(text: string): { key: string; kind: 'plantZone' | 'hardscape'; name: string; color: string; material?: string } | null {
  const entries = Object.entries(surfaceAliases).sort((a, b) => b[0].length - a[0].length);
  for (const [key, value] of entries) {
    if (new RegExp(`\\b${escapeRegExp(normalize(key))}\\b`).test(text)) return { key, ...value };
  }
  return null;
}

function findMentionedObject(text: string, objects: LocalGardenObject[], excludedIds: number[] = []): LocalGardenObject | null {
  const candidates = objects.filter(item => !excludedIds.includes(item.id));
  const byName = candidates
    .filter(item => normalize(item.name).length >= 2)
    .sort((a, b) => normalize(b.name).length - normalize(a.name).length)
    .find(item => text.includes(normalize(item.name)));
  if (byName) return byName;

  const type = extractObjectType(text);
  if (type) {
    const matching = candidates.filter(item => item.type === type);
    if (matching.length === 1) return matching[0];
    if (matching.length > 1) {
      const ordinal = text.match(/\b(?:objekt|baum|pool|pergola|weg|mauer|hecke)?\s*(\d+)\b/);
      const index = ordinal ? Number(ordinal[1]) - 1 : -1;
      if (index >= 0 && index < matching.length) return matching[index];
    }
  }
  return null;
}

function findMentionedZone(text: string, zones: LocalGardenZone[]): LocalGardenZone | null {
  const byName = zones
    .filter(item => normalize(item.name).length >= 2)
    .sort((a, b) => normalize(b.name).length - normalize(a.name).length)
    .find(item => text.includes(normalize(item.name)));
  if (byName) return byName;
  const surface = extractSurface(text);
  if (!surface) return null;
  const matching = zones.filter(item => normalize(item.name).includes(normalize(surface.name)) || item.kind === surface.kind);
  return matching.length === 1 ? matching[0] : null;
}

function selectedObject(context: LocalGardenProjectContext): LocalGardenObject | null {
  const objects = context.objects || [];
  const id = context.editor?.selectedId ?? context.editor?.selectedObjectIds?.[0] ?? null;
  return id == null ? null : objects.find(item => item.id === id) || null;
}

function baseAction(action: LocalGardenAction['action'], reason: string, partial: Partial<LocalGardenAction> = {}): LocalGardenAction {
  return {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    action,
    targetId: null,
    targetName: null,
    referenceId: null,
    referenceName: null,
    fromId: null,
    fromName: null,
    toId: null,
    toName: null,
    objectType: null,
    zoneKind: null,
    relation: null,
    arrangement: null,
    count: null,
    spacing: null,
    deltaX: null,
    deltaY: null,
    name: null,
    x: null,
    y: null,
    width: null,
    depth: null,
    height: null,
    rotation: null,
    radius: null,
    softness: null,
    color: null,
    material: null,
    note: null,
    budget: null,
    area: null,
    location: null,
    view: null,
    destructive: action.startsWith('delete_'),
    reason,
    ...partial
  };
}

function addLearning(memory: LocalGardenMemory, input: string, learned: string): void {
  memory.learnedStatements.push({
    id: `learn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    input,
    learned,
    createdAt: new Date().toISOString()
  });
  memory.learnedStatements = memory.learnedStatements.slice(-100);
}

function learnFromCommand(original: string, normalized: string, memory: LocalGardenMemory): string[] {
  const learned: string[] = [];

  const aliasPatterns = [
    /(?:merke dir|lerne|speichere)\s*:?\s*["']?(.+?)["']?\s*(?:=|bedeutet|heisst|steht fuer)\s*["']?(.+?)["']?\s*$/i,
    /mit\s+["']?(.+?)["']?\s+meine ich\s+["']?(.+?)["']?\s*$/i,
    /in diesem projekt\s+(?:bedeutet|ist)\s+["']?(.+?)["']?\s+(?:das objekt|gleich|=)\s*["']?(.+?)["']?\s*$/i
  ];
  for (const pattern of aliasPatterns) {
    const match = original.match(pattern);
    if (match) {
      const rawFrom = match[1].trim().replace(/[.?!,:;]+$/g,'');
      const rawTo = match[2].trim().replace(/[.?!,:;]+$/g,'');
      const from = normalize(rawFrom);
      const to = normalize(rawTo);
      if (from && to && from !== to) {
        memory.aliases[from] = to;
        if (/in diesem projekt/i.test(original)) memory.projectTerms[from] = match[2].trim();
        const statement = `„${rawFrom}“ bedeutet künftig „${rawTo}“.`;
        addLearning(memory, original, statement);
        learned.push(statement);
      }
      break;
    }
  }

  const macroPatterns = [
    /wenn ich\s+(?:sage|schreibe)\s+["']?(.+?)["']?\s*,?\s*(?:dann\s+)?(?:(?:sollst du|bedeutet das|mache|fuehre aus|führe aus)\s+)?((?:erstelle|erzeuge|setze|platziere|verschiebe|ändere|aendere|verbinde|zeichne|baue|lösche|loesche).+?)\s*$/i,
    /(?:lerne befehl|lerne ablauf|speichere makro)\s*:?\s*["']?(.+?)["']?\s*(?:=>|=|bedeutet)\s*["']?(.+?)["']?\s*$/i
  ];
  for (const pattern of macroPatterns) {
    const match = original.match(pattern);
    if (match) {
      const rawTrigger = match[1].trim().replace(/[.?!,:;]+$/g,'');
      const trigger = normalize(rawTrigger);
      const replacement = match[2].trim().replace(/^[,;:\s]+|[.?!]+$/g,'');
      if (trigger && replacement) {
        memory.macros[trigger] = replacement;
        const statement = `Arbeitsbefehl „${rawTrigger}“ führt künftig „${replacement}“ aus.`;
        addLearning(memory, original, statement);
        learned.push(statement);
      }
      break;
    }
  }

  const presetMatch = original.match(/standard\s+(?:fuer|für)\s+([\wäöüÄÖÜß -]+?)\s*:\s*(.+)$/i);
  if (presetMatch) {
    const rawKey = normalize(presetMatch[1]);
    const key = resolveMemoryKey(rawKey);
    const details = presetMatch[2];
    const dims = extractDimensions(details);
    const detailNorm = normalize(details);
    const preset: LocalGardenPreset = { ...(memory.presets[key] || {}) };
    if (dims.width != null) preset.width = dims.width;
    if (dims.depth != null) preset.depth = dims.depth;
    const labeledWidth = extractMetric(detailNorm, ['breit', 'breite']);
    const labeledDepth = extractMetric(detailNorm, ['tief', 'tiefe', 'lang', 'laenge']);
    if (labeledWidth != null) preset.width = labeledWidth;
    if (labeledDepth != null) preset.depth = labeledDepth;
    const height = extractMetric(detailNorm, ['hoch', 'hoehe']);
    const spacing = extractMetric(detailNorm, ['abstand', 'auseinander']);
    const material = extractMaterial(details);
    const count = extractCount(detailNorm);
    if (height != null) preset.height = height;
    if (spacing != null) preset.spacing = spacing;
    if (material) preset.material = material;
    if (/reihe/.test(detailNorm)) preset.arrangement = 'row';
    if (/gruppe|cluster/.test(detailNorm)) preset.arrangement = 'cluster';
    if (/kreis/.test(detailNorm)) preset.arrangement = 'circle';
    if (/raster/.test(detailNorm)) preset.arrangement = 'grid';
    if (/\b(?:anzahl|immer)\s+\w+/.test(detailNorm) && count > 1) preset.count = count;
    memory.presets[key] = preset;
    const statement = `Standard für ${presetMatch[1].trim()} gespeichert.`;
    addLearning(memory, original, statement);
    learned.push(statement);
  }

  const pathWidth = normalized.match(/(?:standardweg|weg standard|wege standard).*?(\d+(?:[.,]\d+)?)\s*(?:m|meter)?\s*(?:breit)?/);
  if (pathWidth) {
    const value = parseNumber(pathWidth[1]);
    if (value && value > 0.2 && value < 10) {
      memory.defaults.pathWidth = value;
      const statement = `Standard-Wegbreite auf ${value} m gesetzt.`;
      addLearning(memory, original, statement);
      learned.push(statement);
    }
  }

  const spacing = normalized.match(/(?:standardabstand|objektabstand|pflanzabstand).*?(\d+(?:[.,]\d+)?)\s*(?:m|meter)?/);
  if (spacing) {
    const value = parseNumber(spacing[1]);
    if (value && value > 0.1 && value < 20) {
      memory.defaults.objectSpacing = value;
      const statement = `Standardabstand auf ${value} m gesetzt.`;
      addLearning(memory, original, statement);
      learned.push(statement);
    }
  }

  const wallHeight = normalized.match(/(?:mauer|gartenmauer).*?(?:standard|standardmaessig).*?(\d+(?:[.,]\d+)?)\s*(?:m|meter)?\s*hoch/);
  if (wallHeight) {
    const value = parseNumber(wallHeight[1]);
    if (value && value > 0.1 && value < 6) {
      memory.defaults.wallHeight = value;
      const statement = `Standard-Mauerhöhe auf ${value} m gesetzt.`;
      addLearning(memory, original, statement);
      learned.push(statement);
    }
  }

  const fenceHeight = normalized.match(/(?:zaun|sichtschutz).*?(?:standard|standardmaessig).*?(\d+(?:[.,]\d+)?)\s*(?:m|meter)?\s*hoch/);
  if (fenceHeight) {
    const value = parseNumber(fenceHeight[1]);
    if (value && value > 0.1 && value < 6) {
      memory.defaults.fenceHeight = value;
      const statement = `Standard-Zaunhöhe auf ${value} m gesetzt.`;
      addLearning(memory, original, statement);
      learned.push(statement);
    }
  }

  const terraceMaterial = original.match(/(?:terrasse).*?(?:standard|standardmaessig|immer).*?(?:aus|mit|material)?\s*(naturstein|granit|kalkstein|holz|thermoholz|beton|pflaster|kies)/i);
  if (terraceMaterial) {
    const material = extractMaterial(terraceMaterial[1]) || terraceMaterial[1];
    memory.defaults.terraceMaterial = material;
    const statement = `Standardmaterial für Terrassen auf ${material} gesetzt.`;
    addLearning(memory, original, statement);
    learned.push(statement);
  }

  const preference = original.match(/ich bevorzuge\s+(.+?)\s+(?:fuer|für|bei)\s+(.+)$/i);
  if (preference) {
    const key = normalize(preference[2]);
    memory.preferences[key] = preference[1].trim();
    const statement = `Bevorzugung gespeichert: ${preference[1].trim()} für ${preference[2].trim()}.`;
    addLearning(memory, original, statement);
    learned.push(statement);
  }

  return Array.from(new Set(learned));
}


function resolveMemoryKey(value: string): string {
  const normalized = normalize(value);
  return objectAliases[normalized] || normalized;
}

function expandAdaptiveMemory(input: string, memory: LocalGardenMemory): string {
  let expanded = String(input || '').trim();
  const normalizedInput = normalize(expanded);

  const exactCorrection = [...memory.corrections].reverse().find(item => item.trigger === normalizedInput);
  if (exactCorrection) expanded = exactCorrection.replacement;

  const macros = Object.entries(memory.macros)
    .map(([trigger, replacement]) => [normalize(trigger), replacement] as const)
    .filter(([trigger]) => Boolean(trigger))
    .sort((a, b) => b[0].length - a[0].length);

  for (const [trigger, replacement] of macros) {
    const normalizedExpanded = normalize(expanded);
    if (normalizedExpanded === trigger || normalizedExpanded.includes(trigger)) {
      expanded = normalizedExpanded === trigger
        ? replacement
        : expanded.replace(new RegExp(escapeRegExp(trigger), 'i'), replacement);
      break;
    }
  }

  return replaceLearnedAliases(normalize(expanded), memory);
}

function memoryStatistics(memory: LocalGardenMemory): string {
  return [
    `${Object.keys(memory.aliases).length} Begriffe`,
    `${Object.keys(memory.macros).length} Makros`,
    `${Object.keys(memory.presets).length} Objektstandards`,
    `${memory.corrections.length} Korrekturen`,
    `${memory.learnedStatements.length} Lernnotizen`
  ].join(' · ');
}

export function describeLocalGardenMemory(existingMemory?: Partial<LocalGardenMemory> | null): string {
  const memory = cloneMemory(existingMemory);
  const aliasPreview = Object.entries(memory.aliases).slice(-8).map(([a,b]) => `• ${a} → ${b}`);
  const macroPreview = Object.entries(memory.macros).slice(-6).map(([a,b]) => `• „${a}“ → „${b}“`);
  const presetPreview = Object.entries(memory.presets).slice(-6).map(([key,preset]) => {
    const values = [preset.width && `${preset.width} m breit`, preset.depth && `${preset.depth} m tief`, preset.height && `${preset.height} m hoch`, preset.material].filter(Boolean).join(', ');
    return `• ${key}: ${values || 'gespeicherter Standard'}`;
  });
  return [`Gespeichertes Wissen: ${memoryStatistics(memory)}`, ...aliasPreview, ...macroPreview, ...presetPreview].join('\n');
}

export const LOCAL_GARDEN_TEACHING_GUIDE = `SO BRINGST DU MIR ETWAS BEI

1. Begriff lernen
„Merke dir: Chillzone bedeutet Terrasse.“

2. Ganzen Arbeitsbefehl lernen
„Wenn ich sage Feierabendplatz, erstelle eine Terrasse 5 × 4 Meter aus Naturstein mit einer Pergola.“

3. Objektstandard lernen
„Standard für Baum: 3 Meter hoch, 2 Meter breit und 2,5 Meter Abstand.“
„Standard für Terrasse: 6 × 4 Meter, Material Naturstein.“

4. Projektbegriff lernen
„In diesem Projekt bedeutet Haupthaus das Objekt Wohnhaus.“

5. Fehler korrigieren
„Das war falsch. Stattdessen verschiebe den Pool 2 Meter nach Osten.“
Ich mache die letzte Änderung rückgängig und merke mir die Korrektur.

6. Wissen prüfen
„Was hast du gelernt?“

7. Einzelnes Wissen vergessen
„Vergiss den Begriff Chillzone.“

Die lokale Intelligenz lernt Gartenbefehle, Maße, Materialien, Synonyme, Abläufe und Korrekturen. Sie trainiert kein allgemeines Sprachmodell und verändert ihren Programmcode nicht selbst.`;

function splitCommands(original: string): string[] {
  return original
    .split(/(?:\n+|;|\s+und\s+(?=(?:erstelle|setze|platziere|verschiebe|ändere|aendere|mache|lösche|loesche|dupliziere|verbinde|erzeuge|füge|fuege|drehe|benenne|pruefe|zeige|wechsel)\b))/i)
    .map(item => item.trim())
    .filter(Boolean);
}

function extractReference(text: string, context: LocalGardenProjectContext, targetId?: number | null): LocalGardenObject | null {
  const objects = context.objects || [];
  const relationMarker = text.match(/(?:neben|bei|am|an|vom|von der|zum|zur|hinter|vor|nordlich von|sudlich von|ostlich von|westlich von)\s+(.+)$/);
  if (relationMarker) {
    const found = findMentionedObject(normalize(relationMarker[1]), objects, targetId == null ? [] : [targetId]);
    if (found) return found;
  }
  return null;
}

function createActionsForCommand(commandOriginal: string, context: LocalGardenProjectContext, memory: LocalGardenMemory): {
  actions: LocalGardenAction[];
  assumptions: string[];
  question?: string;
} {
  const rawNormalized = normalize(commandOriginal);
  const text = expandAdaptiveMemory(commandOriginal, memory);
  const objects = context.objects || [];
  const zones = context.zones || [];
  const actions: LocalGardenAction[] = [];
  const assumptions: string[] = [];
  const selected = selectedObject(context);
  const dimensions = extractDimensions(commandOriginal);
  const count = extractCount(text);
  const explicitSpacing = extractMetric(text, ['abstand', 'auseinander']);
  const spacing = explicitSpacing ?? memory.defaults.objectSpacing;
  const relation = extractRelation(text);
  const arrangement = extractArrangement(text, count);
  const material = extractMaterial(commandOriginal);
  const width = dimensions.width ?? extractMetric(text, ['breit', 'breite']);
  const depth = dimensions.depth ?? extractMetric(text, ['lang', 'laenge', 'tief', 'tiefe']);
  const height = extractMetric(text, ['hoch', 'hoehe']);
  const rotation = extractMetric(text, ['grad', 'drehung']);
  const objectType = extractObjectType(text);
  const surface = extractSurface(text);
  const objectPreset = objectType ? (memory.presets[objectType] || {}) : {};
  const surfacePresetKey = surface ? normalize(surface.name) : '';
  const surfacePreset = surfacePresetKey ? (memory.presets[surfacePresetKey] || memory.presets[surfacePresetKey.replace(/flaeche|flache/g,'')] || {}) : {};

  if (/\b(ruckgangig|rueckgaengig|undo|zuruck|zurueck)\b/.test(text)) return { actions, assumptions, question: '__UNDO__' };
  if (/\b(wiederholen|redo|vorwaerts)\b/.test(text)) return { actions, assumptions, question: '__REDO__' };

  if (/\b(pruefe|analysiere|audit|qualitatsprufung|qualitaetspruefung)\b/.test(text)) {
    actions.push(baseAction('run_audit', 'Lokale Projektprüfung starten.'));
  }

  if (/\b(zeige|wechsel|offne|oeffne)\b/.test(text)) {
    if (/\b3d\b/.test(text)) actions.push(baseAction('set_view', '3D-Ansicht öffnen.', { view: '3d' }));
    else if (/\b2d\b/.test(text)) actions.push(baseAction('set_view', '2D-Ansicht öffnen.', { view: '2d' }));
    else if (/\b(split|geteilt|nebeneinander)\b/.test(text)) actions.push(baseAction('set_view', 'Geteilte Ansicht öffnen.', { view: 'splitVertical' }));
  }

  const connectVerb = /\b(verbinde|verlege|fuhre|fuehre)\b/.test(text) || (/\b(vom|von)\b/.test(text) && /\b(zum|zur|bis)\b/.test(text));
  const connectionObjectType = /\b(weg|pfad|gehweg)\b/.test(text) ? 'path'
    : /\b(gartenmauer|mauer)\b/.test(text) ? 'gardenWall'
    : /\bzaun\b/.test(text) ? 'fence'
    : /\b(bewasserung|bewaesserung|wasserleitung)\b/.test(text) ? 'irrigation'
    : /\bdrainage\b/.test(text) ? 'drainage'
    : null;
  if (connectVerb && connectionObjectType) {
    const fromTo = text.match(/(?:vom|von)\s+(.+?)\s+(?:zum|zur|bis zum|bis zur)\s+(.+)$/);
    const andWith = text.match(/verbinde\s+(.+?)\s+und\s+(.+?)\s+mit\s+(?:einem|einer|einen)?\s*.+$/);
    const markers = fromTo || andWith;
    if (markers) {
      const from = findMentionedObject(normalize(markers[1]), objects);
      const to = findMentionedObject(normalize(markers[2]), objects, from ? [from.id] : []);
      if (from && to) {
        actions.push(baseAction('connect_objects', 'Zwei vorhandene Objekte direkt verbinden.', {
          objectType: connectionObjectType,
          fromId: from.id,
          fromName: from.name || null,
          toId: to.id,
          toName: to.name || null,
          width: connectionObjectType === 'path' ? (width ?? memory.defaults.pathWidth) : width,
          height: connectionObjectType === 'gardenWall' ? (height ?? memory.defaults.wallHeight) : height,
          material,
          name: connectionObjectType === 'path' ? 'Verbindungsweg' : null
        }));
        return { actions, assumptions };
      }
      return { actions, assumptions, question: 'Ich finde Start und Ziel nicht eindeutig. Bitte nenne die exakten Objektnamen, z. B. „Verbinde Haus und Pool mit einem Weg“.' };
    }
  }

  const createVerb = /\b(erstelle|erzeuge|setze|platziere|fuge|fuege|baue|generiere|plane|zeichne|lege an)\b/.test(text);
  if (createVerb) {
    if (surface || /\bflaeche\b/.test(text)) {
      const chosen = surface || surfaceAliases[memory.defaults.defaultSurface === 'terrace' ? 'terrasse' : memory.defaults.defaultSurface === 'bed' ? 'beet' : 'rasenflache'];
      const reference = extractReference(text, context);
      const zoneWidth = width ?? dimensions.width ?? surfacePreset.width ?? 4;
      const zoneDepth = depth ?? dimensions.depth ?? surfacePreset.depth ?? 3;
      const resolvedMaterial = material || surfacePreset.material || chosen.material || (chosen.name === 'Terrasse' ? memory.defaults.terraceMaterial : null);
      actions.push(baseAction('add_zone', 'Fläche direkt im Plan anlegen.', {
        zoneKind: chosen.kind,
        name: chosen.name,
        width: zoneWidth,
        depth: zoneDepth,
        color: chosen.color,
        material: resolvedMaterial,
        referenceId: reference?.id ?? selected?.id ?? null,
        referenceName: reference?.name ?? selected?.name ?? null,
        relation,
        spacing: explicitSpacing ?? 0.6
      }));
      if (!width && !depth && dimensions.width == null) assumptions.push(`Mangels Maßangabe verwende ich ${zoneWidth} × ${zoneDepth} m.`);
    } else if (objectType) {
      const reference = extractReference(text, context);
      const effectiveHeight = height ?? objectPreset.height ?? (objectType === 'gardenWall' ? memory.defaults.wallHeight : objectType === 'fence' ? memory.defaults.fenceHeight : null);
      const effectiveWidth = objectType === 'path' ? (width ?? objectPreset.width ?? memory.defaults.pathWidth) : (width ?? objectPreset.width ?? null);
      const effectiveDepth = depth ?? objectPreset.depth ?? null;
      const effectiveCount = count > 1 ? count : (objectPreset.count ?? count);
      const effectiveSpacing = explicitSpacing ?? objectPreset.spacing ?? memory.defaults.objectSpacing;
      const effectiveArrangement = arrangement ?? objectPreset.arrangement ?? null;
      const effectiveMaterial = material ?? objectPreset.material ?? null;
      const boundaryPlacement = !reference && !selected && /grenze|rand/.test(text)
        ? relation === 'north' ? {x:0,y:-11.5}
          : relation === 'south' ? {x:0,y:11.5}
          : relation === 'east' ? {x:17,y:0}
          : relation === 'west' ? {x:-17,y:0}
          : {x:0,y:0}
        : {x:null,y:null};
      const boundaryArrangement = /grenze|rand/.test(text) && (relation === 'east' || relation === 'west') ? 'column' : arrangement;
      actions.push(baseAction('add_object', 'Objekt unmittelbar im Plan erzeugen.', {
        objectType,
        count: effectiveCount,
        arrangement: boundaryArrangement || effectiveArrangement,
        spacing: effectiveCount > 1 ? effectiveSpacing : (explicitSpacing ?? 0.6),
        width: effectiveWidth,
        depth: effectiveDepth,
        height: effectiveHeight,
        rotation,
        material: effectiveMaterial,
        relation,
        x: boundaryPlacement.x,
        y: boundaryPlacement.y,
        referenceId: reference?.id ?? selected?.id ?? null,
        referenceName: reference?.name ?? selected?.name ?? null
      }));
    } else if (/\b(huegel|mulde|senke|gelaendeform)\b/.test(text)) {
      actions.push(baseAction('add_terrain', 'Geländeform unmittelbar erzeugen.', {
        name: /mulde|senke/.test(text) ? 'Lokale Mulde' : 'Lokaler Hügel',
        radius: width ?? 2,
        height: /mulde|senke/.test(text) ? -(height ?? 0.5) : (height ?? 0.5),
        softness: 1.4
      }));
    } else {
      return { actions, assumptions, question: 'Ich erkenne noch nicht, was erstellt werden soll. Nenne bitte z. B. Rasenfläche, Terrasse, Weg, Pool, Baum, Mauer oder Pergola.' };
    }
  }

  const deleteVerb = /\b(losche|loesche|entferne|weg damit|beseitige)\b/.test(text);
  const duplicateVerb = /\b(dupliziere|kopiere|verdopple)\b/.test(text);
  const moveVerb = /\b(verschiebe|bewege|schiebe|setze .* nach)\b/.test(text);
  const updateVerb = /\b(andere|aendere|mache|setze auf|vergrossere|vergroessere|verkleinere|skaliere|drehe|benenne|material)\b/.test(text);

  if (deleteVerb || duplicateVerb || moveVerb || updateVerb) {
    const targetObject = selected || findMentionedObject(text, objects);
    const targetZone = targetObject ? null : findMentionedZone(text, zones);

    if (!targetObject && !targetZone) {
      return { actions, assumptions, question: 'Ich kann das Ziel nicht eindeutig finden. Markiere das gewünschte Element oder nenne seinen exakten Namen.' };
    }

    if (deleteVerb) {
      actions.push(baseAction(targetObject ? 'delete_object' : 'delete_zone', 'Ausgewähltes Element löschen.', {
        targetId: (targetObject || targetZone)!.id,
        targetName: (targetObject || targetZone)!.name || null,
        destructive: true
      }));
    }

    if (duplicateVerb && targetObject) {
      actions.push(baseAction('duplicate_object', 'Objekt duplizieren.', {
        targetId: targetObject.id,
        targetName: targetObject.name || null,
        count,
        arrangement,
        spacing,
        deltaX: relation === 'east' ? spacing : relation === 'west' ? -spacing : 0,
        deltaY: relation === 'south' ? spacing : relation === 'north' ? -spacing : 0
      }));
    }

    if (moveVerb) {
      const distance = extractDistance(text) ?? 1;
      const deltaX = relation === 'east' ? distance : relation === 'west' ? -distance : 0;
      const deltaY = relation === 'south' ? distance : relation === 'north' ? -distance : 0;
      actions.push(baseAction(targetObject ? 'update_object' : 'update_zone', 'Element relativ verschieben.', {
        targetId: (targetObject || targetZone)!.id,
        targetName: (targetObject || targetZone)!.name || null,
        deltaX,
        deltaY
      }));
    }

    if (updateVerb && !moveVerb) {
      const nameMatch = commandOriginal.match(/(?:benenne|nenne)\s+.+?\s+(?:in|um in|auf)\s+["']?(.+?)["']?$/i);
      const actionType = targetObject ? 'update_object' : 'update_zone';
      actions.push(baseAction(actionType, 'Eigenschaften des Elements direkt ändern.', {
        targetId: (targetObject || targetZone)!.id,
        targetName: (targetObject || targetZone)!.name || null,
        width,
        depth,
        height,
        rotation,
        material,
        name: nameMatch?.[1]?.trim() || null
      }));
    }
  }

  const projectBudget = text.match(/budget\s*(?:auf|=|:)?\s*(\d+(?:[.,]\d+)?)\s*(?:euro|eur|€)?/);
  if (projectBudget) {
    actions.push(baseAction('update_project', 'Projektbudget aktualisieren.', { budget: parseNumber(projectBudget[1]) }));
  }

  return { actions, assumptions };
}

export function interpretLocalGardenCommand(
  input: string,
  context: LocalGardenProjectContext,
  existingMemory?: Partial<LocalGardenMemory> | null
): LocalGardenResult {
  const original = String(input || '').trim();
  const memory = cloneMemory(existingMemory);
  const normalized = normalize(original);

  if (!original) {
    return { reply: 'Bitte gib eine Anweisung ein.', actions: [], suggestions: [], assumptions: [], memory, learned: [], confidence: 0, editorCommand: null };
  }

  if (/(wie bringe ich dir|wie kann ich dir|lernhilfe|training|was kannst du lernen)/i.test(original)) {
    return { reply: LOCAL_GARDEN_TEACHING_GUIDE, actions: [], suggestions: ['Was hast du gelernt?', 'Merke dir: Chillzone bedeutet Terrasse.'], assumptions: [], memory, learned: [], confidence: 1, editorCommand: null };
  }

  if (/(was hast du gelernt|zeige.*(?:wissen|lernspeicher)|was weisst du|was weißt du)/i.test(original)) {
    return { reply: describeLocalGardenMemory(memory), actions: [], suggestions: ['Wie bringe ich dir etwas bei?', 'Vergiss den Begriff Chillzone.'], assumptions: [], memory, learned: [], confidence: 1, editorCommand: null };
  }

  const forgetMatch = original.match(/vergiss\s+(?:den begriff|das makro|den standard)?\s*["']?(.+?)["']?\s*$/i);
  if (forgetMatch) {
    const rawForgotten = forgetMatch[1].trim().replace(/[.?!,:;]+$/g,'');
    const key = normalize(rawForgotten);
    delete memory.aliases[key];
    delete memory.macros[key];
    delete memory.presets[resolveMemoryKey(key)];
    delete memory.projectTerms[key];
    addLearning(memory, original, `Wissen zu „${rawForgotten}“ wurde entfernt.`);
    return { reply: `Erledigt. Ich habe das gespeicherte Wissen zu „${rawForgotten}“ entfernt.`, actions: [], suggestions: [], assumptions: [], memory, learned: [`„${rawForgotten}“ vergessen.`], confidence: 1, editorCommand: null };
  }

  const correctionMatch = original.match(/(?:das war falsch|korrigiere(?: den letzten befehl)?|nicht so)\s*[,:.-]*\s*(?:stattdessen|ich meinte)?\s*(.+)$/i);
  if (correctionMatch && memory.lastInteraction) {
    const replacement = correctionMatch[1].trim();
    const trigger = normalize(memory.lastInteraction.input);
    memory.corrections.push({ id: `correction-${Date.now()}`, trigger, replacement, createdAt: new Date().toISOString() });
    memory.corrections = memory.corrections.slice(-100);
    const statement = `Korrektur gelernt: „${memory.lastInteraction.input}“ soll künftig „${replacement}“ bedeuten.`;
    addLearning(memory, original, statement);
    const actions: LocalGardenAction[] = [];
    const assumptions: string[] = [];
    let question = '';
    for (const command of splitCommands(replacement)) {
      const result = createActionsForCommand(command, context, memory);
      if (result.question && !question) question = result.question;
      actions.push(...result.actions);
      assumptions.push(...result.assumptions);
    }
    memory.lastInteraction = { input: replacement, expandedInput: replacement, actionSummary: actions.map(action => action.action), createdAt: new Date().toISOString() };
    return { reply: question || `Korrektur verstanden. Ich mache die letzte Änderung rückgängig und führe stattdessen aus: ${replacement}`, actions, suggestions: ['Was hast du gelernt?'], assumptions, memory, learned: [statement], confidence: actions.length ? 0.95 : 0.65, editorCommand: 'undo' };
  }

  const learned = learnFromCommand(original, normalized, memory);
  const explicitTeaching = /^(?:merke dir|lerne|speichere|mit .+ meine ich|standard|wenn ich|ich bevorzuge|in diesem projekt)/i.test(original.trim());
  if (learned.length > 0 && explicitTeaching) {
    return { reply: `Gelernt: ${learned.join(' ')}`, actions: [], suggestions: ['Was hast du gelernt?', 'Wie bringe ich dir etwas bei?'], assumptions: [], memory, learned, confidence: 1, editorCommand: null };
  }

  const expandedInput = expandAdaptiveMemory(original, memory);
  const actions: LocalGardenAction[] = [];
  const assumptions: string[] = [];
  let question = '';
  let editorCommand: 'undo' | 'redo' | null = null;

  for (const command of splitCommands(expandedInput)) {
    const result = createActionsForCommand(command, context, memory);
    if (result.question === '__UNDO__') editorCommand = 'undo';
    else if (result.question === '__REDO__') editorCommand = 'redo';
    else if (result.question && !question) question = result.question;
    actions.push(...result.actions);
    assumptions.push(...result.assumptions);
  }

  if (!actions.length && !editorCommand) {
    return {
      reply: question || 'Ich habe noch keine ausführbare Gartenaktion erkannt. Du kannst mir den gewünschten Ablauf auch beibringen: „Wenn ich sage …, dann sollst du …“.',
      actions: [],
      suggestions: ['Wie bringe ich dir etwas bei?', 'Erstelle eine Rasenfläche 8 × 5 Meter.', 'Wenn ich sage Feierabendplatz, erstelle eine Terrasse 5 × 4 Meter.'],
      assumptions, memory, learned, confidence: question ? 0.55 : 0.25, editorCommand: null
    };
  }

  const actionLabels = actions.map(action => action.action === 'add_zone' ? (action.name || 'Fläche') : action.action === 'add_object' ? `${action.count || 1} ${action.objectType || 'Objekt'}` : action.action === 'connect_objects' ? 'Verbindung' : action.action === 'run_audit' ? 'Projektprüfung' : action.action === 'set_view' ? 'Ansicht' : (action.targetName || 'Elementänderung'));
  memory.lastInteraction = { input: original, expandedInput, actionSummary: actionLabels, createdAt: new Date().toISOString() };

  return {
    reply: editorCommand ? (editorCommand === 'undo' ? 'Die letzte Änderung wird rückgängig gemacht.' : 'Die zuletzt rückgängig gemachte Änderung wird wiederholt.') : `Verstanden. Ich führe ${actions.length} Aktion${actions.length === 1 ? '' : 'en'} direkt aus: ${actionLabels.join(', ')}.`,
    actions,
    suggestions: ['Korrigiere den letzten Befehl: Stattdessen …', 'Was hast du gelernt?', 'Wie bringe ich dir etwas bei?'],
    assumptions, memory, learned, confidence: question ? 0.72 : 0.92, editorCommand
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
