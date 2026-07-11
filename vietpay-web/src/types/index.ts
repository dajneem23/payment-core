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

// ── Wallet (matches WalletResponse) ──

export interface Wallet {
  id: string;
  currency: string;
  balance: number;
}

export interface CreateWalletRequest {
  currency: string;
}

// ── Transaction (matches TransactionResponse / LedgerEntry) ──

export interface Transaction {
  id: string;
  sourceRef: string;
  direction: 'CREDIT' | 'DEBIT';
  amount: number;
  currency: string;
}

// ── Reconciliation ──

export interface Reconciliation {
  walletId: string;
  cachedBalance: number;
  ledgerBalance: number;
  balanced: boolean;
}

// ── Transfer (matches TransferResponse) ──

export interface TransferRequest {
  sourceWalletId: string;
  destWalletId: string;
  amount: number;
  currency: string;
  remark?: string;
}

export interface TransferResult {
  transferId: string;
  status: string;
  sourceWalletId: string;
  destWalletId: string;
  amount: number;
  currency: string;
  createdAt: string;
}

// ── Deposit (matches DepositResponse) ──

export interface DepositRequest {
  amount: number;
  currency: string;
}

export interface DepositResult {
  depositId: string;
  walletId: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
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
