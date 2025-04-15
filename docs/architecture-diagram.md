# Sticker Application Architecture Diagram

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                        Sticker Application                              │
│                                                                         │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                           Main Process                                  │
│                                                                         │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐        │
│  │                 │   │                 │   │                 │        │
│  │  Application    │   │  Window         │   │  System Tray    │        │
│  │  Manager        │   │  Manager        │   │  Integration    │        │
│  │                 │   │                 │   │                 │        │
│  └────────┬────────┘   └────────┬────────┘   └────────┬────────┘        │
│           │                     │                     │                  │
│           └──────────┬──────────┴──────────┬──────────┘                  │
│                      │                     │                             │
│                      ▼                     ▼                             │
│  ┌─────────────────────────┐   ┌─────────────────────────┐              │
│  │                         │   │                         │              │
│  │  Services               │   │  Utilities              │              │
│  │                         │   │                         │              │
│  │  ┌─────────────────┐    │   │  ┌─────────────────┐    │              │
│  │  │ StickerData     │    │   │  │ JsonUtils       │    │              │
│  │  │ Manager         │    │   │  └─────────────────┘    │              │
│  │  └─────────────────┘    │   │                         │              │
│  │                         │   │  ┌─────────────────┐    │              │
│  │  ┌─────────────────┐    │   │  │ FileUtils       │    │              │
│  │  │ WhisperService  │    │   │  └─────────────────┘    │              │
│  │  └─────────────────┘    │   │                         │              │
│  │                         │   │  ┌─────────────────┐    │              │
│  │  ┌─────────────────┐    │   │  │ Logger          │    │              │
│  │  │ AudioRecording  │    │   │  └─────────────────┘    │              │
│  │  │ Service         │    │   │                         │              │
│  │  └─────────────────┘    │   │  ┌─────────────────┐    │              │
│  │                         │   │  │ DebugUtils      │    │              │
│  │  ┌─────────────────┐    │   │  └─────────────────┘    │              │
│  │  │ Preferences     │    │   │                         │              │
│  │  │ Service         │    │   └─────────────────────────┘              │
│  │  └─────────────────┘    │                                            │
│  │                         │                                            │
│  └─────────────────────────┘                                            │
│                                                                         │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  │ IPC Communication
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                         Renderer Processes                              │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                                                                 │    │
│  │  Sticker Window                                                 │    │
│  │                                                                 │    │
│  │  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────┐    │    │
│  │  │                 │   │                 │   │             │    │    │
│  │  │  Sticker        │   │  Sticker        │   │  Microphone │    │    │
│  │  │  Header         │   │  Content        │   │  Button     │    │    │
│  │  │                 │   │                 │   │             │    │    │
│  │  └─────────────────┘   └─────────────────┘   └──────┬──────┘    │    │
│  │                                                     │           │    │
│  │                                                     ▼           │    │
│  │                                             ┌─────────────────┐ │    │
│  │                                             │                 │ │    │
│  │                                             │  AudioRecorder  │ │    │
│  │                                             │                 │ │    │
│  │                                             └─────────────────┘ │    │
│  │                                                                 │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                          External Services                              │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────┐        │
│  │                                                             │        │
│  │  OpenAI Whisper API                                         │        │
│  │                                                             │        │
│  └─────────────────────────────────────────────────────────────┘        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  User           │     │  Sticker        │     │  Main           │
│  Interface      │     │  Window         │     │  Process        │
│                 │     │                 │     │                 │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │  User Input           │                       │
         │ ─────────────────────▶│                       │
         │                       │                       │
         │                       │  Update Request       │
         │                       │ ─────────────────────▶│
         │                       │                       │
         │                       │                       │  Save Data
         │                       │                       │ ─────────┐
         │                       │                       │          │
         │                       │                       │          ▼
         │                       │                       │  ┌─────────────────┐
         │                       │                       │  │                 │
         │                       │                       │  │  File System    │
         │                       │                       │  │                 │
         │                       │                       │  └─────────────────┘
         │                       │                       │          │
         │                       │                       │  Load Data
         │                       │                       │ ◀─────────┘
         │                       │                       │
         │                       │  Update Response      │
         │                       │ ◀─────────────────────│
         │                       │                       │
         │  UI Update            │                       │
         │ ◀─────────────────────│                       │
         │                       │                       │
```

## Speech-to-Text Flow Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │     │                 │
│  Microphone     │     │  AudioRecorder  │     │  Whisper        │     │  OpenAI         │
│  Button         │     │  (Renderer)     │     │  Service        │     │  Whisper API    │
│                 │     │                 │     │                 │     │                 │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │                       │
         │  Click                │                       │                       │
         │ ─────────────────────▶│                       │                       │
         │                       │                       │                       │
         │                       │  Start Recording      │                       │
         │                       │ ─────────┐            │                       │
         │                       │          │            │                       │
         │                       │          ▼            │                       │
         │                       │  ┌─────────────────┐  │                       │
         │                       │  │                 │  │                       │
         │                       │  │  MediaRecorder  │  │                       │
         │                       │  │                 │  │                       │
         │                       │  └────────┬────────┘  │                       │
         │                       │           │           │                       │
         │                       │  Audio Data           │                       │
         │                       │ ◀─────────┘           │                       │
         │                       │                       │                       │
         │                       │  Save Audio           │                       │
         │                       │ ─────────────────────▶│                       │
         │                       │                       │                       │
         │                       │                       │  Transcribe Request   │
         │                       │                       │ ─────────────────────▶│
         │                       │                       │                       │
         │                       │                       │  Transcription        │
         │                       │                       │ ◀─────────────────────│
         │                       │                       │                       │
         │                       │  Transcription Result │                       │
         │                       │ ◀─────────────────────│                       │
         │                       │                       │                       │
         │  Update Content       │                       │                       │
         │ ◀─────────────────────│                       │                       │
         │                       │                       │                       │
```

## File Storage Structure

```
{userData}/
├── stickers-layout.json    # Sticker position and size data
├── stickers-content.json   # Sticker text content
├── preferences.json        # User preferences
├── backups/                # Automatic backups
│   ├── stickers-layout-{timestamp}.json
│   ├── stickers-content-{timestamp}.json
│   └── preferences-{timestamp}.json
└── temp/                   # Temporary files
    └── sticker-audio/      # Audio recordings
        └── recording-{timestamp}.webm
```

## Component Relationships

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Application    │────▶│  Window         │────▶│  Sticker        │
│  Manager        │     │  Manager        │     │  Window         │
│                 │     │                 │     │                 │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  StickerData    │◀───▶│  JsonUtils      │     │  Sticker        │
│  Manager        │     │                 │     │  Content        │
│                 │     │                 │     │                 │
└────────┬────────┘     └─────────────────┘     └────────┬────────┘
         │                                               │
         │                                               │
         ▼                                               ▼
┌─────────────────┐                             ┌─────────────────┐
│                 │                             │                 │
│  FileUtils      │                             │  Microphone     │
│                 │                             │  Button         │
│                 │                             │                 │
└─────────────────┘                             └────────┬────────┘
                                                         │
                                                         │
                                                         ▼
                                               ┌─────────────────┐
                                               │                 │
                                               │  AudioRecorder  │
                                               │                 │
                                               │                 │
                                               └────────┬────────┘
                                                        │
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │                 │
                                               │  AudioRecording │
                                               │  Service        │
                                               │                 │
                                               └────────┬────────┘
                                                        │
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │                 │
                                               │  WhisperService │
                                               │                 │
                                               │                 │
                                               └─────────────────┘
```

## IPC Communication Channels

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                           IPC Channels                                  │
│                                                                         │
├─────────────────────────────┬───────────────────┬─────────────────────┬─┘
│                             │                   │                     │
│  Sticker Management         │  Audio/Speech     │  Preferences        │
│                             │                   │                     │
│  - create-sticker           │  - save-recorded- │  - get-preferences  │
│  - update-sticker           │    audio          │  - set-preferences  │
│  - remove-sticker           │  - transcribe-    │                     │
│  - load-stickers            │    audio          │                     │
│  - save-stickers            │  - delete-temp-   │                     │
│  - realign-stickers         │    audio          │                     │
│  - hide-all-stickers        │  - check-         │                     │
│  - show-all-stickers        │    microphone-    │                     │
│                             │    permission     │                     │
│                             │  - request-       │                     │
│                             │    microphone-    │                     │
│                             │    permission     │                     │
│                             │                   │                     │
└─────────────────────────────┴───────────────────┴─────────────────────┘
```

## Test Structure

```
tests/
├── unit/                   # Unit tests
│   ├── services/           # Service tests
│   │   ├── whisperService.test.js
│   │   ├── audioRecordingService.test.js
│   │   ├── preferencesService.test.js
│   │   └── stickerDataManager.test.js
│   ├── utils/              # Utility tests
│   │   ├── jsonUtils.test.js
│   │   ├── fileUtils.test.js
│   │   └── debugUtils.test.js
│   └── components/         # Component tests
│       ├── audioRecorder.test.js
│       ├── microphoneButton.test.js
│       └── stickerContent.test.js
├── integration/            # Integration tests
│   ├── sticker-creation.spec.js
│   ├── sticker-editing.spec.js
│   ├── sticker-persistence.spec.js
│   └── speech-to-text.spec.js
└── fixtures/               # Test fixtures
    ├── mock-audio.webm
    ├── stickers-layout.json
    └── stickers-content.json
```
