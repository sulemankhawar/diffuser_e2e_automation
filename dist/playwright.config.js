"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const playwright_bdd_1 = require("playwright-bdd");
const env_1 = require("./configs/env");
const node_child_process_1 = require("node:child_process");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const envConfig = (0, env_1.getEnvConfig)();
const featurePaths = process.env.FEATURE ? [process.env.FEATURE] : ['features/**/*.feature'];
function collectFiles(dirPath, extension) {
    if (!node_fs_1.default.existsSync(dirPath)) {
        return [];
    }
    const entries = node_fs_1.default.readdirSync(dirPath, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const absolutePath = node_path_1.default.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            files.push(...collectFiles(absolutePath, extension));
        }
        else if (entry.isFile() && absolutePath.endsWith(extension)) {
            files.push(absolutePath);
        }
    }
    return files;
}
function getLatestMTimeMs(filePaths) {
    return filePaths.reduce((latest, filePath) => {
        const mtimeMs = node_fs_1.default.statSync(filePath).mtimeMs;
        return Math.max(latest, mtimeMs);
    }, 0);
}
function shouldGenerateBdd() {
    if (process.env.PW_BDD_GENERATING === '1') {
        return false;
    }
    const featureFiles = collectFiles(node_path_1.default.resolve(process.cwd(), 'features'), '.feature');
    const generatedSpecFiles = collectFiles(node_path_1.default.resolve(process.cwd(), '.features-gen'), '.spec.js');
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
function prepareBddArtifacts() {
    if (!shouldGenerateBdd()) {
        return;
    }
    (0, node_child_process_1.execSync)('npm run bddgen', {
        cwd: process.cwd(),
        stdio: 'inherit',
        shell: true,
        env: {
            ...process.env,
            PW_BDD_GENERATING: '1',
        },
    });
}
prepareBddArtifacts();
const testDir = (0, playwright_bdd_1.defineBddConfig)({
    paths: featurePaths,
    require: ['step-definitions/**/*.ts'],
    tags: process.env.TAGS,
});
exports.default = (0, test_1.defineConfig)({
    testDir,
    timeout: 360_000,
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
        ['allure-playwright', { outputFolder: 'allure-results' }],
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
            use: { ...test_1.devices['Desktop Chrome'] },
        },
    ],
    outputDir: 'test-results/artifacts',
});
