import * as SecureStore from 'expo-secure-store';
import {
  saveToken,
  getToken,
  deleteToken,
  saveUser,
  getUser,
  deleteUser,
  clearAuth,
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
} from '../src/services/secureStore';
import { User } from '../src/types';

// Mock de expo-secure-store
jest.mock('expo-secure-store', () => {
  const store: Record<string, string> = {};
  return {
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store[key] = value;
    }),
    getItemAsync: jest.fn(async (key: string) => {
      return store[key] || null;
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      delete store[key];
    }),
    __store: store,
  };
});

describe('Servicio de Almacenamiento Seguro (SecureStore)', () => {
  const mockUser: User = {
    id: 42,
    name: 'Carlos Pádel',
    email: 'carlos@padelpro.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('guarda el token Bearer correctamente en SecureStore con la clave auth_token', async () => {
    const token = '1|sanctum_bearer_token_secret_12345';
    await saveToken(token);

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(AUTH_TOKEN_KEY, token);
    const retrieved = await getToken();
    expect(retrieved).toBe(token);
  });

  it('retorna null cuando no existe token almacenado', async () => {
    await deleteToken();
    const token = await getToken();
    expect(token).toBeNull();
  });

  it('elimina el token Bearer de forma segura', async () => {
    await saveToken('token_a_eliminar');
    await deleteToken();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(AUTH_TOKEN_KEY);
    const token = await getToken();
    expect(token).toBeNull();
  });

  it('guarda y recupera el objeto de usuario serializado en JSON', async () => {
    await saveUser(mockUser);

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      AUTH_USER_KEY,
      JSON.stringify(mockUser)
    );

    const user = await getUser();
    expect(user).toEqual(mockUser);
    expect(user?.email).toBe('carlos@padelpro.com');
  });

  it('retorna null si el JSON guardado es inválido o no existe', async () => {
    await deleteUser();
    const user = await getUser();
    expect(user).toBeNull();
  });

  it('clearAuth elimina tanto el token como el usuario de la memoria segura', async () => {
    await saveToken('token_activo');
    await saveUser(mockUser);

    await clearAuth();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(AUTH_TOKEN_KEY);
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(AUTH_USER_KEY);

    const token = await getToken();
    const user = await getUser();

    expect(token).toBeNull();
    expect(user).toBeNull();
  });
});
