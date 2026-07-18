export interface ScreenCaptureApi {
  isAvailableAsync(): Promise<boolean>;
  preventScreenCaptureAsync(key?: string): Promise<void>;
  allowScreenCaptureAsync(key?: string): Promise<void>;
}

export class PrivacyProtectionService {
  private readonly key = 'money-control-app-lock';

  constructor(private readonly api: ScreenCaptureApi) {}

  async enable(): Promise<boolean> {
    if (!(await this.api.isAvailableAsync())) return false;
    await this.api.preventScreenCaptureAsync(this.key);
    return true;
  }

  async disable(): Promise<void> {
    if (await this.api.isAvailableAsync()) {
      await this.api.allowScreenCaptureAsync(this.key);
    }
  }
}

