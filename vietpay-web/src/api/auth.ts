import { apiClient } from './client';
import type { AuthTokens, LoginRequest, RegisterRequest } from '../types';

export async function login(req: LoginRequest): Promise<AuthTokens> {
  const { data } = await apiClient.post<AuthTokens>('/auth/login', req);
  return data;
}

export async function register(req: RegisterRequest): Promise<AuthTokens> {
  const { data } = await apiClient.post<AuthTokens>('/auth/register', req);
  return data;
}

export async function refresh(refreshToken: string): Promise<AuthTokens> {
  const { data } = await apiClient.post<AuthTokens>('/auth/refresh', { refreshToken });
  return data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}

export async function verify(): Promise<{ sub: string; role: string }> {
  const { data } = await apiClient.get('/auth/verify');
  return data;
}
