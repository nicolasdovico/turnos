export interface User {
  id: number;
  name: string;
  email: string;
  created_at?: string;
  updated_at?: string;
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
