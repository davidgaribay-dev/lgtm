import winston from "winston";

const { combine, timestamp, colorize, printf, json, errors } = winston.format;

const humanFormat = combine(
  colorize({ all: true }),
  timestamp({ format: "HH:mm:ss" }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} ${level}: ${stack || message}`;
  }),
);

const jsonFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json(),
);

export interface LoggerOptions {
  verbose?: boolean;
  jsonOutput?: boolean;
}

export function createLogger(options: LoggerOptions = {}): winston.Logger {
  const isInteractive = process.stdout.isTTY && !options.jsonOutput;

  return winston.createLogger({
    level: options.verbose ? "debug" : "info",
    format: isInteractive ? humanFormat : jsonFormat,
    transports: [
      new winston.transports.Console({
        stderrLevels: ["error", "warn"],
      }),
    ],
  });
}
