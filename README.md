# Floating Stickers

A frameless desktop application that allows you to create and manage floating stickers on your screen.

## Features

- Create transparent, frameless sticky notes that float on your desktop
- Notes persist between application restarts
- Drag notes anywhere on your screen
- Auto-alignment of new stickers in a vertical stack
- Resize notes as needed
- System tray icon for easy management
- Minimal UI - no main application window

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm (v7+)

### Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the application:
   ```
   npm start
   ```

### Building the Application

To build the application for your platform:

```
npm run build
```

To create a Windows package:

```
npm run package
```

## Usage

- **Add a new sticker**: Right-click on the system tray icon and select "Add New Sticker"
- **Move a sticker**: Click and drag the sticker header
- **Edit sticker content**: Click inside the sticker and type
- **Resize a sticker**: Drag the resize handle at the bottom-right corner
- **Close a sticker**: Click the close button (×) in the top-right corner
- **Show/Hide all stickers**: Right-click on the system tray icon and select "Show All Stickers" or "Hide All Stickers"
- **Exit the application**: Right-click on the system tray icon and select "Exit"

## Important Note

Before building the application, replace the `icon.txt` file with a proper `icon.png` file (256x256 pixels recommended) for your application icon.

## Technologies Used

- HTML5
- CSS3
- JavaScript (Vanilla, no frameworks)
- Electron.js for desktop packaging
- Node.js file system for persistence

## Future Enhancements

- Sticker themes and colors
- Sticker categorization (debug, new feature, meeting notes, etc.)
- Keyboard shortcuts
- Note grouping or folders
- Connection to Discord channels for sharing stickers

## License

This project is open source and available under the MIT License. 