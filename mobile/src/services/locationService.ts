import * as Location from 'expo-location';
import { Complejo, NearbyComplejosResponse } from '../types';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api';

/**
 * Solicita permisos de acceso a la ubicación en primer plano al usuario.
 */
export async function requestLocationPermissions(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error solicitando permisos de ubicación:', error);
    return false;
  }
}

/**
 * Obtiene las coordenadas GPS actuales del dispositivo.
 */
export async function getCurrentCoordinates(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const hasPermission = await requestLocationPermissions();
    if (!hasPermission) {
      return null;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    console.error('Error obteniendo ubicación actual:', error);
    return null;
  }
}

/**
 * Consulta el endpoint de backend para obtener complejos deportivos cercanos.
 */
export async function fetchNearbyComplejos(
  lat: number,
  lng: number,
  radioKm: number = 20,
  deporte?: string
): Promise<Complejo[]> {
  const queryParams = new URLSearchParams({
    lat: lat.toString(),
    lng: lng.toString(),
    radio_km: radioKm.toString(),
  });

  if (deporte) {
    queryParams.append('deporte', deporte);
  }

  const response = await fetch(`${API_BASE_URL}/complejos/cercanos?${queryParams.toString()}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Error al obtener complejos cercanos');
  }

  const data = (await response.json()) as NearbyComplejosResponse;
  return data.data;
}
