'use client';

import { useState, useEffect, useCallback } from 'react';
import { Coordinates } from '@/types';
import { CITY_CENTER } from '@/lib/mockData/initialData';

export interface GeolocationState {
  coords: Coordinates;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  error: string | null;
  loading: boolean;
  refresh: () => void;
}

export function useGeolocation(watch: boolean = false): GeolocationState {
  const [coords, setCoords] = useState<Coordinates>(CITY_CENTER);
  const [accuracy, setAccuracy] = useState<number | null>(10);
  const [heading, setHeading] = useState<number | null>(null);
  const [speed, setSpeed] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const updatePosition = useCallback((position: GeolocationPosition) => {
    setCoords({
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    });
    setAccuracy(position.coords.accuracy);
    setHeading(position.coords.heading);
    setSpeed(position.coords.speed);
    setError(null);
    setLoading(false);
  }, []);

  const handleError = useCallback((err: GeolocationPositionError) => {
    console.warn('Geolocation notice (falling back to default city center coordinates):', err.message);
    setError(err.message);
    setLoading(false);
  }, []);

  const refresh = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setError('Geolocation not supported by this browser');
      setLoading(false);
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(updatePosition, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  }, [updatePosition, handleError]);

  useEffect(() => {
    refresh();

    if (watch && typeof window !== 'undefined' && navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(updatePosition, handleError, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 2000,
      });
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [watch, refresh, updatePosition, handleError]);

  return { coords, accuracy, heading, speed, error, loading, refresh };
}
