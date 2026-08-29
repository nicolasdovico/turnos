export interface User {
  id: number;
  name: string;
  email: string;
  fcm_token?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Cancha {
  id: number;
  complejo_id: number;
  nombre: string;
  deporte: string;
  superficie: string;
  techada: boolean;
  precio_base: number;
  estado: string;
}

export interface Complejo {
  id: number;
  uuid: string;
  nombre: string;
  subdominio: string;
  dominio_personalizado?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  direccion?: string | null;
  ciudad?: string | null;
  telefono?: string | null;
  distancia_km?: number;
  deportes_disponibles?: string[];
  canchas?: Cancha[];
}

export interface NearbyComplejosResponse {
  data: Complejo[];
  total: number;
  lat_origen: number;
  lng_origen: number;
  radio_km: number;
}

export interface AuthResponse {
  token: string;
  user: User;
  message?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
