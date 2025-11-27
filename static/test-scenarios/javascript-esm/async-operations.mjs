/**
 * Async operations and dynamic imports - ESM Module
 */

export async function fetchData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}

export async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function loadMathUtilsDynamically() {
  try {
    const module = await import('./math-utils.mjs');
    console.log('Math utils loaded dynamically!');
    return module;
  } catch (error) {
    console.error('Failed to load math utils:', error);
    throw error;
  }
}

export async function processInSequence(items, processor) {
  const results = [];
  for (const item of items) {
    const result = await processor(item);
    results.push(result);
  }
  return results;
}

export async function processInParallel(items, processor) {
  return await Promise.all(items.map(processor));
}

export class AsyncQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
  }

  async add(task) {
    this.queue.push(task);
    if (!this.processing) {
      await this.process();
    }
  }

  async process() {
    this.processing = true;
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      try {
        await task();
      } catch (error) {
        console.error('Task error:', error);
      }
    }
    this.processing = false;
  }
}
