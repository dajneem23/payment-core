import { apiClient } from './client';
import type { TransferRequest, TransferResult } from '../types';

export async function transfer(req: TransferRequest): Promise<TransferResult> {
  const idempotencyKey = crypto.randomUUID();
  const { data } = await apiClient.post<TransferResult>('/api/v1/transfers', req, {
    headers: { 'Idempotency-Key': idempotencyKey },
  });
  return data;
}
