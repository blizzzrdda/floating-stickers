// whisperService.js - OpenAI Whisper API client for speech-to-text functionality
import { OpenAI } from 'openai';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Get the API key from environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * WhisperService - A service for handling OpenAI Whisper API communication
 * for speech-to-text functionality in the Sticker application.
 */
class WhisperService {
  constructor() {
    // Validate API key
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key is missing. Please add it to your .env file as OPENAI_API_KEY.');
    }

    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });

    console.log('WhisperService initialized successfully');
  }

  /**
   * Prepares audio data for submission to the Whisper API
   * @param {Buffer|string} audioInput - Audio data as buffer or file path
   * @returns {Promise<Buffer>} - Prepared audio data
   */
  async prepareAudioData(audioInput) {
    try {
      // If audioInput is a string, assume it's a file path
      if (typeof audioInput === 'string') {
        // Check if file exists
        if (!fs.existsSync(audioInput)) {
          throw new Error(`Audio file not found: ${audioInput}`);
        }

        // Read file as buffer
        return fs.readFileSync(audioInput);
      }

      // If audioInput is already a Buffer, return it
      if (Buffer.isBuffer(audioInput)) {
        return audioInput;
      }

      throw new Error('Invalid audio input format. Expected file path or Buffer.');
    } catch (error) {
      console.error('Error preparing audio data:', error);
      throw error;
    }
  }

  /**
   * Sends audio data to the Whisper API and returns the transcription
   * @param {Buffer} preparedAudioData - Prepared audio data
   * @param {Object} options - Transcription options
   * @returns {Promise<Object>} - API response
   */
  async transcribeAudio(preparedAudioData, options = {}) {
    let tempFilePath = null;

    try {
      // Performance monitoring
      const startTime = Date.now();
      console.log(`Starting transcription of ${preparedAudioData.length / 1024} KB audio data`);

      // Default options optimized for performance and accuracy
      const defaultOptions = {
        model: 'whisper-1',
        language: 'en', // Default to English
        response_format: 'json',
        temperature: 0, // 0 for maximum determinism/accuracy
      };

      // Merge default options with provided options
      const transcriptionOptions = {
        ...defaultOptions,
        ...options,
      };

      // Generate a unique temp file name to avoid conflicts
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 10);
      tempFilePath = path.join(process.cwd(), `temp_audio_${timestamp}_${randomString}.mp3`);

      // Write the audio data to a temporary file
      fs.writeFileSync(tempFilePath, preparedAudioData);

      // Log file size for performance monitoring
      const stats = fs.statSync(tempFilePath);
      console.log(`Temporary audio file created: ${stats.size / 1024} KB`);

      // Send the request to the OpenAI API with timeout handling
      const response = await Promise.race([
        this.openai.audio.transcriptions.create({
          file: fs.createReadStream(tempFilePath),
          ...transcriptionOptions,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('API request timed out after 30 seconds')), 30000)
        )
      ]);

      // Performance monitoring
      const duration = (Date.now() - startTime) / 1000;
      console.log(`Transcription completed in ${duration.toFixed(2)} seconds`);

      return response;
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw this.processApiError(error);
    } finally {
      // Clean up the temporary file regardless of success or failure
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
          console.log('Temporary audio file cleaned up');
        } catch (cleanupError) {
          console.error('Failed to clean up temporary file:', cleanupError);
        }
      }
    }
  }

  /**
   * Processes API errors and returns a more user-friendly error
   * @param {Error} error - The original error
   * @returns {Error} - Processed error
   */
  processApiError(error) {
    // Check if it's an OpenAI API error
    if (error.response) {
      const status = error.response.status;

      // Handle different error types
      if (status === 401) {
        return new Error('Authentication error: Invalid API key');
      } else if (status === 429) {
        return new Error('Rate limit exceeded: Too many requests');
      } else if (status === 500) {
        return new Error('OpenAI server error: Please try again later');
      }
    }

    // Return the original error if it's not an API error or not handled above
    return error;
  }

  /**
   * Processes the API response to extract the transcription text
   * @param {Object} apiResponse - The API response
   * @returns {string} - The transcribed text
   */
  processResponse(apiResponse) {
    try {
      // Extract the text from the response
      if (apiResponse && apiResponse.text) {
        return apiResponse.text.trim();
      }

      throw new Error('Invalid API response format');
    } catch (error) {
      console.error('Error processing API response:', error);
      throw error;
    }
  }

  /**
   * High-level method to transcribe audio from a file path or buffer
   * @param {Buffer|string} audioInput - Audio data as buffer or file path
   * @param {Object} options - Transcription options
   * @returns {Promise<string>} - The transcribed text
   */
  async transcribe(audioInput, options = {}) {
    try {
      // Prepare the audio data
      const preparedData = await this.prepareAudioData(audioInput);

      // Send to API
      const apiResponse = await this.transcribeAudio(preparedData, options);

      // Process the response
      return this.processResponse(apiResponse);
    } catch (error) {
      console.error('Transcription failed:', error);
      throw error;
    }
  }

  /**
   * Convenience method to transcribe audio from a file path
   * @param {string} filePath - Path to the audio file
   * @param {Object} options - Transcription options
   * @returns {Promise<string>} - The transcribed text
   */
  async transcribeFile(filePath, options = {}) {
    return this.transcribe(filePath, options);
  }

  /**
   * Convenience method to transcribe audio from a buffer
   * @param {Buffer} audioBuffer - Audio data as buffer
   * @param {Object} options - Transcription options
   * @returns {Promise<string>} - The transcribed text
   */
  async transcribeBuffer(audioBuffer, options = {}) {
    return this.transcribe(audioBuffer, options);
  }
}

// Export a singleton instance
const whisperService = new WhisperService();
export default whisperService;
