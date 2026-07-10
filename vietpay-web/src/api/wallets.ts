import { apiClient } from './client';
import type {
  Wallet,
  CreateWalletRequest,
  Transaction,
  Reconciliation,
} from '../types';

export async function createWallet(req: CreateWalletRequest): Promise<Wallet> {
  const { data } = await apiClient.post<Wallet>('/api/v1/wallets', req);
  return data;
}

export async function getWallet(id: string): Promise<Wallet> {
  const { data } = await apiClient.get<Wallet>(`/api/v1/wallets/${id}`);
  return data;
}

export async function getTransactions(
  id: string,
  limit = 20,
  offset = 0,
): Promise<Transaction[]> {
  const { data } = await apiClient.get<Transaction[]>(
    `/api/v1/wallets/${id}/transactions`,
    { params: { limit, offset } },
  );
  return data;
}

export async function getReconciliation(id: string): Promise<Reconciliation> {
  const { data } = await apiClient.get<Reconciliation>(
    `/api/v1/wallets/${id}/reconciliation`,
  );
  return data;
}
