import type { SecureKeyValueStore } from './secure-app-lock.repository';

export interface ExpoSecureStoreApi {
  isAvailableAsync(): Promise<boolean>;
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

export class ExpoSecureStorageAdapter implements SecureKeyValueStore {
  constructor(private readonly api: ExpoSecureStoreApi) {}

  isAvailable(): Promise<boolean> {
    return this.api.isAvailableAsync();
  }

  getItem(key: string): Promise<string | null> {
    return this.api.getItemAsync(key);
  }

  setItem(key: string, value: string): Promise<void> {
    return this.api.setItemAsync(key, value);
  }

  deleteItem(key: string): Promise<void> {
    return this.api.deleteItemAsync(key);
  }
}

