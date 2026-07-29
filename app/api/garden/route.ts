import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const GardenSchema = {
  type: 'object',
  properties: {
    terrain: {
      type: 'object',
      properties: {
        style: { type: 'string', enum: ['flat', 'hilly', 'sunken'] },
        intensity: { type: 'number' }
      },
      required: ['style', 'intensity'],
      additionalProperties: false
    },
    objects: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string' },
          x: { type: 'number' },
          z: { type: 'number' },
          scaleX: { type: 'number' },
          scaleY: { type: 'number' },
          scaleZ: { type: 'number' },
          rotation: { type: 'number' },
          subtype: { type: 'string' }
        },
        required: ['id', 'type', 'x', 'z', 'scaleX', 'scaleY', 'scaleZ', 'rotation', 'subtype'],
        additionalProperties: false
      }
    }
  },
  required: ['terrain', 'objects'],
  additionalProperties: false
};

export async function POST(req: Request) {
  try {
    const { prompt, model } = await req.json();
    const userPrompt = String(prompt || '').trim();

    if (!userPrompt) {
      return NextResponse.json({ ok: false, fallback: true, error: 'Bitte zuerst eine Gartenbeschreibung eingeben.' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        ok: false,
        fallback: true,
        error: 'OPENAI_API_KEY ist in Vercel nicht gesetzt. Lokale Generierung wird verwendet.'
      });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model || process.env.OPENAI_MODEL || 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'Du bist Landschaftsarchitekt und Gebäudeplaner. Interpretiere den vollständigen Wunsch. Erzeuge nicht nur einen Gebäudekubus: nutze bei Gebäuden sinnvolle Bauteile wie Bodenplatte, Außen-/Innenwände, Dach, Fenster, Türen, Schiebetüren, Balkon, Geländer und Stützen. Platziere Garten, Gelände und Architektur logisch. Antworte ausschließlich im vorgegebenen JSON-Schema.'
          },
          { role: 'user', content: userPrompt }
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'garden_architecture_layout',
            schema: GardenSchema,
            strict: true
          }
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({
        ok: false,
        fallback: true,
        error: 'OpenAI-Anfrage war nicht erfolgreich.',
        details: data
      });
    }

    const raw = data?.choices?.[0]?.message?.content || '{}';
    return NextResponse.json({ ok: true, layout: JSON.parse(raw) });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      fallback: true,
      error: 'Fehler bei der KI-Generierung.',
      details: String(error)
    });
  }
}
