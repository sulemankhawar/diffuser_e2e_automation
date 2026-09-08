import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';
import { getEnvConfig } from './configs/env';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const envConfig = getEnvConfig();
const featurePaths = process.env.BDD_FEATURE ? [process.env.BDD_FEATURE] : ['features/**/*.feature'];
const enableAllureReporter = process.env.ENABLE_ALLURE === '1';

function collectFiles(dirPath: string, extension: string): string[] {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(absolutePath, extension));
    } else if (entry.isFile() && absolutePath.endsWith(extension)) {
      files.push(absolutePath);
    }
  }

  return files;
}

function getLatestMTimeMs(filePaths: string[]): number {
  return filePaths.reduce((latest, filePath) => {
    const mtimeMs = fs.statSync(filePath).mtimeMs;
    return Math.max(latest, mtimeMs);
  }, 0);
}

function shouldGenerateBdd(): boolean {
  if (process.env.PW_BDD_GENERATING === '1') {
    return false;
  }

  const featureFiles = collectFiles(path.resolve(process.cwd(), 'features'), '.feature');
  const generatedSpecFiles = collectFiles(path.resolve(process.cwd(), '.features-gen'), '.spec.js');

  if (featureFiles.length === 0) {
    return false;
  }

  if (generatedSpecFiles.length === 0) {
    return true;
  }

  const latestFeatureChange = getLatestMTimeMs(featureFiles);
  const latestGeneratedChange = getLatestMTimeMs(generatedSpecFiles);
  return latestFeatureChange > latestGeneratedChange;
}

function prepareBddArtifacts(): void {
  if (!shouldGenerateBdd()) {
    return;
  }

  execSync('npm run bddgen', {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      PW_BDD_GENERATING: '1',
    },
  });
}

function cleanRunArtifacts(): void {
  if (process.env.PW_SKIP_CLEAN === '1') {
    return;
  }

  const targets = [
    path.resolve(process.cwd(), 'allure-results'),
    path.resolve(process.cwd(), 'reports', 'html'),
    path.resolve(process.cwd(), 'test-results', 'artifacts'),
  ];

  for (const target of targets) {
    try {
      fs.rmSync(target, { recursive: true, force: true });
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== 'ENOENT' && err.code !== 'EPERM' && err.code !== 'EBUSY') {
        throw error;
      }
    }
  }
}

function isBddGenerationProcess(): boolean {
  const lifecycleEvent = process.env.npm_lifecycle_event ?? '';
  if (lifecycleEvent.toLowerCase() === 'bddgen') {
    return true;
  }

  return process.argv.some((arg) => arg.toLowerCase().includes('bddgen'));
}

if (!isBddGenerationProcess()) {
  cleanRunArtifacts();
  prepareBddArtifacts();
}

const testDir = defineBddConfig({
  paths: featurePaths,
  require: ['step-definitions/**/*.ts'],
  tags: process.env.BDD_TAGS,
});

export default defineConfig({
  testDir,
  timeout: 1_800_000,
  expect: {
    timeout: 5_000,
  },
  // Diffuser tests share SAP backend state: manage-diffuser creates the program
  // that start-diffuser depends on. Serial execution (workers=1 locally) guarantees
  // manage-diffuser completes before start-diffuser begins (alphabetical file order).
  fullyParallel: Boolean(process.env.CI),
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'reports/html' }],
    ...(enableAllureReporter ? [['allure-playwright', { outputFolder: 'allure-results' }] as const] : []),
  ],
  use: {
    baseURL: envConfig.baseUrl,
    browserName: 'chromium',
    headless: envConfig.headless,
    actionTimeout: 15_000,
    trace: 'on-first-retry',
    screenshot: 'on',
    video: 'on',
    ignoreHTTPSErrors: true,
    viewport: { width: 1366, height: 768 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  outputDir: 'test-results/artifacts',
});
