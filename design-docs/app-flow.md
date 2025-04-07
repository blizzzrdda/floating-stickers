# Application Flow: Floating Stickers

## 1. User Interactions / Core Flows

- **Creating a Note:**
    - User interacts with the system tray icon or menu.
    - Selects "New Note" (or similar).
    - A new, empty note window appears on the screen, typically positioned below the last created note or in a default location.
    - The note is ready for text input.

- **Editing a Note:**
    - User clicks inside the content area of an existing note window.
    - The application activates text editing mode for that note.
    - User types or modifies the text content.
    - Changes are typically saved automatically or upon losing focus (details depend on implementation).

- **Real-time Speech-to-Text:**
    - User clicks the microphone button on a note.
    - The application activates microphone input for that note.
    - User speaks into the microphone, and the application begins streaming audio to OpenAI's API.
    - Words are transcribed in real-time as the user speaks, with text appearing in the note immediately.
    - Transcribed text is continuously appended to the note's content area without delay.
    - User can stop the transcription by clicking the microphone button again.

- **Moving a Note:**
    - User clicks and holds the mouse button down on the header/drag area of a note window.
    - The cursor changes to indicate dragging (e.g., 'grab'/'grabbing').
    - User drags the mouse, moving the note window across the screen.
    - User releases the mouse button.
    - The note window stays at the new position.
    - The new position (x, y coordinates) is recorded.

- **Closing/Deleting a Note:**
    - User clicks the 'X' button located in the corner of a note window.
    - The note window closes.
    - The note's data is permanently deleted from the application's storage.

- **Application Start/Persistence:**
    - User launches the Floating Stickers application.
    - The application reads the saved note data (content, position, size) from storage (e.g., a file).
    - For each saved note, the application creates a corresponding note window on the screen at its saved position and size, populated with its saved content.

- **Application Close/Persistence:**
    - User closes the application (e.g., via system tray, closing the main process if applicable).
    - Before fully exiting, the application gathers the current state (content, position, size) of all open notes.
    - This data is saved to persistent storage (e.g., a file).

## 2. System Interactions

- **Window Management:** Notes are individual system windows, allowing standard OS-level interactions like stacking and focusing.
- **Persistence:** The application uses the file system (via Node.js `fs`) to save and load note data.
- **External API:** The application connects to OpenAI's API for real-time streaming Speech-to-Text, sending audio data and receiving transcription results with minimal latency.
- **Hardware Access:** The application requests and manages microphone access for Speech-to-Text functionality.
