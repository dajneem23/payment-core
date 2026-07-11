import { apiClient } from './client';

export interface TopupRequest {
  walletId: string;
  amount: string;
  currency: string;
  scheme: 'VISA' | 'MASTERCARD';
  cardToken: string;
  bin: string;
}

export interface TopupResult {
  paymentId: string;
  walletId: string;
  amount: string;
  currency: string;
  scheme: string;
  status: string;
  createdAt: string;
}

export async function topup(req: TopupRequest): Promise<TopupResult> {
  const idempotencyKey = crypto.randomUUID();
  const { data } = await apiClient.post<TopupResult>('/payments/topups', req, {
    headers: { 'Idempotency-Key': idempotencyKey },
  });
  return data;
}
