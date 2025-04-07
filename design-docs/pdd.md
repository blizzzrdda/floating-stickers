# Project Design Document: Floating Stickers

## 1. Overview

**Project Name:** FloatingStickers

**Description:**
A desktop application allowing users to create, manage, and position multiple independent "sticky notes" or "stickers" containing text. Inspired by the user-provided reference image.

## 2. Goals

- Provide a simple interface for capturing quick text notes.
- Notes are auto aligned vertically when created.
- Persist notes between application sessions.
- Mimic the visual appearance of draggable cards/notes shown in the reference image.

## 3. Core Features

- **F01: Note Creation:** User can create new, empty notes via a dedicated system tray or menu option. New notes appear below existing notes.
- **F02: Note Editing:** User can click into a note's content area and type/edit text directly.
- **F03: Note Movement (Dragging):** User can click and drag a note by its header area to reposition it anywhere on the screen.
- **F04: Note Deletion:** Each note has a visible control (e.g., an 'X' button) to close/delete it permanently.
- **F05: Note Persistence:** The content, position, and size of all active notes are saved when the application closes and restored when it reopens.
- **F06: Real-time Speech-to-Text:** User can activate microphone input to transcribe spoken words directly into the focused note in real-time using OpenAI's service.

## 4. UI/UX Design

### 4.1 Layout

- **Notes:**
    - Display: Individual transparent windows acting as sticky notes.
    - Positioning: Absolute positioning based on saved x/y coordinates.
    - Stacking: System level window stacking.

### 4.2 Components

- **Note Card:**
    - Header/Drag Area
    - Content Area (Editable text block)
    - Close Button ('X' icon in top-right corner)
    - Microphone Button (Toggle STT activation)
- **Global Controls:**
    - System Tray Icon with context menu
    - Controls for adding, showing, and hiding notes

### 4.3 Styling

- **Note Appearance:**
    - Background: Light yellow color
    - Border: Frameless window with subtle shadow
    - Padding: Internal padding around text content
- **Typography:** Clear, readable sans-serif font

### 4.4 Interactions

- **Drag:** Header click-hold-drag-release mechanism. Cursor changes to 'grab'/'grabbing'.
- **Edit:** Click inside content area activates text editing mode.
- **Close:** Single click on 'X' button removes the note.
- **Create:** New notes are auto-aligned in a vertical stack.
- **Speech-to-Text:**
    - Click Microphone button on a note to start streaming audio.
    - Spoken words are transcribed and appended to the note's content area.
    - Click Microphone button again to stop streaming.
    - Visual indicator shows when STT is active (e.g., button highlights).

## 5. Future Enhancements

- Sticker themes and colors
- Sticker categorization: debug, new feature, meeting notes, etc.
- Connect to discord channel. If debug, post to #dev-bugs. If new feature, post to #feature-requests on completion.
- Keyboard shortcuts for common actions
- Note grouping or folders
