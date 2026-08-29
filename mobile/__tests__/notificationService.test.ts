import * as Notifications from 'expo-notifications';
import {
  registerForPushNotificationsAsync,
  sendFcmTokenToBackend,
  scheduleLocalTurnoReminder,
} from '../src/services/notificationService';
import * as secureStore from '../src/services/secureStore';

// Mock de react-native
jest.mock('react-native', () => ({
  Platform: {
    OS: 'android',
  },
}));

// Mock de expo-secure-store
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock de expo-notifications
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  AndroidImportance: {
    HIGH: 4,
  },
}));

// Mock de secureStore
jest.mock('../src/services/secureStore', () => ({
  getToken: jest.fn(),
}));

// Mock de fetch global
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

describe('Servicio de Notificaciones Push (NotificationService)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registerForPushNotificationsAsync solicita permisos, obtiene token y lo sincroniza', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: 'granted',
    });
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValueOnce({
      data: 'ExponentPushToken[mock_token_12345]',
    });
    (secureStore.getToken as jest.Mock).mockResolvedValueOnce('user_auth_token_abc');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Token FCM actualizado correctamente' }),
    });

    const token = await registerForPushNotificationsAsync();

    expect(token).toBe('ExponentPushToken[mock_token_12345]');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/fcm-token'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer user_auth_token_abc',
        }),
        body: JSON.stringify({ fcm_token: 'ExponentPushToken[mock_token_12345]' }),
      })
    );
  });

  it('registerForPushNotificationsAsync retorna null si los permisos son denegados', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: 'undetermined',
    });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: 'denied',
    });

    const token = await registerForPushNotificationsAsync();
    expect(token).toBeNull();
  });

  it('scheduleLocalTurnoReminder programa una notificación local en el dispositivo', async () => {
    (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValueOnce('notification_id_999');

    const notifId = await scheduleLocalTurnoReminder(
      '⏰ Recordatorio de Turno',
      'Tu partido en Cancha 1 comienza en 30 minutos',
      1800,
      { turno_id: '123' }
    );

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: {
        title: '⏰ Recordatorio de Turno',
        body: 'Tu partido en Cancha 1 comienza en 30 minutos',
        sound: 'default',
        data: { turno_id: '123' },
      },
      trigger: {
        seconds: 1800,
      },
    });
    expect(notifId).toBe('notification_id_999');
  });

  it('sendFcmTokenToBackend retorna false si no hay sesión activa', async () => {
    (secureStore.getToken as jest.Mock).mockResolvedValueOnce(null);

    const result = await sendFcmTokenToBackend('some_token');
    expect(result).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
