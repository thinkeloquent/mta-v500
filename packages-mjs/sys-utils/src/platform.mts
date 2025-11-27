/**
 * Platform and OS utilities
 * Pure ESM module for system information
 */

import os from 'node:os';
import process from 'node:process';

/**
 * Get the current operating system type
 */
export function getOSType() {
  return os.type();
}

/**
 * Get the operating system platform
 */
export function getPlatform() {
  return os.platform();
}

/**
 * Get the CPU architecture
 */
export function getArchitecture() {
  return os.arch();
}

/**
 * Get the system hostname
 */
export function getHostname() {
  return os.hostname();
}

/**
 * Get current user info
 */
export function getUserInfo() {
  return os.userInfo();
}

/**
 * Get the home directory
 */
export function getHomeDir() {
  return os.homedir();
}

/**
 * Get the temp directory
 */
export function getTempDir() {
  return os.tmpdir();
}

/**
 * Get total system memory in bytes
 */
export function getTotalMemory() {
  return os.totalmem();
}

/**
 * Get free system memory in bytes
 */
export function getFreeMemory() {
  return os.freemem();
}

/**
 * Get CPU info
 */
export function getCPUs() {
  return os.cpus();
}

/**
 * Get CPU count
 */
export function getCPUCount() {
  return os.cpus().length;
}

/**
 * Get system uptime in seconds
 */
export function getUptime() {
  return os.uptime();
}

/**
 * Get Node.js version
 */
export function getNodeVersion() {
  return process.version;
}

/**
 * Get all Node.js versions (node, v8, etc.)
 */
export function getVersions() {
  return process.versions;
}

/**
 * Check if running on macOS
 */
export function isMacOS() {
  return os.platform() === 'darwin';
}

/**
 * Check if running on Windows
 */
export function isWindows() {
  return os.platform() === 'win32';
}

/**
 * Check if running on Linux
 */
export function isLinux() {
  return os.platform() === 'linux';
}

/**
 * Get complete system info object
 */
export function getSystemInfo() {
  return {
    osType: getOSType(),
    platform: getPlatform(),
    architecture: getArchitecture(),
    hostname: getHostname(),
    homeDir: getHomeDir(),
    tempDir: getTempDir(),
    totalMemory: getTotalMemory(),
    freeMemory: getFreeMemory(),
    cpuCount: getCPUCount(),
    uptime: getUptime(),
    nodeVersion: getNodeVersion(),
  };
}

/**
 * Platform info decorator for classes
 * Adds platform metadata to decorated class
 */
export function WithPlatformInfo(target) {
  target.platformInfo = getSystemInfo();
  return target;
}

export default {
  getOSType,
  getPlatform,
  getArchitecture,
  getHostname,
  getUserInfo,
  getHomeDir,
  getTempDir,
  getTotalMemory,
  getFreeMemory,
  getCPUs,
  getCPUCount,
  getUptime,
  getNodeVersion,
  getVersions,
  isMacOS,
  isWindows,
  isLinux,
  getSystemInfo,
  WithPlatformInfo,
};
