import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface CliConfig {
  apiUrl: string;
  apiToken: string;
  defaultProject?: string;
}

export interface CliFlags {
  apiUrl?: string;
  apiToken?: string;
  project?: string;
}

function getConfigDir(): string {
  return process.env.XDG_CONFIG_HOME
    ? join(process.env.XDG_CONFIG_HOME, "lgtm")
    : join(homedir(), ".config", "lgtm");
}

function loadUserConfig(): Partial<CliConfig> {
  const configPath = join(getConfigDir(), "config.json");
  if (!existsSync(configPath)) return {};
  try {
    return JSON.parse(readFileSync(configPath, "utf-8"));
  } catch {
    return {};
  }
}

function loadProjectConfig(): Partial<CliConfig> {
  const localPath = join(process.cwd(), ".lgtm.json");
  if (!existsSync(localPath)) return {};
  try {
    return JSON.parse(readFileSync(localPath, "utf-8"));
  } catch {
    return {};
  }
}

/**
 * Resolve CLI config with precedence:
 * CLI flags > env vars > project-local .lgtm.json > user config > defaults
 */
export function resolveConfig(flags: CliFlags = {}): CliConfig {
  const userConfig = loadUserConfig();
  const projectConfig = loadProjectConfig();

  const apiUrl =
    flags.apiUrl ||
    process.env.LGTM_API_URL ||
    projectConfig.apiUrl ||
    userConfig.apiUrl ||
    "";

  const apiToken =
    flags.apiToken ||
    process.env.LGTM_API_TOKEN ||
    projectConfig.apiToken ||
    userConfig.apiToken ||
    "";

  const defaultProject =
    flags.project ||
    process.env.LGTM_PROJECT_KEY ||
    projectConfig.defaultProject ||
    userConfig.defaultProject;

  return { apiUrl, apiToken, defaultProject };
}

/** Save config to ~/.config/lgtm/config.json */
export function saveConfig(config: Partial<CliConfig>): void {
  const configDir = getConfigDir();
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true, mode: 0o700 });
  }

  const configPath = join(configDir, "config.json");
  const existing = loadUserConfig();
  const merged = { ...existing, ...config };

  writeFileSync(configPath, JSON.stringify(merged, null, 2) + "\n", {
    encoding: "utf-8",
    mode: 0o600,
  });
}

/** Get the config file path for display */
export function getConfigPath(): string {
  return join(getConfigDir(), "config.json");
}
