export class Logger {
  private debugEnabled: boolean;

  constructor(debug: boolean = false) {
    this.debugEnabled = debug;
  }

  /** Strip potential API tokens from log output to prevent credential leakage in CI logs. */
  private sanitize(message: string): string {
    return message
      .replace(/lgtm_v1_[a-zA-Z0-9_-]+/g, "lgtm_v1_[REDACTED]")
      .replace(/Bearer\s+[a-zA-Z0-9._-]+/g, "Bearer [REDACTED]");
  }

  info(message: string): void {
    console.log(`[lgtm] ${this.sanitize(message)}`);
  }

  warn(message: string): void {
    console.warn(`[lgtm] ⚠ ${this.sanitize(message)}`);
  }

  error(message: string, err?: unknown): void {
    console.error(`[lgtm] ✗ ${this.sanitize(message)}`);
    if (err && this.debugEnabled) {
      const errStr = err instanceof Error ? err.stack || err.message : String(err);
      console.error(this.sanitize(errStr));
    }
  }

  debug(message: string): void {
    if (this.debugEnabled) {
      console.log(`[lgtm:debug] ${this.sanitize(message)}`);
    }
  }

  success(message: string): void {
    console.log(`[lgtm] ✓ ${this.sanitize(message)}`);
  }
}
