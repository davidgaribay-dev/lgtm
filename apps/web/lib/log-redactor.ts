// Sensitive field patterns to redact
export const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'apiKey',
  'api_key',
  'authorization',
  'cookie',
  'session',
  'refreshToken',
  'accessToken',
  'idToken',
  'privateKey',
  'private_key',
  'ssn',
  'credit_card',
  'creditCard',
];

// Regex patterns for sensitive data in strings
export const SENSITIVE_PATTERNS = [
  {
    name: 'email',
    pattern: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    replace: (m: string) => {
      const [local, domain] = m.split('@');
      if (!domain) return '[INVALID_EMAIL]';
      return `${local.substring(0, 2)}***@${domain}`;
    },
  },
  {
    name: 'creditCard',
    pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    replace: () => '[REDACTED_CC]',
  },
  {
    name: 'ssn',
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    replace: () => '[REDACTED_SSN]',
  },
  {
    name: 'jwt',
    pattern: /eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g,
    replace: () => '[REDACTED_JWT]',
  },
  {
    name: 'bearerToken',
    pattern: /Bearer\s+[A-Za-z0-9-._~+/]+=*/gi,
    replace: () => 'Bearer [REDACTED]',
  },
];

// Redact function for sensitive data in objects
export function redactSensitiveData(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;

  const redacted = Array.isArray(obj) ? [...obj] : { ...obj };

  for (const key in redacted) {
    // Check if field name contains sensitive keywords
    if (
      SENSITIVE_FIELDS.some((field) => key.toLowerCase().includes(field))
    ) {
      redacted[key] = '[REDACTED]';
    } else if (typeof redacted[key] === 'string') {
      // Apply pattern-based redaction to string values
      let value = redacted[key];
      SENSITIVE_PATTERNS.forEach(({ pattern, replace }) => {
        value = value.replace(pattern, replace as any);
      });
      redacted[key] = value;
    } else if (
      typeof redacted[key] === 'object' &&
      redacted[key] !== null
    ) {
      // Recursively redact nested objects
      redacted[key] = redactSensitiveData(redacted[key]);
    }
  }

  return redacted;
}
