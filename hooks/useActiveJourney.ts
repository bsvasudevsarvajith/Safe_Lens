'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ActiveJourney, Coordinates, NavigationRoute } from '@/types';
import { calculateHaversineDistance } from '@/services/routingService';

const ACTIVE_JOURNEY_KEY = 'sr_active_journey';
const COMPLETED_TRIPS_KEY = 'sr_completed_trips';

export function useActiveJourney() {
  const [journey, setJourney] = useState<ActiveJourney | null>(null);
  const [activeRoute, setActiveRoute] = useState<NavigationRoute | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load from local storage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedJourney = localStorage.getItem(ACTIVE_JOURNEY_KEY);
      const savedRoute = localStorage.getItem('sr_active_route_data');
      if (savedJourney) setJourney(JSON.parse(savedJourney));
      if (savedRoute) setActiveRoute(JSON.parse(savedRoute));
    } catch (e) {
      console.error('Error reading active journey:', e);
    }
  }, []);

  // Save changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (journey) {
      localStorage.setItem(ACTIVE_JOURNEY_KEY, JSON.stringify(journey));
    } else {
      localStorage.removeItem(ACTIVE_JOURNEY_KEY);
      localStorage.removeItem('sr_active_route_data');
    }
  }, [journey]);

  // Start new journey
  const startJourney = useCallback((
    route: NavigationRoute,
    userId: string,
    originName: string = 'Current Location',
    destinationName: string = 'Destination'
  ) => {
    const origin = route.waypoints[0];
    const destination = route.waypoints[route.waypoints.length - 1];
    const etaDate = new Date(Date.now() + route.totalDurationMins * 60000);

    const newJourney: ActiveJourney = {
      id: `journey-${Date.now()}`,
      userId,
      routeId: route.id,
      routeTitle: route.title,
      origin,
      originName,
      destination,
      destinationName,
      startedAt: new Date().toISOString(),
      estimatedArrival: etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      totalDistanceKm: route.totalDistanceKm,
      remainingDistanceKm: route.totalDistanceKm,
      remainingDurationMins: route.totalDurationMins,
      progressPercent: 0,
      currentLocation: origin,
      currentStepIndex: 0,
      status: 'in_progress',
      safetyScore: route.safetyScore,
    };

    setJourney(newJourney);
    setActiveRoute(route);
    setIsSimulating(true);

    if (typeof window !== 'undefined') {
      localStorage.setItem(ACTIVE_JOURNEY_KEY, JSON.stringify(newJourney));
      localStorage.setItem('sr_active_route_data', JSON.stringify(route));
    }

    return newJourney;
  }, []);

  // End trip action
  const endTrip = useCallback((arrivedSafely: boolean = true) => {
    if (!journey) return;

    const completedRecord = {
      ...journey,
      status: 'completed',
      endedAt: new Date().toISOString(),
      arrivedSafely,
    };

    if (typeof window !== 'undefined') {
      try {
        const past = JSON.parse(localStorage.getItem(COMPLETED_TRIPS_KEY) || '[]');
        localStorage.setItem(COMPLETED_TRIPS_KEY, JSON.stringify([completedRecord, ...past]));
      } catch (e) {
        console.error('Error saving completed trip:', e);
      }
    }

    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
    }

    setJourney(null);
    setActiveRoute(null);
    return completedRecord;
  }, [journey]);

  // Continuously advance journey simulation along the waypoints
  useEffect(() => {
    if (!journey || journey.status !== 'in_progress' || !activeRoute || !isSimulating) {
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
      return;
    }

    const waypoints = activeRoute.waypoints;
    const totalWaypoints = waypoints.length;

    simulationIntervalRef.current = setInterval(() => {
      setJourney(prev => {
        if (!prev || prev.status !== 'in_progress') return prev;

        const nextStep = prev.currentStepIndex + 1;
        if (nextStep >= totalWaypoints) {
          // Reached destination!
          return {
            ...prev,
            progressPercent: 100,
            remainingDistanceKm: 0,
            remainingDurationMins: 0,
            currentLocation: waypoints[totalWaypoints - 1],
            status: 'completed',
          };
        }

        const newProgress = Math.min(99, Math.round((nextStep / (totalWaypoints - 1)) * 100));
        const remDist = Number((prev.totalDistanceKm * (1 - newProgress / 100)).toFixed(2));
        const remMins = Math.max(1, Math.round(activeRoute.totalDurationMins * (1 - newProgress / 100)));

        return {
          ...prev,
          currentStepIndex: nextStep,
          progressPercent: newProgress,
          remainingDistanceKm: remDist,
          remainingDurationMins: remMins,
          currentLocation: waypoints[nextStep],
        };
      });
    }, 4000); // Progress tick every 4 seconds

    return () => {
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
    };
  }, [journey?.id, journey?.status, activeRoute, isSimulating]);

  // Current turn instruction
  const currentInstruction = activeRoute?.instructions[journey?.currentStepIndex || 0]?.instruction ||
    `Proceed safely along ${activeRoute?.title || 'route'}`;

  return {
    journey,
    activeRoute,
    isSimulating,
    setIsSimulating,
    startJourney,
    endTrip,
    currentInstruction,
  };
}
