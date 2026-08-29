import { loginApi, registerApi, logoutApi, getProfileApi } from '../src/services/api';
import * as secureStore from '../src/services/secureStore';

// Mock de fetch global
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

// Mock de secureStore
jest.mock('../src/services/secureStore', () => ({
  getToken: jest.fn(),
  saveToken: jest.fn(),
  saveUser: jest.fn(),
  clearAuth: jest.fn(),
}));

describe('Cliente API de Autenticación Mobile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loginApi envía credenciales correctas y retorna token y usuario', async () => {
    const mockResponse = {
      token: '1|token_12345',
      user: { id: 1, name: 'Jugador', email: 'jugador@test.com' },
      message: 'Inicio de sesión exitoso',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await loginApi('jugador@test.com', 'password123');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/login'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'jugador@test.com', password: 'password123' }),
      })
    );
    expect(result.token).toBe('1|token_12345');
    expect(result.user.name).toBe('Jugador');
  });

  it('loginApi lanza error ante credenciales incorrectas', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Las credenciales proporcionadas son incorrectas.' }),
    });

    await expect(loginApi('jugador@test.com', 'wrong')).rejects.toThrow(
      'Las credenciales proporcionadas son incorrectas.'
    );
  });

  it('registerApi envía datos completos y retorna 201 con token', async () => {
    const mockResponse = {
      token: '2|new_token_67890',
      user: { id: 2, name: 'Nuevo Jugador', email: 'nuevo@test.com' },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await registerApi('Nuevo Jugador', 'nuevo@test.com', 'pass1234', 'pass1234');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/register'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          name: 'Nuevo Jugador',
          email: 'nuevo@test.com',
          password: 'pass1234',
          password_confirmation: 'pass1234',
        }),
      })
    );
    expect(result.token).toBe('2|new_token_67890');
  });

  it('getProfileApi inyecta Bearer token en cabecera Authorization', async () => {
    (secureStore.getToken as jest.Mock).mockResolvedValueOnce('secret_bearer_token');

    const mockProfile = { id: 1, name: 'Jugador Autenticado', email: 'auth@test.com' };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: mockProfile }),
    });

    const profile = await getProfileApi();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/me'),
      expect.objectContaining({
        headers: expect.any(Headers),
      })
    );
    expect(profile.name).toBe('Jugador Autenticado');
  });
});
