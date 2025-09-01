/**
 * Local storage utilities with type safety and error handling
 */

/**
 * Safely stores data in localStorage with JSON serialization
 * @param key - Storage key
 * @param value - Value to store
 * @returns True if successful, false otherwise
 */
export function setStorageItem<T>(key: string, value: T): boolean {
  try {
    const serializedValue = JSON.stringify(value);
    localStorage.setItem(key, serializedValue);
    return true;
  } catch (error) {
    console.error(`Error storing item with key "${key}":`, error);
    return false;
  }
}

/**
 * Safely retrieves and parses data from localStorage
 * @param key - Storage key
 * @returns Parsed value or null if not found/invalid
 */
export function getStorageItem<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(key);
    if (item === null) return null;
    
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`Error retrieving item with key "${key}":`, error);
    removeStorageItem(key); // Clean up invalid data
    return null;
  }
}

/**
 * Removes an item from localStorage
 * @param key - Storage key to remove
 * @returns True if successful, false otherwise
 */
export function removeStorageItem(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing item with key "${key}":`, error);
    return false;
  }
}

/**
 * Clears all items from localStorage
 * @returns True if successful, false otherwise
 */
export function clearStorage(): boolean {
  try {
    localStorage.clear();
    return true;
  } catch (error) {
    console.error('Error clearing localStorage:', error);
    return false;
  }
}

/**
 * Checks if a key exists in localStorage
 * @param key - Storage key to check
 * @returns True if key exists, false otherwise
 */
export function hasStorageItem(key: string): boolean {
  try {
    return localStorage.getItem(key) !== null;
  } catch (error) {
    console.error(`Error checking for key "${key}":`, error);
    return false;
  }
}

/**
 * Gets all keys from localStorage
 * @returns Array of storage keys
 */
export function getStorageKeys(): string[] {
  try {
    return Object.keys(localStorage);
  } catch (error) {
    console.error('Error getting localStorage keys:', error);
    return [];
  }
}

/**
 * Stores data with expiration timestamp
 * @param key - Storage key
 * @param value - Value to store
 * @param ttlMs - Time to live in milliseconds
 * @returns True if successful, false otherwise
 */
export function setStorageItemWithTTL<T>(key: string, value: T, ttlMs: number): boolean {
  const expiresAt = Date.now() + ttlMs;
  const item = {
    value,
    expiresAt
  };
  
  return setStorageItem(key, item);
}

/**
 * Retrieves data that was stored with TTL, checking expiration
 * @param key - Storage key
 * @returns Value if not expired, null otherwise
 */
export function getStorageItemWithTTL<T>(key: string): T | null {
  const item = getStorageItem<{ value: T; expiresAt: number }>(key);
  
  if (!item) return null;
  
  if (Date.now() > item.expiresAt) {
    removeStorageItem(key);
    return null;
  }
  
  return item.value;
}

/**
 * Storage keys used throughout the application
 */
export const STORAGE_KEYS = {
  // Authentication
  SPOTIFY_TOKENS: 'spotify_tokens',
  SPOTIFY_USER: 'spotify_user',
  SPOTIFY_CODE_VERIFIER: 'spotify_code_verifier',
  
  // Game preferences
  TRACK_LIMIT_PREFERENCE: 'track_limit_preference',
  
  // UI preferences
  UI_PREFERENCES: 'ui_preferences',
  
  // Game data (temporary)
  CURRENT_GAME_ROOM: 'current_game_room',
  GAME_HISTORY: 'game_history'
} as const;

/**
 * Interface for UI preferences
 */
export interface UIPreferences {
  theme: 'light' | 'dark' | 'system';
  trackLimit: number;
  animationsEnabled: boolean;
}

/**
 * Default UI preferences
 */
export const DEFAULT_UI_PREFERENCES: UIPreferences = {
  theme: 'system',
  trackLimit: 10,
  animationsEnabled: true
};

/**
 * Gets UI preferences with defaults
 * @returns UI preferences object
 */
export function getUIPreferences(): UIPreferences {
  const stored = getStorageItem<UIPreferences>(STORAGE_KEYS.UI_PREFERENCES);
  return { ...DEFAULT_UI_PREFERENCES, ...stored };
}

/**
 * Updates UI preferences
 * @param preferences - Partial preferences to update
 * @returns True if successful, false otherwise
 */
export function updateUIPreferences(preferences: Partial<UIPreferences>): boolean {
  const current = getUIPreferences();
  const updated = { ...current, ...preferences };
  return setStorageItem(STORAGE_KEYS.UI_PREFERENCES, updated);
}