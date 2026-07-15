import { NextResponse } from 'next/server';
import OpenAI from 'openai';

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
          type: {
            type: 'string',
            enum: [
              'modern_house',
              'glass_house',
              'floor',
              'wall',
              'interior_wall',
              'roof',
              'window',
              'door',
              'sliding_door',
              'balcony',
              'railing',
              'column',
              'carport',
              'winter_garden',
              'pool',
              'pergola',
              'tree',
              'shrub'
            ]
          },
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

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        ok: false,
        fallback: true,
        error: 'OPENAI_API_KEY ist nicht gesetzt.'
      });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.chat.completions.create({
      model: model || 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'Du bist Landschaftsarchitekt und Gebäudeplaner. Interpretiere den vollständigen Wunsch. Erzeuge nicht nur einen Gebäudekubus: nutze bei Gebäuden sinnvolle Bauteile wie Bodenplatte, Außen-/Innenwände, Dach, Fenster, Türen, Schiebetüren, Balkon, Geländer und Stützen. Platziere Garten, Gelände und Architektur logisch. Antworte ausschließlich im vorgegebenen JSON-Schema.'
        },
        { role: 'user', content: String(prompt || '') }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'garden_architecture_layout',
          schema: GardenSchema,
          strict: true
        }
      }
    });

    const raw = response.choices[0]?.message?.content || '{}';
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
