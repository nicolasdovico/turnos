import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getToken } from './secureStore';
import { API_BASE_URL } from './api';

// Configuración del manejador de notificaciones en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Registra el dispositivo para recibir notificaciones push y obtiene el token.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Permisos de notificaciones no otorgados');
      return null;
    }

    // Obtener token del dispositivo
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;

    // Configurar canal de notificación para Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('turnos-reminders', {
        name: 'Recordatorios de Turnos',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10b981',
      });
    }

    // Sincronizar token con el backend si hay sesión activa
    await sendFcmTokenToBackend(token);

    return token;
  } catch (error) {
    console.error('Error registrando notificaciones push:', error);
    return null;
  }
}

/**
 * Envía el token Push / FCM al backend para asociarlo al usuario autenticado.
 */
export async function sendFcmTokenToBackend(fcmToken: string): Promise<boolean> {
  try {
    const authToken = await getToken();
    if (!authToken) {
      return false;
    }

    const response = await fetch(`${API_BASE_URL}/auth/fcm-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ fcm_token: fcmToken }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error al sincronizar token FCM con el backend:', error);
    return false;
  }
}

/**
 * Programa un recordatorio local en el dispositivo antes del inicio del turno.
 */
export async function scheduleLocalTurnoReminder(
  title: string,
  body: string,
  secondsFromNow: number,
  data: Record<string, any> = {}
): Promise<string> {
  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
      data,
    },
    trigger: {
      seconds: Math.max(1, secondsFromNow),
    },
  });
}
