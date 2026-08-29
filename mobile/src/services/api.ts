import { AuthResponse, User } from '../types';
import { getToken } from './secureStore';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api';

/**
 * Cliente HTTP base para la API con inyección de Bearer Token.
 */
async function fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = await getToken();
  const headers = new Headers(options.headers || {});

  headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
}

/**
 * Iniciar sesión en la API de Laravel Sanctum.
 */
export async function loginApi(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Error al iniciar sesión');
  }

  return data as AuthResponse;
}

/**
 * Registrar un nuevo usuario en la plataforma.
 */
export async function registerApi(
  name: string,
  email: string,
  password: string,
  passwordConfirmation: string
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      name,
      email,
      password,
      password_confirmation: passwordConfirmation,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Error al registrar usuario');
  }

  return data as AuthResponse;
}

/**
 * Cerrar sesión en el backend.
 */
export async function logoutApi(): Promise<void> {
  try {
    await fetchWithAuth('/auth/logout', {
      method: 'POST',
    });
  } catch (error) {
    // Ignorar errores de red en logout para garantizar borrado local
  }
}

/**
 * Obtener datos del perfil actual.
 */
export async function getProfileApi(): Promise<User> {
  const response = await fetchWithAuth('/auth/me', {
    method: 'GET',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Error al obtener perfil');
  }

  return data.user as User;
}
