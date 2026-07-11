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

export interface PaymentDetail {
  paymentId: string;
  walletId: string;
  scheme: string;
  bin: string;
  amount: number;
  currency: string;
  status: string;
  providerRef: string | null;
  createdAt: string;
}

export async function topup(req: TopupRequest): Promise<TopupResult> {
  const idempotencyKey = crypto.randomUUID();
  const { data } = await apiClient.post<TopupResult>('/payments/topups', req, {
    headers: { 'Idempotency-Key': idempotencyKey },
  });
  return data;
}

export async function getPayment(id: string): Promise<PaymentDetail> {
  const { data } = await apiClient.get<PaymentDetail>(`/payments/${id}`);
  return data;
}
