import { NextRequest, NextResponse } from 'next/server';
import { generateMultiRoutes } from '@/services/routingService';
import {
  getCCTVCameras,
  getSafetyZones,
  getVerifiedThreats,
  getSystemSettings,
} from '@/services/firebase/firestoreService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { origin, destination, engineMode } = body;

    if (!origin || !destination) {
      return NextResponse.json({ error: 'Origin and destination coordinates required' }, { status: 400 });
    }

    const [cameras, zones, verifiedThreats, settings] = await Promise.all([
      getCCTVCameras(),
      getSafetyZones(),
      getVerifiedThreats(),
      getSystemSettings(),
    ]);

    const activeMode = engineMode || settings.engineMode || 'hybrid';

    const routes = await generateMultiRoutes({
      origin,
      destination,
      context: {
        safetyZones: zones,
        cctvCameras: cameras,
        verifiedThreats,
      },
      engineMode: activeMode,
    });

    return NextResponse.json({
      engineMode: activeMode,
      routes,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Route generation error' }, { status: 500 });
  }
}
