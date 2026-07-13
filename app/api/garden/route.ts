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
            enum: ['modern_house', 'glass_house', 'pool', 'pergola', 'tree', 'shrub']
          },
          x: { type: 'number' },
          z: { type: 'number' },
          scaleX: { type: 'number' },
          scaleY: { type: 'number' },
          scaleZ: { type: 'number' },
          rotation: { type: 'number' }
        },
        required: ['id', 'type', 'x', 'z', 'scaleX', 'scaleY', 'scaleZ', 'rotation'],
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
      return NextResponse.json(
        {
          ok: false,
          fallback: true,
          error: 'OPENAI_API_KEY ist nicht gesetzt.'
        },
        { status: 200 }
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.chat.completions.create({
      model: model || 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'Du bist ein präziser Landschaftsarchitekt. Platziere Objekte logisch: Haus zentral oder an sinnvoller Stelle, Pool daneben, Bäume an Rand und Sichtachsen, Pergola bei Terrasse. Antworte ausschließlich im vorgegebenen JSON-Format.'
        },
        { role: 'user', content: String(prompt || '') }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'garden_layout',
          schema: GardenSchema,
          strict: true
        }
      }
    });

    const raw = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw);

    return NextResponse.json({ ok: true, layout: parsed });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        fallback: true,
        error: 'Fehler bei der KI-Generierung',
        details: String(error)
      },
      { status: 200 }
    );
  }
}
