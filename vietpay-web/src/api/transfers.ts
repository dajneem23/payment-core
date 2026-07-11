import { apiClient } from './client';
import type { TransferRequest, TransferResult, TransferDetail } from '../types';

export async function transfer(req: TransferRequest): Promise<TransferResult> {
  const idempotencyKey = crypto.randomUUID();
  const { data } = await apiClient.post<TransferResult>('/api/v1/transfers', req, {
    headers: { 'Idempotency-Key': idempotencyKey },
  });
  return data;
}

export async function getTransferDetail(id: string): Promise<TransferDetail> {
  const { data } = await apiClient.get<TransferDetail>(`/api/v1/transfers/${id}`);
  return data;
}
