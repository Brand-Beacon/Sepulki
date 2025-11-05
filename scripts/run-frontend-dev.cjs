#!/usr/bin/env node

const { spawn } = require('node:child_process');
const path = require('node:path');

const workspaceRoot = path.resolve(__dirname, '..');
const appDir = path.join(workspaceRoot, 'apps', 'forge-ui');
const nextBin = require.resolve('next/dist/bin/next', { paths: [appDir] });
const shimDir = path.join(__dirname, 'shims');
const registry = process.env.npm_config_registry || 'https://registry.npmjs.org/';
const realNpmCli = process.env.npm_execpath || require.resolve('npm/bin/npm-cli.js');

const child = spawn(process.execPath, [nextBin, 'dev', '-H', '0.0.0.0'], {
  cwd: appDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    PATH: `${shimDir}${path.delimiter}${process.env.PATH || ''}`,
    npm_config_workspaces: '',
    NPM_CONFIG_WORKSPACES: '',
    npm_config_workspace: '',
    NPM_CONFIG_WORKSPACE: '',
    npm_config_registry: registry,
    NPM_CONFIG_REGISTRY: registry,
    NPM_SHIM_REAL_NPM: realNpmCli || '',
    NPM_SHIM_REGISTRY: registry,
  },
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error('[Frontend Dev] Failed to start Next.js:', error);
  process.exit(1);
});
