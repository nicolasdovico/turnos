import * as SecureStore from 'expo-secure-store';
import { User } from '../types';

export const AUTH_TOKEN_KEY = 'auth_token';
export const AUTH_USER_KEY = 'auth_user';

/**
 * Guarda el token Bearer en almacenamiento seguro del dispositivo.
 */
export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
}

/**
 * Recupera el token Bearer del almacenamiento seguro.
 */
export async function getToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
}

/**
 * Elimina el token Bearer del almacenamiento seguro.
 */
export async function deleteToken(): Promise<void> {
  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
}

/**
 * Guarda la información del usuario serializada en JSON de forma segura.
 */
export async function saveUser(user: User): Promise<void> {
  const jsonUser = JSON.stringify(user);
  await SecureStore.setItemAsync(AUTH_USER_KEY, jsonUser);
}

/**
 * Recupera y deserializa el usuario guardado.
 */
export async function getUser(): Promise<User | null> {
  const jsonUser = await SecureStore.getItemAsync(AUTH_USER_KEY);
  if (!jsonUser) return null;
  try {
    return JSON.parse(jsonUser) as User;
  } catch (error) {
    return null;
  }
}

/**
 * Elimina la información del usuario del almacenamiento seguro.
 */
export async function deleteUser(): Promise<void> {
  await SecureStore.deleteItemAsync(AUTH_USER_KEY);
}

/**
 * Limpia todas las credenciales y tokens guardados en el dispositivo.
 */
export async function clearAuth(): Promise<void> {
  await deleteToken();
  await deleteUser();
}
