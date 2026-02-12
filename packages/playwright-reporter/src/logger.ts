export class Logger {
  private debugEnabled: boolean;

  constructor(debug: boolean = false) {
    this.debugEnabled = debug;
  }

  info(message: string): void {
    console.log(`[lgtm] ${message}`);
  }

  warn(message: string): void {
    console.warn(`[lgtm] ⚠ ${message}`);
  }

  error(message: string, err?: unknown): void {
    console.error(`[lgtm] ✗ ${message}`);
    if (err && this.debugEnabled) {
      console.error(err);
    }
  }

  debug(message: string): void {
    if (this.debugEnabled) {
      console.log(`[lgtm:debug] ${message}`);
    }
  }

  success(message: string): void {
    console.log(`[lgtm] ✓ ${message}`);
  }
}
