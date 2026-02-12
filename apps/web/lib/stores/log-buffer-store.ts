import { create } from 'zustand';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface ClientLogEntry {
  id: string;
  level: LogLevel;
  message: string;
  timestamp: number;
  context?: Record<string, any>;
  correlationId?: string;
  url?: string;
  userAgent?: string;
}

interface LogBufferState {
  logs: ClientLogEntry[];
  add: (entry: Omit<ClientLogEntry, 'id' | 'timestamp'>) => void;
  clear: () => void;
  getAll: () => ClientLogEntry[];
  size: () => number;
}

export const useLogBufferStore = create<LogBufferState>((set, get) => ({
  logs: [],

  add: (entry) =>
    set((state) => ({
      logs: [
        ...state.logs,
        {
          ...entry,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          url:
            typeof window !== 'undefined' ? window.location.href : undefined,
          userAgent:
            typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        },
      ],
    })),

  clear: () => set({ logs: [] }),

  getAll: () => get().logs,

  size: () => get().logs.length,
}));
