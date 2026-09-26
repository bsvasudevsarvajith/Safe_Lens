import { NextRequest, NextResponse } from 'next/server';
import { analyzeCCTVFeed } from '@/services/aiCctvService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cameraId, cameraCode, sourceType, dataUrlOrStream } = body;

    if (!cameraId || !dataUrlOrStream) {
      return NextResponse.json({ error: 'cameraId and dataUrlOrStream required' }, { status: 400 });
    }

    const analysis = await analyzeCCTVFeed({
      cameraId,
      cameraCode: cameraCode || 'CCTV-AUTO',
      sourceType: sourceType === 'image' ? 'image' : 'video',
      dataUrlOrStream,
    });

    return NextResponse.json(analysis);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Vision analysis error' }, { status: 500 });
  }
}
