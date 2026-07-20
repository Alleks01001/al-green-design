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

export type LocalGardenMemory = {
  version: 1;
  aliases: Record<string, string>;
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
  version: 1,
  aliases: {
    'sichtschutz': 'hecke',
    'sitzplatz': 'terrasse',
    'rasen': 'rasenflache',
    'gruenflaeche': 'rasenflache',
    'naturweg': 'weg',
    'schwimmbecken': 'pool'
  },
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
  return {
    version: 1,
    aliases: { ...DEFAULT_LOCAL_GARDEN_MEMORY.aliases, ...(memory?.aliases || {}) },
    defaults: { ...DEFAULT_LOCAL_GARDEN_MEMORY.defaults, ...(memory?.defaults || {}) },
    learnedStatements: Array.isArray(memory?.learnedStatements) ? memory!.learnedStatements!.slice(-100) : []
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
    /mit\s+["']?(.+?)["']?\s+meine ich\s+["']?(.+?)["']?\s*$/i
  ];
  for (const pattern of aliasPatterns) {
    const match = original.match(pattern);
    if (match) {
      const from = normalize(match[1]);
      const to = normalize(match[2]);
      if (from && to && from !== to) {
        memory.aliases[from] = to;
        const statement = `„${match[1].trim()}“ bedeutet künftig „${match[2].trim()}“.`;
        addLearning(memory, original, statement);
        learned.push(statement);
      }
      break;
    }
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

  return learned;
}

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
  const text = replaceLearnedAliases(rawNormalized, memory);
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
      const zoneWidth = width ?? dimensions.width ?? 4;
      const zoneDepth = depth ?? dimensions.depth ?? 3;
      const resolvedMaterial = material || chosen.material || (chosen.name === 'Terrasse' ? memory.defaults.terraceMaterial : null);
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
      const effectiveHeight = height ?? (objectType === 'gardenWall' ? memory.defaults.wallHeight : objectType === 'fence' ? memory.defaults.fenceHeight : null);
      const effectiveWidth = objectType === 'path' ? (width ?? memory.defaults.pathWidth) : width;
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
        count,
        arrangement: boundaryArrangement,
        spacing: count > 1 ? spacing : (explicitSpacing ?? 0.6),
        width: effectiveWidth,
        depth,
        height: effectiveHeight,
        rotation,
        material,
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
  const learned = learnFromCommand(original, normalized, memory);

  if (!original) {
    return {
      reply: 'Bitte gib eine Anweisung ein.', actions: [], suggestions: [], assumptions: [], memory, learned,
      confidence: 0, editorCommand: null
    };
  }

  const onlyLearning = learned.length > 0 && /(?:merke dir|lerne|speichere|mit .+ meine ich|standard)/i.test(original) && !/(?:erstelle|setze|platziere|verschiebe|aendere|loesche|dupliziere|verbinde|baue|zeichne)/i.test(normalized);
  if (onlyLearning) {
    return {
      reply: `Gelernt: ${learned.join(' ')}`,
      actions: [],
      suggestions: ['Erstelle eine 6 × 4 m Terrasse.', 'Setze drei Bäume an die Nordgrenze.'],
      assumptions: [], memory, learned, confidence: 1, editorCommand: null
    };
  }

  const actions: LocalGardenAction[] = [];
  const assumptions: string[] = [];
  let question = '';
  let editorCommand: 'undo' | 'redo' | null = null;

  for (const command of splitCommands(original)) {
    const result = createActionsForCommand(command, context, memory);
    if (result.question === '__UNDO__') editorCommand = 'undo';
    else if (result.question === '__REDO__') editorCommand = 'redo';
    else if (result.question && !question) question = result.question;
    actions.push(...result.actions);
    assumptions.push(...result.assumptions);
  }

  if (!actions.length && !editorCommand) {
    return {
      reply: question || 'Ich habe noch keine ausführbare Gartenaktion erkannt. Formuliere den Befehl etwa als „Erstelle …“, „Verschiebe …“, „Ändere …“ oder „Verbinde …“.',
      actions: [],
      suggestions: [
        'Erstelle eine Rasenfläche 8 × 5 Meter.',
        'Setze fünf Bäume als Reihe an die Nordgrenze.',
        'Verbinde Haus und Pool mit einem 1,2 Meter breiten Weg.'
      ],
      assumptions, memory, learned, confidence: question ? 0.55 : 0.25, editorCommand: null
    };
  }

  const actionLabels = actions.map(action => {
    if (action.action === 'add_zone') return action.name || 'Fläche';
    if (action.action === 'add_object') return `${action.count || 1} ${action.objectType || 'Objekt'}`;
    if (action.action === 'connect_objects') return 'Verbindung';
    if (action.action === 'run_audit') return 'Projektprüfung';
    if (action.action === 'set_view') return 'Ansicht';
    return action.targetName || 'Elementänderung';
  });

  return {
    reply: editorCommand
      ? editorCommand === 'undo' ? 'Die letzte Änderung wird rückgängig gemacht.' : 'Die zuletzt rückgängig gemachte Änderung wird wiederholt.'
      : `Verstanden. Ich führe ${actions.length} Aktion${actions.length === 1 ? '' : 'en'} direkt aus: ${actionLabels.join(', ')}.`,
    actions,
    suggestions: [
      'Mache das ausgewählte Objekt 4 × 3 Meter groß.',
      'Setze drei Sträucher als Gruppe daneben.',
      'Prüfe das Projekt auf Planungsfehler.'
    ],
    assumptions,
    memory,
    learned,
    confidence: question ? 0.72 : 0.9,
    editorCommand
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
