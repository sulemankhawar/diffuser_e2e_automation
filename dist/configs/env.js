"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnvConfig = getEnvConfig;
const node_path_1 = __importDefault(require("node:path"));
const dotenv_1 = require("dotenv");
const ENV_FILE_MAP = {
    staging: '.env.staging',
    production: '.env.production',
    local: '.env.local',
};
let cachedConfig = null;
function parseBoolean(value, fallback) {
    if (!value)
        return fallback;
    return value.trim().toLowerCase() === 'true';
}
function getEnvConfig() {
    if (cachedConfig) {
        return cachedConfig;
    }
    const testEnv = process.env.TEST_ENV || 'staging';
    const envFile = ENV_FILE_MAP[testEnv] || ENV_FILE_MAP.staging;
    (0, dotenv_1.config)({
        path: node_path_1.default.resolve(process.cwd(), envFile),
        override: false,
    });
    cachedConfig = {
        name: testEnv,
        baseUrl: process.env.BASE_URL || 'https://playwright.dev',
        headless: parseBoolean(process.env.HEADLESS, true),
    };
    return cachedConfig;
}
