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
      // Placeholder only: never presented as the caller's real position.
      let latitude = 0;
      let longitude = 0;
      let accuracy = -1;
      let locationSource: 'gps' | 'unavailable' = 'unavailable';

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
          locationSource = 'gps';
        } catch {
          console.warn('GPS unavailable for SOS; sending alert without a location fix');
        }
      }

      // 2. Format notified contacts
      const notified = (user?.emergencyContacts ?? [])
        .filter(c => c.notifyOnSOS)
        .map(c => `${c.name} (${c.relationship}): ${c.phone}`);

      // 3. Log event to Firestore / system
      const event = await createSOSEvent({
        userId: user?.uid || 'anonymous-user',
        userName: user?.displayName || 'Emergency Caller',
        userPhone: user?.phoneNumber || '+1-Emergency',
        latitude,
        longitude,
        accuracyMeters: accuracy,
        notifiedContacts: notified,
        locationSource,
      });

      setActiveSOS(event);
      setFeedbackMessage(
        locationSource === 'gps'
          ? 'Emergency SOS recorded with your GPS location. Call 112 now if you are in danger.'
          : 'SOS recorded but your location could NOT be determined. Call 112 now and tell them where you are.'
      );

      // 4. Check if auto-dial is enabled in settings
      const settings = await getSystemSettings();
      if (settings.sosAutoDial && typeof window !== 'undefined') {
        const policePhone = settings.emergencyNumbers.police || '112';
        console.log(`SOS Auto-dial initiated to ${policePhone}`);
      }

      return event;
    } catch (err) {
      console.error('SOS activation error:', err);
      setFeedbackMessage('SOS could not be sent. Call 112 immediately.');
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
