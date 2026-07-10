// ── Auth ──

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  sub: string; // user id
  role: string; // e.g. USER, ADMIN
}

// ── Wallet ──

export interface Wallet {
  id: string;
  currency: string;
  balance: number;
  createdAt: string;
}

export interface CreateWalletRequest {
  currency: string;
}

export interface Transaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER_IN' | 'TRANSFER_OUT';
  amount: number;
  currency: string;
  counterpartyWalletId?: string;
  createdAt: string;
}

export interface Reconciliation {
  walletId: string;
  cachedBalance: number;
  ledgerBalance: number;
  inSync: boolean;
  difference: number;
}

// ── Transfer ──

export interface TransferRequest {
  sourceWalletId: string;
  destWalletId: string;
  amount: number;
  currency: string;
}

export interface TransferResult {
  id: string;
  sourceWalletId: string;
  destWalletId: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

// ── Deposit ──

export interface DepositRequest {
  amount: number;
  currency: string;
}

export interface DepositResult {
  transactionId: string;
  walletId: string;
  amount: number;
  currency: string;
  newBalance: number;
}

// ── FX ──

export interface FxRate {
  code: string;
  name: string;
  bid: number;
  ask: number;
  transfer: number;
  updatedAt: string;
}
