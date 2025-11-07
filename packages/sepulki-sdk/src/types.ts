import type { AuthStorage } from './auth';

export interface SepulkiClientConfig {
  /**
   * Base URL for the Sepulki API (e.g. https://hammer-orchestrator-production.up.railway.app)
   */
  apiUrl: string;
  /**
    * Optional websocket endpoint. Falls back to apiUrl with ws:// prefix.
    */
  websocketUrl?: string;
  /**
   * Override the storage implementation (defaults to localStorage in browsers).
   */
  storage?: AuthStorage;
  /**
   * Callback invoked whenever the SDK encounters an authentication failure.
   */
  onAuthError?: (message: string) => void;
}
