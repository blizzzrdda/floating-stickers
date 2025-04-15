// audioRecordingService.js - Service for handling audio recording in the Electron application
import { ipcMain, dialog } from 'electron';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * AudioRecordingService - A service for handling audio recording functionality
 * in the Electron application.
 */
class AudioRecordingService {
  constructor() {
    this.isInitialized = false;
    this.tempDir = path.join(os.tmpdir(), 'sticker-audio-recordings');
    
    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
    
    // Initialize IPC handlers
    this.initializeIpcHandlers();
    
    console.log('AudioRecordingService initialized successfully');
  }
  
  /**
   * Initialize IPC handlers for communication with renderer process
   */
  initializeIpcHandlers() {
    // Handler for checking microphone permissions
    ipcMain.handle('check-microphone-permission', async () => {
      return this.checkMicrophonePermission();
    });
    
    // Handler for requesting microphone permissions
    ipcMain.handle('request-microphone-permission', async () => {
      return this.requestMicrophonePermission();
    });
    
    // Handler for saving recorded audio
    ipcMain.handle('save-recorded-audio', async (event, audioData) => {
      return this.saveRecordedAudio(audioData);
    });
    
    // Handler for deleting temporary audio files
    ipcMain.handle('delete-temp-audio', async (event, filePath) => {
      return this.deleteTempAudio(filePath);
    });
  }
  
  /**
   * Check if microphone permissions are granted
   * @returns {Promise<boolean>} - Whether permissions are granted
   */
  async checkMicrophonePermission() {
    // In Electron, we can't directly check permissions from the main process
    // This will be implemented in the renderer process using the Web Audio API
    // Here we just return a success response
    return { success: true, message: 'Permission check must be done in renderer process' };
  }
  
  /**
   * Request microphone permissions
   * @returns {Promise<Object>} - Result of permission request
   */
  async requestMicrophonePermission() {
    // In Electron, permissions are requested from the renderer process
    // This will be implemented in the renderer process using the Web Audio API
    // Here we just return a success response
    return { success: true, message: 'Permission request must be done in renderer process' };
  }
  
  /**
   * Save recorded audio data to a temporary file
   * @param {Object} audioData - The audio data to save
   * @returns {Promise<Object>} - Result with the file path
   */
  async saveRecordedAudio(audioData) {
    try {
      // Generate a unique filename
      const timestamp = new Date().getTime();
      const filename = `recording_${timestamp}.webm`;
      const filePath = path.join(this.tempDir, filename);
      
      // Convert base64 data to buffer
      const buffer = Buffer.from(audioData.data, 'base64');
      
      // Write the buffer to a file
      fs.writeFileSync(filePath, buffer);
      
      return {
        success: true,
        filePath,
        message: 'Audio saved successfully'
      };
    } catch (error) {
      console.error('Error saving audio:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to save audio'
      };
    }
  }
  
  /**
   * Delete a temporary audio file
   * @param {string} filePath - Path to the audio file
   * @returns {Promise<Object>} - Result of the deletion
   */
  async deleteTempAudio(filePath) {
    try {
      // Verify the file is in our temp directory (security check)
      if (!filePath.startsWith(this.tempDir)) {
        throw new Error('Invalid file path');
      }
      
      // Check if file exists
      if (fs.existsSync(filePath)) {
        // Delete the file
        fs.unlinkSync(filePath);
        return {
          success: true,
          message: 'Audio file deleted successfully'
        };
      } else {
        return {
          success: false,
          message: 'Audio file not found'
        };
      }
    } catch (error) {
      console.error('Error deleting audio file:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to delete audio file'
      };
    }
  }
  
  /**
   * Clean up temporary audio files older than the specified age
   * @param {number} maxAgeMs - Maximum age in milliseconds
   * @returns {Promise<Object>} - Result of the cleanup
   */
  async cleanupTempAudio(maxAgeMs = 24 * 60 * 60 * 1000) { // Default: 24 hours
    try {
      const now = new Date().getTime();
      const files = fs.readdirSync(this.tempDir);
      let deletedCount = 0;
      
      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = fs.statSync(filePath);
        const fileAge = now - stats.mtimeMs;
        
        if (fileAge > maxAgeMs) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      }
      
      return {
        success: true,
        deletedCount,
        message: `Cleaned up ${deletedCount} old audio files`
      };
    } catch (error) {
      console.error('Error cleaning up temp audio:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to clean up temp audio files'
      };
    }
  }
}

// Export a singleton instance
const audioRecordingService = new AudioRecordingService();
export default audioRecordingService;
