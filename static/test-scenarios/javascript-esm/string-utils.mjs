/**
 * String utility functions - ESM Module
 */

export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function reverse(str) {
  return str.split('').reverse().join('');
}

export function truncate(str, maxLength) {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

export function countWords(str) {
  return str.trim().split(/\s+/).filter(Boolean).length;
}

export class StringProcessor {
  constructor(text) {
    this.text = text;
  }

  toUpperCase() {
    return this.text.toUpperCase();
  }

  toLowerCase() {
    return this.text.toLowerCase();
  }

  getLength() {
    return this.text.length;
  }
}
