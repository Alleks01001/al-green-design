import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { prompt, model } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          fallback: true,
          message: 'OPENAI_API_KEY ist nicht gesetzt. Lokaler Fallback verwenden.'
        },
        { status: 200 }
      );
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model || 'gpt-5',
        input: [
          {
            role: 'system',
            content:
              'Du bist ein Landschaftsarchitektur-Agent. Antworte kompakt und liefere konkrete Gartenobjekte, Geländeformen, Zonen, Gebäude und Empfehlungen.'
          },
          {
            role: 'user',
            content: String(prompt || '')
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          fallback: true,
          message: 'OpenAI-Antwort war nicht erfolgreich.',
          details: data
        },
        { status: 200 }
      );
    }

    const text =
      data?.output_text ||
      data?.output?.[0]?.content?.[0]?.text ||
      JSON.stringify(data).slice(0, 1200);

    return NextResponse.json({ ok: true, text });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        fallback: true,
        message: 'Fehler in der OpenAI-Route.',
        details: String(error)
      },
      { status: 200 }
    );
  }
}
