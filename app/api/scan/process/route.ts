import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    return NextResponse.json({
      ok: true,
      status: 'accepted',
      message: 'Scan-Metadaten angenommen. Mesh-/Punktwolken-Pipeline ist als nächster Backend-Schritt vorgesehen.',
      received: {
        source: body?.source ?? 'unknown',
        fileCount: Array.isArray(body?.files) ? body.files.length : 0
      }
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: 'Scan-Anfrage konnte nicht verarbeitet werden.', details: String(error) },
      { status: 400 }
    );
  }
}
