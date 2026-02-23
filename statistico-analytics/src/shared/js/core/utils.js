/**
 * Core Utilities - Shared utility functions across all modules
 * @module utils
 */

/**
 * Format a number to specified decimal places
 * @param {number} num - Number to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted number or '—' if invalid
 */
export function formatNumber(num, decimals = 2) {
  if (typeof num !== 'number' || !isFinite(num)) return '—';
  return decimals === 0 ? Math.round(num).toString() : num.toFixed(decimals);
}

/**
 * Convert column number to Excel letter (1=A, 2=B, 27=AA, etc.)
 * @param {number} colNum - Column number (1-based)
 * @returns {string} Excel column letter
 */
export function columnNumberToLetter(colNum) {
  let result = '';
  while (colNum > 0) {
    const modulo = (colNum - 1) % 26;
    result = String.fromCharCode(65 + modulo) + result;
    colNum = Math.floor((colNum - modulo) / 26);
  }
  return result;
}

/**
 * Convert Excel letter to column number (A=1, B=2, AA=27, etc.)
 * @param {string} colLetter - Excel column letter
 * @returns {number} Column number (1-based)
 */
export function columnLetterToNumber(colLetter) {
  let result = 0;
  for (let i = 0; i < colLetter.length; i++) {
    result = result * 26 + (colLetter.charCodeAt(i) - 64);
  }
  return result;
}

/**
 * Calculate descriptive statistics for an array of numbers
 * @param {number[]} values - Array of numeric values
 * @returns {Object} Statistics object with mean, median, stdDev, min, max, skew, kurt
 */
export function calculateDescriptiveStats(values) {
  if (!values || values.length === 0) {
    return {
      n: 0,
      mean: null,
      median: null,
      stdDev: null,
      min: null,
      max: null,
      skew: null,
      kurt: null
    };
  }

  const sorted = values.slice().sort((a, b) => a - b);
  const n = values.length;
  const mean = values.reduce((sum, v) => sum + v, 0) / n;
  const median = n % 2 === 0 
    ? (sorted[n/2 - 1] + sorted[n/2]) / 2 
    : sorted[Math.floor(n/2)];

  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  const skew = stdDev > 0 
    ? values.reduce((sum, v) => sum + Math.pow((v - mean) / stdDev, 3), 0) / n 
    : 0;

  const kurt = stdDev > 0
    ? values.reduce((sum, v) => sum + Math.pow((v - mean) / stdDev, 4), 0) / n - 3
    : 0;

  return {
    n,
    mean,
    median,
    stdDev,
    variance,
    min: Math.min(...values),
    max: Math.max(...values),
    skew,
    kurt
  };
}

/**
 * Deep clone an object
 * @param {*} obj - Object to clone
 * @returns {*} Deep cloned object
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  
  const clonedObj = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      clonedObj[key] = deepClone(obj[key]);
    }
  }
  return clonedObj;
}

/**
 * Debounce function - limits the rate at which a function can fire
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Generate unique ID
 * @param {string} prefix - Optional prefix for the ID
 * @returns {string} Unique ID
 */
export function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type of toast (success, error, warning, info)
 * @param {number} duration - Duration in milliseconds (default: 3000)
 */
export function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px 20px;
    background: ${getToastColor(type)};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 10000;
    animation: slideInRight 0.3s ease;
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function getToastColor(type) {
  const colors = {
    success: '#22c55e',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6'
  };
  return colors[type] || colors.info;
}

/**
 * Validate numeric input
 * @param {*} value - Value to validate
 * @returns {boolean} True if valid number
 */
export function isValidNumber(value) {
  return typeof value === 'number' && isFinite(value) && !isNaN(value);
}

/**
 * Parse JSON safely
 * @param {string} jsonString - JSON string to parse
 * @param {*} defaultValue - Default value if parsing fails
 * @returns {*} Parsed object or default value
 */
export function safeJsonParse(jsonString, defaultValue = null) {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.error('JSON parse error:', e);
    return defaultValue;
  }
}

/**
 * Format date to string
 * @param {Date} date - Date object
 * @param {string} format - Format string (default: 'YYYY-MM-DD')
 * @returns {string} Formatted date string
 */
export function formatDate(date, format = 'YYYY-MM-DD') {
  if (!(date instanceof Date)) return '';
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * Download data as CSV file
 * @param {Array} data - Array of objects or arrays
 * @param {string} filename - Name of the file
 */
export function downloadCSV(data, filename = 'data.csv') {
  if (!data || data.length === 0) return;
  
  let csv = '';
  
  // Handle array of objects
  if (typeof data[0] === 'object' && !Array.isArray(data[0])) {
    const headers = Object.keys(data[0]);
    csv = headers.join(',') + '\n';
    data.forEach(row => {
      csv += headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value;
      }).join(',') + '\n';
    });
  } 
  // Handle array of arrays
  else if (Array.isArray(data[0])) {
    data.forEach(row => {
      csv += row.map(value => {
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value;
      }).join(',') + '\n';
    });
  }
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
