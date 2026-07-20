import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

type IncomingMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type ProjectObject = {
  id: number;
  type?: string;
  name?: string;
  x?: number;
  y?: number;
  width?: number;
  depth?: number;
  height?: number;
};

type ProjectContext = {
  editor?: {
    selectedId?: number | null;
    selectedObjectIds?: number[];
    view?: string;
  };
  objects?: ProjectObject[];
  terrain?: Array<{ id: number; name?: string }>;
  zones?: Array<{ id: number; name?: string }>;
  [key: string]: unknown;
};

type LooseAction = Record<string, unknown>;

const gardenObjectTypes = [
  'building','pool','pond','pergola','wall','gardenWall','fence','gate','stairs','path',
  'tree','shrub','hedge','planter','bench','light','firepit','rock','irrigation','drainage',
  'floor','interiorWall','roof','window','door','slidingDoor','balcony','railing','column',
  'carport','winterGarden'
] as const;

const actionSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'string' },
    action: {
      type: 'string',
      enum: [
        'add_object','update_object','duplicate_object','connect_objects','delete_object',
        'add_terrain','update_terrain','delete_terrain',
        'add_zone','update_zone','delete_zone',
        'update_project','set_view','select_object','run_audit'
      ]
    },
    targetId: { type: ['number','null'] },
    targetName: { type: ['string','null'] },
    referenceId: { type: ['number','null'] },
    referenceName: { type: ['string','null'] },
    fromId: { type: ['number','null'] },
    fromName: { type: ['string','null'] },
    toId: { type: ['number','null'] },
    toName: { type: ['string','null'] },
    objectType: { type: ['string','null'], enum: [...gardenObjectTypes, null] },
    zoneKind: { type: ['string','null'], enum: ['plantZone','hardscape',null] },
    relation: {
      type: ['string','null'],
      enum: ['center','north','south','east','west','northEast','northWest','southEast','southWest','inside',null]
    },
    arrangement: {
      type: ['string','null'],
      enum: ['row','column','grid','circle','cluster',null]
    },
    count: { type: ['number','null'] },
    spacing: { type: ['number','null'] },
    deltaX: { type: ['number','null'] },
    deltaY: { type: ['number','null'] },
    name: { type: ['string','null'] },
    x: { type: ['number','null'] },
    y: { type: ['number','null'] },
    width: { type: ['number','null'] },
    depth: { type: ['number','null'] },
    height: { type: ['number','null'] },
    rotation: { type: ['number','null'] },
    radius: { type: ['number','null'] },
    softness: { type: ['number','null'] },
    color: { type: ['string','null'] },
    material: { type: ['string','null'] },
    note: { type: ['string','null'] },
    budget: { type: ['number','null'] },
    area: { type: ['number','null'] },
    location: { type: ['string','null'] },
    view: { type: ['string','null'], enum: ['2d','3d','splitVertical','splitHorizontal',null] },
    destructive: { type: 'boolean' },
    reason: { type: 'string' }
  },
  required: [
    'id','action','targetId','targetName','referenceId','referenceName','fromId','fromName','toId','toName',
    'objectType','zoneKind','relation','arrangement','count','spacing','deltaX','deltaY','name','x','y','width',
    'depth','height','rotation','radius','softness','color','material','note','budget','area','location','view',
    'destructive','reason'
  ]
} as const;

const assistantSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    reply: { type: 'string' },
    mode: { type: 'string', enum: ['answer','execute','question'] },
    actions: { type: 'array', items: actionSchema },
    assumptions: { type: 'array', items: { type: 'string' } },
    suggestions: { type: 'array', items: { type: 'string' } }
  },
  required: ['reply','mode','actions','assumptions','suggestions']
} as const;

const objectAliases: Record<string, string> = {
  baum: 'tree', bäume: 'tree', baeume: 'tree', tree: 'tree',
  strauch: 'shrub', sträucher: 'shrub', straeucher: 'shrub', shrub: 'shrub',
  hecke: 'hedge', hedge: 'hedge',
  pool: 'pool', schwimmbecken: 'pool',
  teich: 'pond', pond: 'pond',
  pergola: 'pergola',
  mauer: 'gardenWall', gartenmauer: 'gardenWall', wand: 'wall',
  zaun: 'fence', tor: 'gate',
  treppe: 'stairs', stufen: 'stairs',
  weg: 'path', pfad: 'path',
  hochbeet: 'planter', beet: 'planter',
  bank: 'bench', sitzbank: 'bench',
  leuchte: 'light', licht: 'light', lampe: 'light',
  feuerstelle: 'firepit', felsen: 'rock', stein: 'rock',
  bewässerung: 'irrigation', bewaesserung: 'irrigation', drainage: 'drainage',
  gebäude: 'building', gebaeude: 'building', haus: 'building',
  carport: 'carport', wintergarten: 'winterGarden',
  fenster: 'window', tür: 'door', tuer: 'door', schiebetür: 'slidingDoor', schiebetuer: 'slidingDoor',
  balkon: 'balcony', geländer: 'railing', gelaender: 'railing', stütze: 'column', stuetze: 'column',
  dach: 'roof', bodenplatte: 'floor', innenwand: 'interiorWall'
};

function extractResponseText(data: unknown): string {
  const value = data as { output_text?: unknown; output?: unknown };
  if (typeof value?.output_text === 'string' && value.output_text.trim()) return value.output_text;

  const chunks: string[] = [];
  const output = Array.isArray(value?.output) ? value.output : [];
  for (const item of output as Array<{ content?: unknown }>) {
    for (const content of Array.isArray(item?.content) ? item.content : []) {
      const part = content as { text?: unknown };
      if (typeof part?.text === 'string') chunks.push(part.text);
    }
  }
  return chunks.join('\n').trim();
}

function cleanText(value: unknown): string {
  return String(value ?? '')
    .toLocaleLowerCase('de-DE')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function findNamedId(items: Array<{ id: number; name?: string; type?: string }>, id: unknown, name: unknown): number | null {
  const numericId = numberOrNull(id);
  if (numericId != null && items.some(item => item.id === numericId)) return numericId;

  const query = cleanText(name);
  if (!query) return null;

  const exact = items.find(item => cleanText(item.name) === query || cleanText(item.type) === query);
  if (exact) return exact.id;

  const contains = items.find(item => {
    const itemName = cleanText(item.name);
    const itemType = cleanText(item.type);
    return itemName.includes(query) || query.includes(itemName) || itemType === query;
  });
  return contains?.id ?? null;
}

function selectedObjectId(project: ProjectContext): number | null {
  const selectedId = numberOrNull(project?.editor?.selectedId);
  if (selectedId != null) return selectedId;
  const selectedIds = Array.isArray(project?.editor?.selectedObjectIds) ? project.editor.selectedObjectIds : [];
  return selectedIds.length ? numberOrNull(selectedIds[0]) : null;
}

function resolveObjectType(text: string): string | null {
  const normalized = cleanText(text);
  for (const [alias, type] of Object.entries(objectAliases)) {
    if (normalized.includes(cleanText(alias))) return type;
  }
  return null;
}

function parseGermanNumber(raw: string | undefined): number | null {
  if (!raw) return null;
  const value = Number(raw.replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

function fallbackActions(userText: string, project: ProjectContext): LooseAction[] {
  const text = cleanText(userText);
  const objects = Array.isArray(project.objects) ? project.objects : [];
  const selectedId = selectedObjectId(project);
  const actions: LooseAction[] = [];
  const objectType = resolveObjectType(userText);

  if (/\b(split|geteilt|nebeneinander)\b/.test(text)) {
    actions.push({ action: 'set_view', view: 'splitVertical', reason: 'Geteilte 2D/3D-Ansicht öffnen.' });
  } else if (/\b3d\b/.test(text) && /(zeig|offne|wechsel|ansicht)/.test(text)) {
    actions.push({ action: 'set_view', view: '3d', reason: '3D-Ansicht öffnen.' });
  } else if (/\b2d\b/.test(text) && /(zeig|offne|wechsel|ansicht)/.test(text)) {
    actions.push({ action: 'set_view', view: '2d', reason: '2D-Ansicht öffnen.' });
  }

  const countMatch = userText.match(/\b(\d{1,2})\s+(?:neue?\s+)?(?:bäume|baeume|bäume|bäume|bäume|sträucher|straeucher|leuchten|bänke|baenke|felsen|hochbeete|objekte)/i);
  const count = clamp(Number(countMatch?.[1] || 1), 1, 24);

  if (objectType && /(erstelle|erzeuge|setze|fuge|füge|plane|platziere|baue|generiere)/.test(text)) {
    const dimension = userText.match(/(\d+(?:[.,]\d+)?)\s*(?:m)?\s*[x×]\s*(\d+(?:[.,]\d+)?)/i);
    const width = parseGermanNumber(dimension?.[1]);
    const depth = parseGermanNumber(dimension?.[2]);
    const relation = /nord/.test(text) ? 'north' : /sud|süd/.test(text) ? 'south' : /ost|rechts/.test(text) ? 'east' : /west|links/.test(text) ? 'west' : null;
    actions.push({
      action: 'add_object', objectType, count, arrangement: count > 1 ? 'row' : null,
      width, depth, relation, referenceId: selectedId, reason: `${count} Objekt(e) unmittelbar erzeugen.`
    });
  }

  if (/(verschieb|beweg)/.test(text)) {
    const distanceMatch = userText.match(/(\d+(?:[.,]\d+)?)\s*(?:m|meter)?/i);
    const distance = parseGermanNumber(distanceMatch?.[1]) ?? 1;
    const deltaX = /ost|rechts/.test(text) ? distance : /west|links/.test(text) ? -distance : 0;
    const deltaY = /sud|süd|unten/.test(text) ? distance : /nord|oben/.test(text) ? -distance : 0;
    const targetId = selectedId ?? findNamedId(objects, null, userText) ?? (objectType ? objects.find(item => item.type === objectType)?.id ?? null : null);
    if (targetId != null && (deltaX !== 0 || deltaY !== 0)) {
      actions.push({ action: 'update_object', targetId, deltaX, deltaY, reason: 'Objekt relativ verschieben.' });
    }
  }

  if (/(mach|andere|ändere|skalier|vergrosser|vergrößer|verkleiner)/.test(text)) {
    const dimension = userText.match(/(\d+(?:[.,]\d+)?)\s*(?:m)?\s*[x×]\s*(\d+(?:[.,]\d+)?)/i);
    const targetId = selectedId ?? findNamedId(objects, null, userText) ?? (objectType ? objects.find(item => item.type === objectType)?.id ?? null : null);
    if (dimension && targetId != null) {
      actions.push({
        action: 'update_object', targetId,
        width: parseGermanNumber(dimension[1]), depth: parseGermanNumber(dimension[2]),
        reason: 'Objektmaße unmittelbar anpassen.'
      });
    }
  }

  if (/(losch|lösch|entfern)/.test(text)) {
    const targetId = selectedId ?? findNamedId(objects, null, userText) ?? (objectType ? objects.find(item => item.type === objectType)?.id ?? null : null);
    if (targetId != null) actions.push({ action: 'delete_object', targetId, destructive: true, reason: 'Gewünschtes Objekt löschen.' });
  }

  if (/(pruf|prüf|audit|kontrollier)/.test(text)) {
    actions.push({ action: 'run_audit', reason: 'Projektprüfung starten.' });
  }

  return actions;
}

function normalizeAction(raw: LooseAction, project: ProjectContext, index: number): LooseAction {
  const objects = Array.isArray(project.objects) ? project.objects : [];
  const terrain = Array.isArray(project.terrain) ? project.terrain : [];
  const zones = Array.isArray(project.zones) ? project.zones : [];
  const action = String(raw.action || '');
  const selectedId = selectedObjectId(project);

  let targetId = numberOrNull(raw.targetId);
  if (action.includes('object') || action === 'select_object') {
    targetId = findNamedId(objects, targetId, raw.targetName) ?? targetId;
    if (targetId == null && cleanText(raw.targetName).match(/^(dies|ausgewahlt|markiert|aktuell)/)) targetId = selectedId;
  } else if (action.includes('terrain')) {
    targetId = findNamedId(terrain, targetId, raw.targetName) ?? targetId;
  } else if (action.includes('zone')) {
    targetId = findNamedId(zones, targetId, raw.targetName) ?? targetId;
  }

  const referenceId = findNamedId(objects, raw.referenceId, raw.referenceName)
    ?? (cleanText(raw.referenceName).match(/^(dies|ausgewahlt|markiert|aktuell)/) ? selectedId : null);
  const fromId = findNamedId(objects, raw.fromId, raw.fromName);
  const toId = findNamedId(objects, raw.toId, raw.toName);
  const resolvedObjectType = gardenObjectTypes.includes(raw.objectType as typeof gardenObjectTypes[number])
    ? raw.objectType
    : resolveObjectType(String(raw.objectType || raw.targetName || raw.name || ''));
  const objectType = action === 'connect_objects' && !resolvedObjectType ? 'path' : resolvedObjectType;
  if (targetId == null && objectType && ['update_object','duplicate_object','delete_object','select_object'].includes(action)) {
    const matching = objects.filter(item => item.type === objectType);
    const selected = selectedId != null ? matching.find(item => item.id === selectedId) : undefined;
    targetId = selected?.id ?? (matching.length === 1 ? matching[0].id : null);
  }

  return {
    id: String(raw.id || `ai-${Date.now()}-${index}`),
    action,
    targetId: targetId ?? null,
    targetName: typeof raw.targetName === 'string' ? raw.targetName : null,
    referenceId: referenceId ?? null,
    referenceName: typeof raw.referenceName === 'string' ? raw.referenceName : null,
    fromId: fromId ?? null,
    fromName: typeof raw.fromName === 'string' ? raw.fromName : null,
    toId: toId ?? null,
    toName: typeof raw.toName === 'string' ? raw.toName : null,
    objectType: objectType ?? null,
    zoneKind: raw.zoneKind === 'plantZone' || raw.zoneKind === 'hardscape' ? raw.zoneKind : null,
    relation: typeof raw.relation === 'string' ? raw.relation : null,
    arrangement: typeof raw.arrangement === 'string' ? raw.arrangement : null,
    count: clamp(Math.round(numberOrNull(raw.count) ?? 1), 1, 24),
    spacing: numberOrNull(raw.spacing),
    deltaX: numberOrNull(raw.deltaX),
    deltaY: numberOrNull(raw.deltaY),
    name: typeof raw.name === 'string' ? raw.name : null,
    x: numberOrNull(raw.x), y: numberOrNull(raw.y), width: numberOrNull(raw.width), depth: numberOrNull(raw.depth),
    height: numberOrNull(raw.height), rotation: numberOrNull(raw.rotation), radius: numberOrNull(raw.radius),
    softness: numberOrNull(raw.softness), color: typeof raw.color === 'string' ? raw.color : null,
    material: typeof raw.material === 'string' ? raw.material : null,
    note: typeof raw.note === 'string' ? raw.note : null,
    budget: numberOrNull(raw.budget), area: numberOrNull(raw.area),
    location: typeof raw.location === 'string' ? raw.location : null,
    view: typeof raw.view === 'string' ? raw.view : null,
    destructive: Boolean(raw.destructive || action.startsWith('delete_')),
    reason: String(raw.reason || 'Vom AI Copilot ausgeführte Änderung.')
  };
}

function looksLikePlanCommand(text: string): boolean {
  return /(erstelle|erzeuge|setze|platziere|plane|gestalte|baue|generiere|verschieb|beweg|mach|andere|ändere|losch|lösch|entfern|duplizier|verbinde|offne|öffne|wechsel|pruf|prüf)/i.test(text);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = (Array.isArray(body?.messages) ? body.messages : [])
      .filter((message: IncomingMessage) => message && (message.role === 'user' || message.role === 'assistant'))
      .slice(-24)
      .map((message: IncomingMessage) => ({ role: message.role, content: String(message.content || '').slice(0, 7000) }));

    const project = (body?.project ?? {}) as ProjectContext;
    const requestedModel = String(body?.model || process.env.OPENAI_MODEL || 'gpt-5.2');
    const lastUserText = [...messages].reverse().find(message => message.role === 'user')?.content || '';

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        ok: false,
        code: 'missing_api_key',
        message: 'OPENAI_API_KEY ist in Vercel noch nicht gesetzt.'
      }, { status: 200 });
    }

    const instructions = `
Du bist der ausführende AL Green Design AI Copilot. Du verhältst dich dialogfähig und präzise, aber dein wichtigster Zweck ist: Nutzeranweisungen sofort in konkrete, ausführbare Planänderungen zu übersetzen.

WICHTIGER AUSFÜHRUNGSMODUS:
- Der Nutzer drückt in der Anwendung den Button „Bestätigen & sofort generieren“. Dieser Klick ist bereits die Bestätigung zur Ausführung.
- Wenn die Nachricht eine Änderungsanweisung enthält, MUSST du nach Möglichkeit ausführbare actions liefern. Antworte nicht nur mit einer Erklärung.
- Stelle nur dann eine Rückfrage, wenn eine Ausführung objektiv unmöglich ist. Triff sonst sinnvolle fachliche Annahmen und dokumentiere sie kurz in assumptions.
- Für Löschen und Ersetzen darfst du ebenfalls Aktionen liefern; die Anwendung erstellt davor automatisch einen Undo-Stand.
- Behaupte niemals, etwas geändert zu haben, wenn actions leer ist.

PLANVERSTÄNDNIS:
- Verwende die IDs aus dem Projektzustand. Bei „dieses“, „das markierte“ oder „das ausgewählte Objekt“ nutze editor.selectedId.
- Nutze targetName/referenceName nur als zusätzliche Hilfe; wenn eine ID bekannt ist, trage sie ein.
- Relative Bewegung: deltaX/deltaY verwenden. x positiv = Osten, x negativ = Westen, y negativ = Norden, y positiv = Süden.
- Relative Platzierung neben einem Objekt: referenceId + relation verwenden.
- Mehrere gleiche Elemente: eine add_object-Aktion mit count, spacing und arrangement verwenden.
- „Drei Bäume an der Nordgrenze“: count=3, arrangement=row, y ungefähr -5, sinnvolle x-Verteilung.
- „Rechts neben“, „östlich von“ = relation east. „Links neben“ = west. „Oberhalb/nördlich“ = north. „Unterhalb/südlich“ = south.
- „Verbinde Haus und Pool mit einem Weg“: connect_objects mit fromId, toId und objectType path.
- Wenn Maße fehlen, nutze realistische Standardmaße. Neue Objekte möglichst innerhalb x -10 bis 10 und y -6 bis 6 platzieren.
- Bei umfassenden Anweisungen wie „gestalte einen modernen Garten mit Pool, Pergola und Sichtschutz“ liefere mehrere koordinierte Aktionen.
- Verwende verständliche deutsche Namen und passende Materialien.
- Prüfe vor der Ausgabe intern: Sind Ziel-IDs korrekt? Sind alle geforderten Elemente enthalten? Sind Maße und Positionen plausibel?

DIALOG:
- Reine Wissens- oder Beratungsfragen dürfen ohne Aktionen beantwortet werden.
- Folgeanweisungen beziehen sich auf den bisherigen Dialog und den aktuellen Projektzustand.
- Antworte auf Deutsch, klar und knapp. Gib maximal vier kurze suggestions aus.

AKTUELLER PROJEKTZUSTAND:
${JSON.stringify(project).slice(0, 42000)}
`;

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Client-Request-Id': crypto.randomUUID()
      },
      body: JSON.stringify({
        model: requestedModel,
        instructions,
        input: messages,
        store: false,
        max_output_tokens: 7000,
        ...(requestedModel.startsWith('gpt-5') || requestedModel.startsWith('o')
          ? { reasoning: { effort: 'high' } }
          : {}),
        text: {
          format: {
            type: 'json_schema',
            name: 'al_green_design_instant_copilot',
            strict: true,
            schema: assistantSchema
          }
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({
        ok: false,
        code: 'openai_error',
        message: data?.error?.message || 'Die OpenAI-Anfrage war nicht erfolgreich.',
        details: data
      }, { status: 200 });
    }

    const raw = extractResponseText(data);
    if (!raw) {
      return NextResponse.json({
        ok: false,
        code: 'empty_response',
        message: 'Die KI hat keine verwertbare Antwort geliefert.'
      }, { status: 200 });
    }

    let result: {
      reply?: unknown;
      mode?: unknown;
      actions?: unknown;
      assumptions?: unknown;
      suggestions?: unknown;
    };

    try {
      result = JSON.parse(raw) as typeof result;
    } catch {
      return NextResponse.json({
        ok: false,
        code: 'invalid_json',
        message: 'Die KI-Antwort konnte nicht als Aktionsplan gelesen werden.',
        raw: raw.slice(0, 4000)
      }, { status: 200 });
    }

    let rawActions = Array.isArray(result.actions) ? result.actions as LooseAction[] : [];
    if (!rawActions.length && looksLikePlanCommand(lastUserText)) {
      rawActions = fallbackActions(lastUserText, project);
    }

    const actions = rawActions
      .map((action, index) => normalizeAction(action, project, index))
      .filter(action => typeof action.action === 'string' && action.action.length > 0);

    const mode = actions.length ? 'execute' : result.mode === 'question' ? 'question' : 'answer';
    const reply = actions.length
      ? String(result.reply || `Ich führe ${actions.length} Änderung${actions.length === 1 ? '' : 'en'} jetzt aus.`)
      : String(result.reply || 'Ich habe deine Anfrage ausgewertet.');

    return NextResponse.json({
      ok: true,
      model: requestedModel,
      responseId: data?.id || null,
      result: {
        reply,
        mode,
        actions,
        assumptions: Array.isArray(result.assumptions) ? result.assumptions.slice(0, 6) : [],
        suggestions: Array.isArray(result.suggestions) ? result.suggestions.slice(0, 4) : []
      }
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      code: 'server_error',
      message: 'Der KI-Copilot konnte die Anfrage nicht verarbeiten.',
      details: String(error)
    }, { status: 200 });
  }
}
