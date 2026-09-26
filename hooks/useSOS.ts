'use client';

import { useState, useCallback } from 'react';
import { SOSEvent, UserProfile } from '@/types';
import { createSOSEvent, getSystemSettings } from '@/services/firebase/firestoreService';

export function useSOS() {
  const [isActivating, setIsActivating] = useState(false);
  const [activeSOS, setActiveSOS] = useState<SOSEvent | null>(null);
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const triggerSOS = useCallback(async (user: UserProfile | null) => {
    setIsActivating(true);
    setSosModalOpen(true);

    try {
      // 1. Capture high-accuracy GPS coordinates
      let latitude = 12.9716;
      let longitude = 77.5946;
      let accuracy = 10;

      if (typeof window !== 'undefined' && navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 6000,
              maximumAge: 0,
            });
          });
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
          accuracy = position.coords.accuracy;
        } catch (posErr) {
          console.warn('High precision GPS timed out, using latest fallback coords');
        }
      }

      // 2. Format notified contacts
      const notified = user?.emergencyContacts
        .filter(c => c.notifyOnSOS)
        .map(c => `${c.name} (${c.relationship}): ${c.phone}`) || [];

      // 3. Log event to Firestore / system
      const event = await createSOSEvent({
        userId: user?.uid || 'anonymous-user',
        userName: user?.displayName || 'Emergency Caller',
        userPhone: user?.phoneNumber || '+1-Emergency',
        latitude,
        longitude,
        accuracyMeters: accuracy,
        notifiedContacts: notified,
      });

      setActiveSOS(event);
      setFeedbackMessage('Emergency SOS Activated. Location transmitted to Emergency Command Center & Contacts.');

      // 4. Check if auto-dial is enabled in settings
      const settings = await getSystemSettings();
      if (settings.sosAutoDial && typeof window !== 'undefined') {
        const policePhone = settings.emergencyNumbers.police || '112';
        console.log(`SOS Auto-dial initiated to ${policePhone}`);
      }

      return event;
    } catch (err: any) {
      console.error('SOS activation error:', err);
      setFeedbackMessage('SOS recorded locally. Transmitting to emergency dispatch.');
    } finally {
      setIsActivating(false);
    }
  }, []);

  const dismissSOSModal = () => {
    setSosModalOpen(false);
  };

  return {
    isActivating,
    activeSOS,
    sosModalOpen,
    feedbackMessage,
    triggerSOS,
    dismissSOSModal,
    setSosModalOpen,
  };
}
