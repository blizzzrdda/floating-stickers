// preferencesService.js - Service for managing user preferences for speech-to-text
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { fileURLToPath } from 'url';

/**
 * Service for managing speech-to-text preferences
 */
class PreferencesService {
  constructor() {
    // Get the user data path
    this.userDataPath = app.getPath('userData');
    
    // Define the preferences file path
    this.preferencesFilePath = path.join(this.userDataPath, 'speech-to-text-prefs.json');
    
    // Default preferences
    this.defaultPreferences = {
      defaultMicrophoneDevice: '', // Empty string means system default
      recordingSensitivity: 0.8, // Range: 0.0 - 1.0
      automaticRecordingTimeout: 180, // In seconds (3 minutes)
      textAppendMode: true, // true = append, false = replace
      language: 'en', // Default language for transcription
    };
    
    // Current preferences (will be loaded from file)
    this.preferences = { ...this.defaultPreferences };
    
    // Load preferences on initialization
    this.loadPreferences();
    
    console.log('PreferencesService initialized');
  }
  
  /**
   * Ensure the user data directory exists
   */
  ensureDirectoryExists() {
    try {
      if (!fs.existsSync(this.userDataPath)) {
        fs.mkdirSync(this.userDataPath, { recursive: true });
      }
    } catch (error) {
      console.error('Error creating preferences directory:', error);
    }
  }
  
  /**
   * Load preferences from file
   */
  loadPreferences() {
    try {
      this.ensureDirectoryExists();
      
      // Check if preferences file exists
      if (fs.existsSync(this.preferencesFilePath)) {
        // Read and parse the file
        const data = fs.readFileSync(this.preferencesFilePath, 'utf8');
        const loadedPrefs = JSON.parse(data);
        
        // Merge with defaults to ensure all properties exist
        this.preferences = {
          ...this.defaultPreferences,
          ...loadedPrefs
        };
        
        console.log('Preferences loaded successfully');
      } else {
        // If file doesn't exist, use defaults and create the file
        this.preferences = { ...this.defaultPreferences };
        this.savePreferences();
        console.log('Created default preferences file');
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      // If there's an error, use defaults
      this.preferences = { ...this.defaultPreferences };
    }
    
    return this.preferences;
  }
  
  /**
   * Save preferences to file
   */
  savePreferences() {
    try {
      this.ensureDirectoryExists();
      
      // Create a backup of the existing file if it exists
      if (fs.existsSync(this.preferencesFilePath)) {
        const backupPath = `${this.preferencesFilePath}.bak`;
        fs.copyFileSync(this.preferencesFilePath, backupPath);
      }
      
      // Write the preferences to file
      fs.writeFileSync(
        this.preferencesFilePath,
        JSON.stringify(this.preferences, null, 2),
        'utf8'
      );
      
      console.log('Preferences saved successfully');
      return true;
    } catch (error) {
      console.error('Error saving preferences:', error);
      return false;
    }
  }
  
  /**
   * Get all preferences
   * @returns {Object} The current preferences
   */
  getPreferences() {
    return { ...this.preferences };
  }
  
  /**
   * Get a specific preference
   * @param {string} key - The preference key
   * @param {any} defaultValue - Default value if preference doesn't exist
   * @returns {any} The preference value
   */
  getPreference(key, defaultValue = null) {
    return this.preferences[key] !== undefined 
      ? this.preferences[key] 
      : (defaultValue !== null ? defaultValue : this.defaultPreferences[key]);
  }
  
  /**
   * Set a specific preference
   * @param {string} key - The preference key
   * @param {any} value - The preference value
   * @returns {boolean} Success status
   */
  setPreference(key, value) {
    try {
      // Validate the key exists in default preferences
      if (this.defaultPreferences[key] === undefined) {
        console.warn(`Attempting to set unknown preference: ${key}`);
      }
      
      // Validate value based on type
      const defaultType = typeof this.defaultPreferences[key];
      if (typeof value !== defaultType) {
        console.warn(`Type mismatch for preference ${key}. Expected ${defaultType}, got ${typeof value}`);
        
        // Try to convert the value to the correct type
        if (defaultType === 'number') {
          value = Number(value);
          if (isNaN(value)) {
            throw new Error(`Cannot convert value to number for preference ${key}`);
          }
        } else if (defaultType === 'boolean') {
          value = Boolean(value);
        } else if (defaultType === 'string') {
          value = String(value);
        }
      }
      
      // Additional validation for specific preferences
      if (key === 'recordingSensitivity' && (value < 0 || value > 1)) {
        value = Math.max(0, Math.min(1, value)); // Clamp between 0 and 1
      } else if (key === 'automaticRecordingTimeout') {
        value = Math.max(5, Math.min(600, value)); // Between 5 seconds and 10 minutes
      }
      
      // Set the preference
      this.preferences[key] = value;
      
      // Save to file
      return this.savePreferences();
    } catch (error) {
      console.error(`Error setting preference ${key}:`, error);
      return false;
    }
  }
  
  /**
   * Set multiple preferences at once
   * @param {Object} prefsObject - Object containing preferences to set
   * @returns {boolean} Success status
   */
  setPreferences(prefsObject) {
    try {
      if (!prefsObject || typeof prefsObject !== 'object') {
        throw new Error('Invalid preferences object');
      }
      
      // Update each preference
      Object.entries(prefsObject).forEach(([key, value]) => {
        if (this.defaultPreferences[key] !== undefined) {
          // Use setPreference for each key to ensure validation
          this.setPreference(key, value);
        }
      });
      
      // Save to file
      return this.savePreferences();
    } catch (error) {
      console.error('Error setting multiple preferences:', error);
      return false;
    }
  }
  
  /**
   * Reset preferences to defaults
   * @returns {boolean} Success status
   */
  resetToDefaults() {
    try {
      this.preferences = { ...this.defaultPreferences };
      return this.savePreferences();
    } catch (error) {
      console.error('Error resetting preferences:', error);
      return false;
    }
  }
  
  /**
   * Get available microphone devices
   * @returns {Promise<Array>} List of available microphone devices
   */
  async getAvailableMicrophoneDevices() {
    try {
      // This needs to be called from the renderer process
      // We'll implement IPC handlers for this
      return [];
    } catch (error) {
      console.error('Error getting microphone devices:', error);
      return [];
    }
  }
}

// Export a singleton instance
const preferencesService = new PreferencesService();
export default preferencesService;
