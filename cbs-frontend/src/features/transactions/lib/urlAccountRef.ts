const ACCOUNT_REF_STORAGE_KEY = 'transactions:url-account-refs';
const MAX_ACCOUNT_REF_ENTRIES = 25;

interface AccountRefEntry {
  token: string;
  accountNumber: string;
  createdAt: string;
}

function readEntries(): AccountRefEntry[] {
  try {
    const raw = sessionStorage.getItem(ACCOUNT_REF_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is AccountRefEntry => {
      return Boolean(
        item &&
          typeof item.token === 'string' &&
          typeof item.accountNumber === 'string' &&
          typeof item.createdAt === 'string',
      );
    });
  } catch {
    return [];
  }
}

function writeEntries(entries: AccountRefEntry[]) {
  sessionStorage.setItem(
    ACCOUNT_REF_STORAGE_KEY,
    JSON.stringify(entries.slice(0, MAX_ACCOUNT_REF_ENTRIES)),
  );
}

export function normalizeAccountNumber(value: string): string {
  return value.replace(/\s+/g, '').trim();
}

export function createAccountUrlRef(accountNumber: string): string {
  const normalized = normalizeAccountNumber(accountNumber);
  if (!normalized) {
    return '';
  }

  if (!/^\d{6,}$/.test(normalized)) {
    return normalized;
  }

  const entries = readEntries();
  const existing = entries.find((entry) => entry.accountNumber === normalized);
  if (existing) {
    return existing.token;
  }

  const token = `ref_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const nextEntries = [
    {
      token,
      accountNumber: normalized,
      createdAt: new Date().toISOString(),
    },
    ...entries,
  ];
  writeEntries(nextEntries);
  return token;
}

export function resolveAccountUrlRef(value: string | null): string {
  if (!value) {
    return '';
  }

  if (!value.startsWith('ref_')) {
    return normalizeAccountNumber(value);
  }

  const entries = readEntries();
  return entries.find((entry) => entry.token === value)?.accountNumber ?? '';
}

