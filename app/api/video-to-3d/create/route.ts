import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const frameCount = Number(body?.frameCount || 0);
    const fileName = String(body?.fileName || 'video');

    return NextResponse.json({
      ok: true,
      job: {
        id: `v3d-${Date.now()}`,
        status: 'prepared',
        fileName,
        frameCount,
        pipeline: [
          'frame-selection',
          'camera-pose-estimation',
          'sparse-point-cloud',
          'dense-reconstruction',
          'mesh',
          'texture',
          'glb-export'
        ]
      },
      message: 'Rekonstruktionsauftrag vorbereitet. Für echte Mehrbild-Photogrammetrie muss ein separater 3D-Worker verbunden werden.'
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 400 });
  }
}
