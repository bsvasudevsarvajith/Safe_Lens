import { NextRequest, NextResponse } from 'next/server';
import { createSOSEvent } from '@/services/firebase/firestoreService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, userName, userPhone, latitude, longitude, accuracyMeters, notifiedContacts } = body;

    if (latitude == null || longitude == null) {
      return NextResponse.json({ error: 'Latitude and Longitude required' }, { status: 400 });
    }

    const event = await createSOSEvent({
      userId: userId || 'anonymous',
      userName: userName || 'Citizen',
      userPhone: userPhone || '+1-SOS',
      latitude: Number(latitude),
      longitude: Number(longitude),
      accuracyMeters: Number(accuracyMeters || 10),
      notifiedContacts: notifiedContacts || [],
    });

    return NextResponse.json(event);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'SOS creation error' }, { status: 500 });
  }
}
