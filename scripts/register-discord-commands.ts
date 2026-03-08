/**
 * ClawForge — Discord Slash Command Registration
 *
 * Registers application commands (slash commands) so they appear
 * in Discord's "/" autocomplete for a specific server (guild).
 *
 * Usage:
 *   pnpm tsx scripts/register-discord-commands.ts
 *
 * Requires: discord.token set in ~/.openclaw/openclaw.json
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline';

interface OpenClawConfig {
  channels?: {
    discord?: {
      token?: string;
      applicationId?: string;
    };
  };
}

const CONFIG_PATH = path.join(os.homedir(), '.openclaw', 'openclaw.json');

const COMMANDS = [
  {
    name: 'remember',
    description: 'Save something to channel memory',
    options: [{ type: 3, name: 'text', description: 'What to remember', required: true }],
  },
  {
    name: 'forget',
    description: 'Clear channel memory (optionally by keyword)',
    options: [{ type: 3, name: 'keyword', description: 'Keyword to remove (leave empty to clear all)', required: false }],
  },
  {
    name: 'status',
    description: 'Show current channel status and memory summary',
    options: [],
  },
  {
    name: 'memory_n',
    description: 'Inject N recent conversation pairs into the next message context',
    options: [{ type: 4, name: 'count', description: 'Number of history pairs to inject (1–20)', required: true }],
  },
  {
    name: 'task',
    description: 'Manage tasks: list, create, update, assign',
    options: [
      { type: 3, name: 'action', description: 'Action: list | create | update | assign | done', required: true },
      { type: 3, name: 'args', description: 'Arguments for the action (e.g., task title, ID)', required: false },
    ],
  },
  {
    name: 'research',
    description: 'Run a web research task and store results',
    options: [{ type: 3, name: 'topic', description: 'Topic or question to research', required: true }],
  },
];

function readConfig(): OpenClawConfig {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')) as OpenClawConfig;
  } catch {
    return {};
  }
}

function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  console.log('\n🔧  ClawForge — Discord Slash Command Registration\n');

  const config = readConfig();
  const discordToken = config.channels?.discord?.token;
  const savedAppId = config.channels?.discord?.applicationId;

  if (!discordToken) {
    console.error('❌  Discord bot token not found in ~/.openclaw/openclaw.json');
    console.error('    Add it under: channels.discord.token');
    process.exit(1);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  let applicationId = savedAppId ?? '';
  if (!applicationId) {
    applicationId = await prompt(rl, '📋  Enter your Discord Application ID (from Discord Developer Portal): ');
  } else {
    console.log(`📋  Using Application ID: ${applicationId}`);
  }

  const guildId = await prompt(rl, '🏠  Enter your Guild (Server) ID (right-click your server > Copy Server ID): ');
  rl.close();

  if (!applicationId.trim() || !guildId.trim()) {
    console.error('❌  Application ID and Guild ID are required.');
    process.exit(1);
  }

  const url = `https://discord.com/api/v10/applications/${applicationId.trim()}/guilds/${guildId.trim()}/commands`;

  console.log(`\n📡  Registering ${COMMANDS.length} commands to guild ${guildId.trim()}…\n`);

  const response = await fetch(url, {
    method: 'PUT', // Bulk overwrite
    headers: {
      Authorization: `Bot ${discordToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(COMMANDS),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`❌  Discord API error ${response.status}: ${text}`);
    process.exit(1);
  }

  const registered = await response.json() as { name: string }[];

  console.log('✅  Registered commands:\n');
  for (const cmd of registered) {
    console.log(`   /${cmd.name}`);
  }

  // Save applicationId to config if not already there
  if (!savedAppId) {
    const fullConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')) as Record<string, unknown>;
    if (!fullConfig['channels']) fullConfig['channels'] = {};
    const channels = fullConfig['channels'] as Record<string, unknown>;
    if (!channels['discord']) channels['discord'] = {};
    const discord = channels['discord'] as Record<string, unknown>;
    discord['applicationId'] = applicationId.trim();
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(fullConfig, null, 2));
    console.log('\n💾  Saved Application ID to openclaw.json');
  }

  console.log('\n✨  Done! Slash commands will appear in Discord within a few minutes.\n');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
