import { readFileSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import yaml from 'js-yaml';
import type { StatelessChannelConfig, StatelessRegistry } from './types.js';

const OPENCLAW_HOME = path.join(os.homedir(), '.openclaw');
const STATELESS_DIR = path.join(OPENCLAW_HOME, 'stateless-channels');
const REGISTRY_PATH = path.join(STATELESS_DIR, 'registry.yaml');
const CHANNELS_DIR = path.join(STATELESS_DIR, 'channels');

interface CacheEntry<T> {
  value: T;
  mtime: number;
}

let _registryCache: CacheEntry<StatelessRegistry> | null = null;
const channelCache = new Map<string, CacheEntry<StatelessChannelConfig>>();

function getMtime(filePath: string): number {
  try {
    return statSync(filePath).mtimeMs;
  } catch {
    return 0;
  }
}

export function loadRegistry(): StatelessRegistry | null {
  if (!existsSync(REGISTRY_PATH)) return null;

  const mtime = getMtime(REGISTRY_PATH);
  if (_registryCache && _registryCache.mtime === mtime) {
    return _registryCache.value;
  }

  try {
    const content = readFileSync(REGISTRY_PATH, 'utf8');
    const parsed = yaml.load(content) as StatelessRegistry;
    _registryCache = { value: parsed, mtime };
    return parsed;
  } catch {
    return null;
  }
}

export function loadChannelConfig(configFile: string): StatelessChannelConfig | null {
  const filePath = path.isAbsolute(configFile)
    ? configFile
    : path.join(CHANNELS_DIR, configFile);

  if (!existsSync(filePath)) return null;

  const mtime = getMtime(filePath);
  const cached = channelCache.get(filePath);
  if (cached && cached.mtime === mtime) {
    return cached.value;
  }

  try {
    const content = readFileSync(filePath, 'utf8');
    const parsed = yaml.load(content) as StatelessChannelConfig;
    channelCache.set(filePath, { value: parsed, mtime });
    return parsed;
  } catch {
    return null;
  }
}

export function getChannelConfig(channelId: string): StatelessChannelConfig | null {
  const registry = loadRegistry();
  if (!registry?.channels) return null;

  const entry = registry.channels[channelId];
  if (!entry || !entry.enabled) return null;

  return loadChannelConfig(entry.config);
}

export function isStatelessChannel(channelId: string): boolean {
  const config = getChannelConfig(channelId);
  return config?.enabled === true && config?.mode === 'stateless';
}

export function listChannelConfigs(): StatelessChannelConfig[] {
  const registry = loadRegistry();
  if (!registry?.channels) return [];

  const configs: StatelessChannelConfig[] = [];
  for (const [, entry] of Object.entries(registry.channels)) {
    if (entry.enabled) {
      const config = loadChannelConfig(entry.config);
      if (config) configs.push(config);
    }
  }
  return configs;
}

export function getStatelessDir(): string {
  return STATELESS_DIR;
}

export function getChannelsDir(): string {
  return CHANNELS_DIR;
}

export { _registryCache as registryCache };
