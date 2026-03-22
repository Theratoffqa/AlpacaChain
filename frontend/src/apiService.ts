/**
 * apiService.ts — Handles all communication with the Alpaquitay backend.
 * Manages JWT token and provides typed methods for each endpoint.
 */

// ─── Types ───

export interface ContractData {
  _id: string;
  id?: string;
  originalName: string;
  mimeType?: string;
  fileSize?: number;
  sha256Hash: string;
  hashGeneratedAt: string;
  status: 'uploaded' | 'verified' | 'paid' | 'tampered' | 'expired';
  paymentStatus?: string;
  paymentProvider?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IntegrityResult {
  isValid: boolean;
  storedHash: string;
  computedHash: string;
  verifiedAt: string;
  status: string;
}

export interface PaymentSession {
  transactionId: string;
  checkoutUrl: string;
  contractId: string;
  amountCents: number;
  currency: string;
  status: string;
  expiresAt: string;
}

// ─── Token Management ───

let authToken: string | null = null;

function setToken(token: string) {
  authToken = token;
  localStorage.setItem('alpacachain_token', token);
}

function getToken(): string | null {
  if (!authToken) {
    authToken = localStorage.getItem('alpacachain_token');
  }
  return authToken;
}

export function clearToken() {
  authToken = null;
  localStorage.removeItem('alpacachain_token');
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

// ─── Base Fetch ───

async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData (browser handles it with boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`/api${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || err.message || `Request failed: ${res.status}`);
  }

  return res.json();
}

// ─── Auth ───

export async function login(userId: string, apiKey: string): Promise<string> {
  const data = await apiFetch('/auth/token', {
    method: 'POST',
    body: JSON.stringify({ userId, apiKey }),
  });
  setToken(data.token);
  return data.token;
}

// ─── Contracts ───

export async function uploadContractFile(file: File, metadata?: Record<string, string>): Promise<ContractData> {
  const formData = new FormData();
  formData.append('contract', file);
  if (metadata) {
    formData.append('metadata', JSON.stringify(metadata));
  }

  const data = await apiFetch('/contracts/upload', {
    method: 'POST',
    body: formData,
  });
  return data.contract;
}

export async function uploadContractText(content: string, title: string): Promise<ContractData> {
  const data = await apiFetch('/contracts/upload-text', {
    method: 'POST',
    body: JSON.stringify({ content, title }),
  });
  return data.contract;
}

export async function getContract(id: string): Promise<ContractData> {
  const data = await apiFetch(`/contracts/${id}`);
  return data.contract;
}

export async function listContracts(page = 1, limit = 50): Promise<{ contracts: ContractData[]; total: number }> {
  const data = await apiFetch(`/contracts?page=${page}&limit=${limit}`);
  return { contracts: data.contracts, total: data.pagination.total };
}

export async function verifyContract(id: string): Promise<IntegrityResult> {
  const data = await apiFetch(`/contracts/${id}/verify`, { method: 'POST' });
  return data.integrity;
}

// ─── Payments ───

export async function createFiservSession(params: {
  contractId: string;
  amountCents: number;
  customerEmail: string;
  currency?: string;
}): Promise<PaymentSession> {
  const data = await apiFetch('/payments/fiserv/create-session', {
    method: 'POST',
    body: JSON.stringify({
      contractId: params.contractId,
      amountCents: params.amountCents,
      customerEmail: params.customerEmail,
      currency: params.currency || 'USD',
      returnUrl: window.location.origin,
    }),
  });
  return data.session;
}

export async function getPaymentStatus(contractId: string) {
  return apiFetch(`/payments/status/${contractId}`);
}
