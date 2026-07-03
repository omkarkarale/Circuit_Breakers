import { LocalStorageService } from '../services/LocalStorageService';

export class ApiError extends Error {
  public status?: number;
  public statusText?: string;
  public isNetworkError: boolean;
  public isTimeout: boolean;

  constructor(message: string, options?: { status?: number; statusText?: string; isNetworkError?: boolean; isTimeout?: boolean }) {
    super(message);
    this.name = 'ApiError';
    this.status = options?.status;
    this.statusText = options?.statusText;
    this.isNetworkError = options?.isNetworkError || false;
    this.isTimeout = options?.isTimeout || false;
  }
}

const TIMEOUT_MS = 8000;
const RETRY_ATTEMPTS = 2;

const getBaseUrl = (): string => {
  const settings = LocalStorageService.getSettings();
  const ip = settings.esp32Ip || '192.168.4.1';
  const normalizedIp = ip.replace(/\/$/, '').trim();
  
  if (normalizedIp.startsWith('http://') || normalizedIp.startsWith('https://')) {
    return normalizedIp;
  }
  return `http://${normalizedIp}`;
};

async function request<T>(
  path: string,
  options: RequestInit = {},
  retriesRemaining = 0,
  isIdempotent = false
): Promise<T> {
  // Check if network is offline in browser environment
  if (typeof window !== 'undefined' && typeof window.navigator !== 'undefined' && !window.navigator.onLine) {
    throw new ApiError('Network connection is offline', { isNetworkError: true });
  }

  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new ApiError(`HTTP error! status: ${response.status}`, {
        status: response.status,
        statusText: response.statusText
      });
    }

    // Automatic JSON parsing if content type indicates it
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json() as T;
    }
    
    // Return empty object/any cast if response is successful but doesn't have json
    return {} as T;
  } catch (error: any) {
    clearTimeout(timeoutId);

    const isTimeout = error.name === 'AbortError' || error.message?.includes('timeout') || false;
    const isNetworkError = error.name === 'TypeError' || error.message?.includes('Failed to fetch') || false;

    // Retry only for idempotent GET requests
    if (isIdempotent && retriesRemaining > 0 && (isTimeout || isNetworkError)) {
      console.warn(`Request failed. Retrying... (${retriesRemaining} attempts left). Error: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // wait 1s before retry
      return request<T>(path, options, retriesRemaining - 1, isIdempotent);
    }

    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(error.message || 'Unknown network error', {
      isNetworkError,
      isTimeout
    });
  }
}

export const ApiClient = {
  async get<T>(path: string): Promise<T> {
    return request<T>(path, { method: 'GET' }, RETRY_ATTEMPTS, true);
  },

  async post<T>(path: string, body?: any): Promise<T> {
    return request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined
    }, 0, false); // No retry for POST requests
  },

  async delete<T>(path: string): Promise<T> {
    return request<T>(path, { method: 'DELETE' }, 0, false); // No retry for DELETE requests
  },

  async put<T>(path: string, body?: any): Promise<T> {
    return request<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined
    }, 0, false); // No retry for PUT requests
  }
};
