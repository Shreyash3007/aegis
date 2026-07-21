import os from 'node:os';
import { git, has } from './util.js';

export interface DoctorReport {
  node: string;
  git: string;
  platform_hint: string;
  shell_access: boolean;
  ram_total_mb: number;
  ram_free_mb: number;
  cpu_cores: number;
  tools: Record<string, boolean>;
  in_ci: boolean;
  environment_level: 'L0' | 'L1' | 'L2';
  worktrees_pruned: boolean;
}

export function doctor(): DoctorReport {
  const env = process.env;
  const platform_hint =
    env.KIMI_CODE ? 'kimi-code' :
    env.CLAUDECODE || env.CLAUDE_CODE ? 'claude-code' :
    env.TERM_PROGRAM === 'cursor' || env.CURSOR_TRACE_ID ? 'cursor' :
    env.OPENCODE ? 'opencode' : 'unknown-cli';
  const tools: Record<string, boolean> = {
    playwright: has('playwright') || has('npx'),
    k6: has('k6'),
    lighthouse: has('lighthouse'),
    eslint: has('eslint') || has('npx'),
  };
  const in_ci = !!(env.CI || env.GITHUB_ACTIONS);
  let worktrees_pruned = false;
  try { git(['worktree', 'prune']); worktrees_pruned = true; } catch { /* not fatal */ }
  return {
    node: process.version,
    git: git(['--version']),
    platform_hint,
    shell_access: true, // if this CLI is running, a shell exists
    ram_total_mb: Math.round(os.totalmem() / 1048576),
    ram_free_mb: Math.round(os.freemem() / 1048576),
    cpu_cores: os.cpus().length,
    tools,
    in_ci,
    environment_level: in_ci ? 'L2' : 'L1',
    worktrees_pruned,
  };
}
