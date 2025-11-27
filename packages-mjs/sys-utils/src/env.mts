/**
 * Environment utilities
 * Pure ESM module for environment variable handling
 */

import process from 'node:process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Get an environment variable with optional default
 */
export function getEnv(key, defaultValue = undefined) {
  return process.env[key] ?? defaultValue;
}

/**
 * Get a required environment variable (throws if missing)
 */
export function requireEnv(key) {
  const value = process.env[key];
  if (value === undefined) {
    throw new Error(`Required environment variable "${key}" is not set`);
  }
  return value;
}

/**
 * Set an environment variable
 */
export function setEnv(key, value) {
  process.env[key] = value;
}

/**
 * Check if an environment variable exists
 */
export function hasEnv(key) {
  return key in process.env;
}

/**
 * Delete an environment variable
 */
export function deleteEnv(key) {
  delete process.env[key];
}

/**
 * Get all environment variables
 */
export function getAllEnv() {
  return { ...process.env };
}

/**
 * Get environment variables matching a prefix
 */
export function getEnvByPrefix(prefix) {
  const result = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith(prefix)) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Parse a boolean environment variable
 */
export function getBoolEnv(key, defaultValue = false) {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Parse an integer environment variable
 */
export function getIntEnv(key, defaultValue = 0) {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse a float environment variable
 */
export function getFloatEnv(key, defaultValue = 0.0) {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse a JSON environment variable
 */
export function getJsonEnv(key, defaultValue = null) {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  try {
    return JSON.parse(value);
  } catch {
    return defaultValue;
  }
}

/**
 * Parse a comma-separated list environment variable
 */
export function getListEnv(key, defaultValue = []) {
  const value = process.env[key];
  if (value === undefined || value === '') return defaultValue;
  return value.split(',').map((s) => s.trim());
}

/**
 * Get current working directory
 */
export function getCwd() {
  return process.cwd();
}

/**
 * Get the directory name from import.meta.url
 */
export function getDirname(importMetaUrl) {
  return path.dirname(fileURLToPath(importMetaUrl));
}

/**
 * Get the filename from import.meta.url
 */
export function getFilename(importMetaUrl) {
  return fileURLToPath(importMetaUrl);
}

/**
 * Resolve a path relative to the current working directory
 */
export function resolvePath(...paths) {
  return path.resolve(process.cwd(), ...paths);
}

/**
 * Get process ID
 */
export function getPid() {
  return process.pid;
}

/**
 * Get parent process ID
 */
export function getPpid() {
  return process.ppid;
}

/**
 * Get process title
 */
export function getProcessTitle() {
  return process.title;
}

/**
 * Check if running in development mode
 */
export function isDevelopment() {
  const env = process.env.NODE_ENV?.toLowerCase();
  return env === 'development' || env === 'dev';
}

/**
 * Check if running in production mode
 */
export function isProduction() {
  return process.env.NODE_ENV?.toLowerCase() === 'production';
}

/**
 * Check if running in test mode
 */
export function isTest() {
  const env = process.env.NODE_ENV?.toLowerCase();
  return env === 'test' || env === 'testing';
}

/**
 * Get the current NODE_ENV
 */
export function getNodeEnv() {
  return process.env.NODE_ENV ?? 'development';
}

/**
 * Get process memory usage
 */
export function getMemoryUsage() {
  return process.memoryUsage();
}

/**
 * Get process resource usage
 */
export function getResourceUsage() {
  return process.resourceUsage();
}

/**
 * Environment decorator for classes
 * Injects environment variables into decorated class
 */
export function WithEnv(...keys) {
  return function (target) {
    target.env = {};
    for (const key of keys) {
      target.env[key] = getEnv(key);
    }
    return target;
  };
}

/**
 * RequireEnv decorator for classes
 * Validates required env vars exist when class is loaded
 */
export function RequireEnvVars(...keys) {
  return function (target) {
    for (const key of keys) {
      requireEnv(key);
    }
    return target;
  };
}

export default {
  getEnv,
  requireEnv,
  setEnv,
  hasEnv,
  deleteEnv,
  getAllEnv,
  getEnvByPrefix,
  getBoolEnv,
  getIntEnv,
  getFloatEnv,
  getJsonEnv,
  getListEnv,
  getCwd,
  getDirname,
  getFilename,
  resolvePath,
  getPid,
  getPpid,
  getProcessTitle,
  isDevelopment,
  isProduction,
  isTest,
  getNodeEnv,
  getMemoryUsage,
  getResourceUsage,
  WithEnv,
  RequireEnvVars,
};
