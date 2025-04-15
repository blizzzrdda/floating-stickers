# Speech-to-Text Feature User Guide

## Introduction

The Sticker application now includes a powerful speech-to-text feature that allows you to convert your spoken words into text directly in your stickers. This guide will help you get the most out of this feature, from basic usage to advanced settings.

## Getting Started

### Basic Usage

1. **Open a sticker** or create a new one.
2. **Click the microphone button** located in the sticker toolbar.
3. **Start speaking** clearly into your microphone.
4. **Click the microphone button again** to stop recording.
5. Your speech will be processed and the transcribed text will appear in your sticker.

### Recording Status Indicators

The microphone button changes appearance to indicate the current status:

- **Idle (default)**: Microphone icon is static.
- **Recording**: Microphone icon pulses with a red dot indicator.
- **Processing**: Spinning indicator appears while your speech is being transcribed.

## Best Practices for Optimal Results

### Speaking Tips

- **Speak clearly** at a normal pace.
- **Avoid background noise** when possible.
- **Position yourself close** to your microphone (3-12 inches is ideal).
- **Use proper punctuation** by saying "period," "comma," "question mark," etc.
- **Speak in complete sentences** for better context recognition.

### Hardware Recommendations

- **Headset microphones** generally provide better results than built-in laptop microphones.
- **External USB microphones** offer the best quality for frequent users.
- **Check your microphone settings** in your operating system to ensure proper volume levels.

### Environmental Considerations

- **Quiet environments** yield the best transcription accuracy.
- **Avoid echo-prone rooms** (large empty rooms, bathrooms, etc.).
- **Reduce background noise** such as fans, air conditioners, or music when possible.
- **Close windows** to minimize outdoor noise interference.

## Customizing Speech-to-Text Settings

### Accessing Settings

1. Click on the **Sticker icon** in the system tray.
2. Select **Settings** from the menu.
3. Navigate to the **Speech-to-Text** section.

### Available Settings

- **Default Microphone**: Choose which microphone to use for recording.
- **Recording Sensitivity**: Adjust how sensitive the microphone is to sound (higher values pick up quieter sounds).
- **Automatic Recording Timeout**: Set the maximum recording duration (5-600 seconds).
- **Text Mode**: Choose whether to append new transcriptions to existing text or replace it entirely.
- **Language**: Select the primary language for speech recognition.

## Supported Languages

The speech-to-text feature supports the following languages:

- English (Default)
- Spanish
- French
- German
- Japanese
- Chinese

To change the language:

1. Open **Settings** from the system tray menu.
2. Go to the **Speech-to-Text** section.
3. Select your preferred language from the options.

## Troubleshooting

### Microphone Access Issues

If the application cannot access your microphone:

1. Check that your microphone is properly connected.
2. Verify that you've granted microphone permissions to the application.
3. Test your microphone in another application to ensure it's working.
4. Restart the application after connecting a new microphone.

### Poor Transcription Accuracy

If you're experiencing poor transcription results:

1. **Reduce background noise** in your environment.
2. **Speak more clearly** and at a moderate pace.
3. **Check your microphone position** and ensure it's not obstructed.
4. **Adjust the recording sensitivity** in Settings.
5. **Try a different microphone** if available.

### Processing Errors

If you encounter errors during speech processing:

1. Check your internet connection (required for transcription).
2. Try recording a shorter segment.
3. Restart the application and try again.
4. Verify that the OpenAI API service is operational.

## Keyboard Shortcuts

- **Start/Stop Recording**: Ctrl+Shift+M
- **Cancel Recording**: Esc (while recording)
- **Open Settings**: Ctrl+,

## Tips and Tricks

### For Longer Dictations

- The application automatically stops recording after the timeout period (default: 3 minutes).
- For longer content, break your dictation into smaller segments.
- You can append multiple recordings to build longer documents.

### For Technical Content

- Speak technical terms clearly and slightly slower.
- For acronyms, try both spelling them out and pronouncing them as words to see which works better.
- Numbers and special characters are generally recognized well, but verify critical information.

### For Multilingual Users

- Set your primary language in the settings for best results.
- You can change languages between recording sessions.
- Avoid mixing languages within a single recording for optimal accuracy.

## Privacy Information

- Audio recordings are processed using OpenAI's Whisper API.
- Recordings are sent securely and are not permanently stored after processing.
- No audio data is retained on OpenAI's servers after transcription is complete.
- Your privacy and data security are important to us.

## Feedback and Support

We're continuously improving the speech-to-text feature. If you encounter issues or have suggestions:

- Use the "Send Feedback" option in the Help menu.
- Include specific details about any problems you encounter.
- Let us know which languages or specific use cases you'd like to see improved.

Thank you for using the Sticker application's speech-to-text feature!
