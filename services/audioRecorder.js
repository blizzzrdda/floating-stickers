// audioRecorder.js - Client-side audio recording functionality for stickers
// This file will be loaded in the renderer process

/**
 * AudioRecorder - A class for handling audio recording in the browser context
 */
class AudioRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.stream = null;
    this.onStatusChange = null;
    this.onRecordingComplete = null;
    this.onError = null;
  }

  /**
   * Set callback for status changes
   * @param {Function} callback - Function to call when recording status changes
   */
  setStatusChangeCallback(callback) {
    this.onStatusChange = callback;
  }

  /**
   * Set callback for recording completion
   * @param {Function} callback - Function to call when recording is complete
   */
  setRecordingCompleteCallback(callback) {
    this.onRecordingComplete = callback;
  }

  /**
   * Set callback for errors
   * @param {Function} callback - Function to call when an error occurs
   */
  setErrorCallback(callback) {
    this.onError = callback;
  }

  /**
   * Update recording status and trigger callback
   * @param {string} status - The new status
   * @param {Object} data - Additional data to pass to the callback
   */
  updateStatus(status, data = {}) {
    if (this.onStatusChange) {
      this.onStatusChange(status, data);
    }
  }

  /**
   * Check if microphone permissions are granted
   * @returns {Promise<boolean>} - Whether permissions are granted
   */
  async checkPermission() {
    try {
      // Try to get user media to check permissions
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // If we get here, permission is granted
      // Stop the stream since we're just checking
      stream.getTracks().forEach(track => track.stop());

      return true;
    } catch (error) {
      console.error('Microphone permission check failed:', error);
      return false;
    }
  }

  /**
   * Request microphone permissions
   * @returns {Promise<boolean>} - Whether permissions were granted
   */
  async requestPermission() {
    try {
      this.updateStatus('requesting_permission');

      // Request user media to trigger permission dialog
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // If we get here, permission was granted
      // Stop the stream since we're just requesting permission
      stream.getTracks().forEach(track => track.stop());

      this.updateStatus('permission_granted');
      return true;
    } catch (error) {
      console.error('Microphone permission request failed:', error);
      this.updateStatus('permission_denied');

      if (this.onError) {
        this.onError('permission_denied', 'Microphone access was denied. Please allow microphone access to use speech-to-text.');
      }

      return false;
    }
  }

  /**
   * Start recording audio
   * @returns {Promise<boolean>} - Whether recording started successfully
   */
  async startRecording() {
    try {
      if (this.isRecording) {
        console.warn('Already recording, stopping current recording first');
        await this.stopRecording();
      }

      this.updateStatus('starting');

      // Check and request permission if needed
      const hasPermission = await this.checkPermission();
      if (!hasPermission) {
        const permissionGranted = await this.requestPermission();
        if (!permissionGranted) {
          return false;
        }
      }

      // Load user preferences for recording
      let preferences = {
        defaultMicrophoneDevice: '',
        recordingSensitivity: 0.8,
        automaticRecordingTimeout: 180, // 3 minutes default
        textAppendMode: true,
        language: 'en'
      };

      try {
        // Get preferences from the API
        const prefsResult = await window.stickerAPI.getPreferences();
        if (prefsResult.success) {
          preferences = prefsResult.preferences;
          console.log('Loaded recording preferences:', preferences);
        }
      } catch (prefsError) {
        console.warn('Could not load preferences, using defaults:', prefsError);
      }

      // Prepare audio constraints with user preferences
      const audioConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 16000, // 16kHz is optimal for speech recognition (Whisper model)
        channelCount: 1,   // Mono for better speech recognition and smaller file size
        latency: 0.01,     // Low latency for better responsiveness
        // Apply sensitivity setting (via volume)
        volume: preferences.recordingSensitivity,
        // Specify audio constraints for better quality/size balance
        advanced: [
          { autoGainControl: { ideal: true } },
          { noiseSuppression: { ideal: true } },
          { echoCancellation: { ideal: true } },
        ]
      };

      // If user has selected a specific microphone device, use it
      if (preferences.defaultMicrophoneDevice) {
        audioConstraints.deviceId = { exact: preferences.defaultMicrophoneDevice };
      }

      // Store preferences for use in other methods
      this.preferences = preferences;

      // Get audio stream with optimized settings for speech recognition
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints
      });

      // Create media recorder with optimized settings
      this.audioChunks = [];

      // Determine the best mime type available
      const mimeTypes = [
        'audio/webm;codecs=opus', // Best quality/size ratio for speech
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        'audio/mpeg'
      ];

      let mimeType = '';
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }

      // Configure the MediaRecorder with optimized settings
      const options = {
        audioBitsPerSecond: 32000, // 32kbps is sufficient for speech
        mimeType: mimeType
      };

      this.mediaRecorder = new MediaRecorder(this.stream, options);

      // Set up event handlers with optimized data collection
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);

          // Monitor memory usage (rough estimate)
          const totalSize = this.audioChunks.reduce((size, chunk) => size + chunk.size, 0);
          if (totalSize > 10 * 1024 * 1024) { // 10MB limit
            console.warn('Audio recording size exceeds 10MB, consider stopping recording');
            // Could automatically stop here if needed
          }
        }
      };

      this.mediaRecorder.onstop = async () => {
        // Process the recorded audio
        await this.processRecording();
      };

      // Start recording with timeslice to get data in smaller chunks (500ms)
      // This improves memory usage and allows for streaming processing if needed
      this.mediaRecorder.start(500);
      this.isRecording = true;
      this.recordingStartTime = new Date();
      this.updateStatus('recording', { startTime: this.recordingStartTime });

      // Set a maximum recording duration based on user preference
      const timeoutSeconds = this.preferences?.automaticRecordingTimeout || 180; // Default to 3 minutes
      this.recordingTimeout = setTimeout(() => {
        if (this.isRecording) {
          console.log(`Maximum recording duration (${timeoutSeconds}s) reached, stopping automatically`);
          this.stopRecording();
        }
      }, timeoutSeconds * 1000);

      return true;
    } catch (error) {
      console.error('Error starting recording:', error);
      this.updateStatus('error', { error });

      if (this.onError) {
        this.onError('recording_failed', 'Failed to start recording: ' + error.message);
      }

      return false;
    }
  }

  /**
   * Stop recording audio
   * @returns {Promise<boolean>} - Whether recording stopped successfully
   */
  async stopRecording() {
    try {
      if (!this.isRecording || !this.mediaRecorder) {
        console.warn('Not currently recording');
        return false;
      }

      this.updateStatus('stopping');

      // Clear the recording timeout if it exists
      if (this.recordingTimeout) {
        clearTimeout(this.recordingTimeout);
        this.recordingTimeout = null;
      }

      // Calculate recording duration for analytics
      if (this.recordingStartTime) {
        const duration = (new Date() - this.recordingStartTime) / 1000;
        console.log(`Recording stopped after ${duration.toFixed(1)} seconds`);
      }

      // Stop the media recorder
      this.mediaRecorder.stop();
      this.isRecording = false;

      // Stop all tracks in the stream to release microphone
      if (this.stream) {
        this.stream.getTracks().forEach(track => {
          track.stop();
          console.log(`Released track: ${track.kind}`);
        });
        this.stream = null;
      }

      // Release references to potentially large objects
      this.mediaRecorder = null;

      return true;
    } catch (error) {
      console.error('Error stopping recording:', error);
      this.updateStatus('error', { error });

      // Clean up resources even if there was an error
      this.cleanupResources();

      if (this.onError) {
        this.onError('stop_failed', 'Failed to stop recording: ' + error.message);
      }

      return false;
    }
  }

  /**
   * Clean up all resources used by the recorder
   * This helps prevent memory leaks
   */
  cleanupResources() {
    // Clear the recording timeout
    if (this.recordingTimeout) {
      clearTimeout(this.recordingTimeout);
      this.recordingTimeout = null;
    }

    // Stop all tracks in the stream
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    // Release references to potentially large objects
    this.mediaRecorder = null;

    // Clear audio chunks to free memory
    if (this.audioChunks && this.audioChunks.length > 0) {
      this.audioChunks = [];
    }
  }

  /**
   * Process the recorded audio
   * @returns {Promise<void>}
   */
  async processRecording() {
    try {
      this.updateStatus('processing');

      // Performance optimization: Check if we have any audio data before processing
      if (!this.audioChunks || this.audioChunks.length === 0) {
        throw new Error('No audio data available to process');
      }

      // Get the MIME type from the first chunk if available
      const mimeType = this.audioChunks[0].type || 'audio/webm';

      // Create a blob from the audio chunks with the detected MIME type
      const audioBlob = new Blob(this.audioChunks, { type: mimeType });

      // Log file size for performance monitoring
      const fileSizeKB = (audioBlob.size / 1024).toFixed(2);
      console.log(`Audio recording size: ${fileSizeKB} KB`);

      // Performance optimization: Use a Promise wrapper around FileReader for better control
      const base64data = await this.blobToBase64(audioBlob);

      // Save the audio data via IPC
      const result = await window.stickerAPI.saveRecordedAudio({
        data: base64data,
        type: mimeType,
        size: audioBlob.size
      });

      if (result.success) {
        // Include text append mode in the status update
        const textAppendMode = this.preferences?.textAppendMode !== undefined ?
          this.preferences.textAppendMode : true; // Default to append if not specified

        this.updateStatus('complete', {
          filePath: result.filePath,
          fileSize: fileSizeKB,
          duration: this.recordingStartTime ?
            ((new Date() - this.recordingStartTime) / 1000).toFixed(1) : 'unknown',
          textAppendMode: textAppendMode, // Add this to the status data
          language: this.preferences?.language || 'en' // Include language preference
        });

        // Clear audio chunks to free memory after successful processing
        const blobCopy = audioBlob.slice(0); // Create a copy for the callback
        this.audioChunks = [];

        if (this.onRecordingComplete) {
          this.onRecordingComplete(result.filePath, blobCopy, {
            textAppendMode: textAppendMode,
            language: this.preferences?.language || 'en'
          });
        }
      } else {
        throw new Error(result.message || 'Failed to save recording');
      }
    } catch (error) {
      console.error('Error processing recording:', error);
      this.updateStatus('error', { error });

      if (this.onError) {
        this.onError('processing_failed', 'Failed to process recording: ' + error.message);
      }
    } finally {
      // Clean up resources regardless of success or failure
      this.audioChunks = [];
    }
  }

  /**
   * Convert a Blob to base64 string
   * @param {Blob} blob - The blob to convert
   * @returns {Promise<string>} - Base64 string
   */
  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onloadend = () => {
        // Get base64 data (remove the data URL prefix)
        const base64data = reader.result.split(',')[1];
        resolve(base64data);
      };

      reader.onerror = () => {
        reject(new Error('Failed to convert audio data to base64'));
      };

      // Start reading the blob as data URL
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Cancel the current recording
   * @returns {Promise<boolean>} - Whether cancellation was successful
   */
  async cancelRecording() {
    try {
      if (!this.isRecording) {
        return false;
      }

      this.updateStatus('cancelling');

      // Clear the recording timeout if it exists
      if (this.recordingTimeout) {
        clearTimeout(this.recordingTimeout);
        this.recordingTimeout = null;
      }

      // Stop the media recorder
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }

      // Use the common cleanup method
      this.cleanupResources();

      // Update state
      this.isRecording = false;

      this.updateStatus('cancelled');
      return true;
    } catch (error) {
      console.error('Error cancelling recording:', error);
      this.updateStatus('error', { error });

      // Clean up resources even if there was an error
      this.cleanupResources();
      this.isRecording = false;

      if (this.onError) {
        this.onError('cancel_failed', 'Failed to cancel recording: ' + error.message);
      }

      return false;
    }
  }
}

// Create and export a singleton instance
const audioRecorder = new AudioRecorder();
export default audioRecorder;
