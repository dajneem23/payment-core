import { apiClient } from './client';
import type { FxRate, FxRateSnapshot, DepositRequest, DepositResult } from '../types';

export async function getAllRates(): Promise<FxRate[]> {
  const { data } = await apiClient.get<FxRate[]>('/fx/rates');
  return data;
}

export async function getRate(code: string): Promise<FxRate> {
  const { data } = await apiClient.get<FxRate>(`/fx/rates/${code}`);
  return data;
}

export async function getRateHistory(
  code: string,
  from?: string,
  to?: string,
  limit?: number,
): Promise<FxRateSnapshot[]> {
  const { data } = await apiClient.get<FxRateSnapshot[]>(
    `/fx/rates/${code}/history`,
    { params: { from, to, limit } },
  );
  return data;
}

export async function deposit(
  walletId: string,
  req: DepositRequest,
): Promise<DepositResult> {
  const idempotencyKey = crypto.randomUUID();
  const { data } = await apiClient.post<DepositResult>(
    `/api/v1/wallets/${walletId}/deposits`,
    req,
    {
      headers: {
        'Idempotency-Key': idempotencyKey,
        'X-User-Role': 'ADMIN',
      },
    },
  );
  return data;
}
