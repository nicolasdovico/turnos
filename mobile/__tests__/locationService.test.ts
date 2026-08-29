import * as Location from 'expo-location';
import {
  requestLocationPermissions,
  getCurrentCoordinates,
  fetchNearbyComplejos,
} from '../src/services/locationService';

// Mock de expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: {
    Balanced: 3,
  },
}));

// Mock de fetch global
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

describe('Servicio de Geolocalización (LocationService)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requestLocationPermissions retorna true cuando los permisos son concedidos', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: 'granted',
    });

    const result = await requestLocationPermissions();
    expect(result).toBe(true);
  });

  it('requestLocationPermissions retorna false cuando los permisos son denegados', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: 'denied',
    });

    const result = await requestLocationPermissions();
    expect(result).toBe(false);
  });

  it('getCurrentCoordinates retorna latitud y longitud actuales', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: 'granted',
    });
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValueOnce({
      coords: {
        latitude: -34.6037,
        longitude: -58.3816,
      },
    });

    const coords = await getCurrentCoordinates();

    expect(coords).toEqual({
      latitude: -34.6037,
      longitude: -58.3816,
    });
  });

  it('fetchNearbyComplejos consulta endpoint con parámetros espaciales y retorna lista de clubes', async () => {
    const mockComplejosResponse = {
      data: [
        { id: 1, nombre: 'Padel Palermo', distancia_km: 2.3, deportes_disponibles: ['padel'] },
        { id: 2, nombre: 'Tenis Belgrano', distancia_km: 8.5, deportes_disponibles: ['tenis'] },
      ],
      total: 2,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockComplejosResponse,
    });

    const clubes = await fetchNearbyComplejos(-34.6000, -58.3800, 15, 'padel');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/complejos/cercanos?lat=-34.6&lng=-58.38&radio_km=15&deporte=padel'),
      expect.objectContaining({
        method: 'GET',
      })
    );
    expect(clubes).toHaveLength(2);
    expect(clubes[0].nombre).toBe('Padel Palermo');
    expect(clubes[0].distancia_km).toBe(2.3);
  });
});
