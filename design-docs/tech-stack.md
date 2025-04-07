# Technical Stack: Floating Stickers

## 1. Architecture

Electron Desktop Application

## 2. Technology Stack

- **Primary:**
    - Language: JavaScript (ES6+)
    - Markup: HTML5
    - Styling: CSS3
    - Framework: None (Vanilla JS)
    - Desktop Platform: Electron.js
    - Persistence: Node.js `fs` module for file-based saving
- **External Services / APIs:**
    - OpenAI API (for real-time streaming Speech-to-Text)
        - Uses Whisper or similar model for real-time transcription
        - Requires API Key management
        - Streaming connection for low-latency transcription
- **System Requirements:**
    - Microphone access for Speech-to-Text functionality.

## 3. Data Model

- **Notes Collection:** Array of Note Objects
- **Note Object:**
    - `id`: String # Unique identifier (e.g., timestamp)
    - `content`: String # Text content of the note
    - `position`:
        - `x`: Number # Pixels from left edge of screen
        - `y`: Number # Pixels from top edge of screen
    - `size`:
        - `width`: Number
        - `height`: Number
    - `sttActive`: Boolean # Whether Speech-to-Text is currently active for this note
