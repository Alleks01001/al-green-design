import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

type IncomingMessage = {
  role: 'user' | 'assistant';
  content: string;
};

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
        'add_object','update_object','delete_object',
        'add_terrain','update_terrain','delete_terrain',
        'add_zone','update_zone','delete_zone',
        'update_project','set_view','select_object','run_audit'
      ]
    },
    targetId: { type: ['number','null'] },
    objectType: { type: ['string','null'], enum: [...gardenObjectTypes, null] },
    zoneKind: { type: ['string','null'], enum: ['plantZone','hardscape',null] },
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
    'id','action','targetId','objectType','zoneKind','name','x','y','width','depth','height',
    'rotation','radius','softness','color','material','note','budget','area','location','view',
    'destructive','reason'
  ]
} as const;

const assistantSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    reply: { type: 'string' },
    mode: { type: 'string', enum: ['answer','question','plan'] },
    requiresConfirmation: { type: 'boolean' },
    confirmationQuestion: { type: ['string','null'] },
    actions: { type: 'array', items: actionSchema },
    suggestions: { type: 'array', items: { type: 'string' } }
  },
  required: ['reply','mode','requiresConfirmation','confirmationQuestion','actions','suggestions']
} as const;

function extractResponseText(data: any): string {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) return data.output_text;

  const chunks: string[] = [];
  for (const item of Array.isArray(data?.output) ? data.output : []) {
    for (const content of Array.isArray(item?.content) ? item.content : []) {
      if (typeof content?.text === 'string') chunks.push(content.text);
    }
  }
  return chunks.join('\n').trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = (Array.isArray(body?.messages) ? body.messages : [])
      .filter((message: IncomingMessage) => message && (message.role === 'user' || message.role === 'assistant'))
      .slice(-18)
      .map((message: IncomingMessage) => ({ role: message.role, content: String(message.content || '').slice(0, 6000) }));

    const project = body?.project ?? {};
    const requestedModel = String(body?.model || process.env.OPENAI_MODEL || 'gpt-5.2');

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        ok: false,
        code: 'missing_api_key',
        message: 'OPENAI_API_KEY ist in Vercel noch nicht gesetzt.'
      }, { status: 200 });
    }

    const instructions = `
Du bist der AL Green Design Copilot, ein deutschsprachiger Assistent für Landschaftsarchitektur, Gartenplanung und die Bedienung des aktuellen Projekts.

Deine Arbeitsweise:
- Verstehe natürliche Sprache wie ein kompetenter Chat-Assistent und berücksichtige den bisherigen Dialog.
- Beantworte Wissens- und Beratungsfragen verständlich. Für reine Beratung sind keine Aktionen nötig.
- Wenn der Nutzer den Plan verändern möchte, liefere präzise Aktionen, die die Anwendung ausführen kann.
- Behaupte niemals, etwas geändert zu haben, wenn du keine passende Aktion ausgibst.
- Bei mehrdeutigen geometrischen Änderungen stelle genau eine gezielte Rückfrage und gib keine Aktion aus.
- Löschen oder großflächiges Ersetzen ist immer destructive=true und requiresConfirmation=true.
- Hinzufügen, Verschieben, Skalieren, Umbenennen und Materialänderungen dürfen direkt geplant werden.
- Nutze vorhandene Objekt-IDs für Änderungen. Erfinde keine targetId für bestehende Objekte.
- Koordinaten sind Meter: x negativ = Westen, x positiv = Osten, y negativ = Norden, y positiv = Süden.
- Halte neue Objekte möglichst innerhalb von x -10 bis 10 und y -6 bis 6.
- Nutze realistische Maße. rotation ist in Grad.
- Antworte auf Deutsch, klar und ohne unnötige Fachsprache.
- Gib höchstens vier kurze Anschlussvorschläge aus.

Aktueller Projektzustand:
${JSON.stringify(project).slice(0, 30000)}
`;

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: requestedModel,
        instructions,
        input: messages,
        ...(requestedModel.startsWith('gpt-5') || requestedModel.startsWith('o')
          ? { reasoning: { effort: 'medium' } }
          : {}),
        text: {
          format: {
            type: 'json_schema',
            name: 'al_green_design_copilot',
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

    let result: any;
    try {
      result = JSON.parse(raw);
    } catch {
      return NextResponse.json({
        ok: false,
        code: 'invalid_json',
        message: 'Die KI-Antwort konnte nicht als Aktionsplan gelesen werden.',
        raw: raw.slice(0, 4000)
      }, { status: 200 });
    }

    return NextResponse.json({
      ok: true,
      model: requestedModel,
      responseId: data?.id || null,
      result
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
