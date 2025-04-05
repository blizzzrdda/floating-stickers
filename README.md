# Floating Stickers

<p align="center">
  <img src="icon.png" alt="Floating Stickers Logo" width="128">
</p>

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

#### From Source
1. Clone this repository
   ```
   git clone https://github.com/yourusername/floating-stickers.git
   cd floating-stickers
   ```
2. Install dependencies:
   ```
   npm install
   ```
3. Start the application:
   ```
   npm start
   ```

#### From Release
1. Download the latest release from the [Releases](https://github.com/yourusername/floating-stickers/releases) page
2. For Windows, download the FloatingStickers.exe portable executable
3. Run the application

### Building the Application

To build the application for your platform:

```
npm run build
```

To create a Windows package:

```
npm run package
```

To create a portable Windows executable:

```
npm run package-portable
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

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 