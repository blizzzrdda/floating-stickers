# Sticker Data Format Specification

## Overview

The Sticker application stores data in two separate JSON files:

1. `stickers-layout.json`: Contains position and size information for each sticker
2. `stickers-content.json`: Contains the text content for each sticker

This separation allows for efficient updates and reduces the risk of data corruption.

## File Locations

Both files are stored in the user's data directory, which is determined by the application at runtime.

## Data Structures

### Layout Data (`stickers-layout.json`)

The layout data file contains an array of sticker layout objects with the following structure:

```json
[
  {
    "id": "string",
    "position": {
      "x": number,
      "y": number
    },
    "size": {
      "width": number,
      "height": number
    }
  },
  ...
]
```

#### Layout Object Properties

| Property | Type | Description | Required | Default |
|----------|------|-------------|----------|---------|
| `id` | string | Unique identifier for the sticker | Yes | N/A |
| `position` | object | Position of the sticker on screen | Yes | N/A |
| `position.x` | number | Horizontal position in pixels | Yes | 0 |
| `position.y` | number | Vertical position in pixels | Yes | 0 |
| `size` | object | Size of the sticker | Yes | N/A |
| `size.width` | number | Width in pixels | Yes | 250 |
| `size.height` | number | Height in pixels | Yes | 80 |

### Content Data (`stickers-content.json`)

The content data file contains an array of sticker content objects with the following structure:

```json
[
  {
    "id": "string",
    "content": "string"
  },
  ...
]
```

#### Content Object Properties

| Property | Type | Description | Required | Default |
|----------|------|-------------|----------|---------|
| `id` | string | Unique identifier for the sticker (matches layout ID) | Yes | N/A |
| `content` | string | Text content of the sticker | No | "" |

## Validation Rules

### Layout Data Validation

A valid layout object must:
- Be a non-null object
- Have a non-empty string `id` property
- Have a `position` object with numeric `x` and `y` properties
- Have a `size` object with numeric `width` and `height` properties

### Content Data Validation

A valid content object must:
- Be a non-null object
- Have a non-empty string `id` property
- Have a `content` property that is either undefined or a string

## Merged Data Structure

When the application loads sticker data, it merges the layout and content data into a single structure:

```json
[
  {
    "id": "string",
    "content": "string",
    "position": {
      "x": number,
      "y": number
    },
    "size": {
      "width": number,
      "height": number
    }
  },
  ...
]
```

If a layout exists without matching content, an empty string is used for the content.

## Default Values

When creating a new sticker, the following default values are used:

```json
{
  "id": "<timestamp>",
  "content": "",
  "position": { "x": 0, "y": 0 },
  "size": { "width": 250, "height": 80 }
}
```

## Data Sanitization

When saving sticker data, the application performs the following sanitization:

- `id`: Converted to string, defaults to current timestamp if not provided
- `content`: Converted to string, defaults to empty string if not provided
- `position.x` and `position.y`: Converted to numbers, default to 0 if invalid
- `size.width`: Converted to number, default to 250 if invalid
- `size.height`: Converted to number, default to 80 if invalid

## Version Information

The current data format does not include explicit version information. This is a potential area for improvement to ensure backward compatibility as the application evolves.

## Backup and Recovery

The application creates backups of data files in the following scenarios:

1. Before saving changes (`pre-save` suffix)
2. Before updating stickers (`pre-update` suffix)
3. Before deleting stickers (`pre-delete` suffix)
4. When corrupted data is detected (`corrupt` suffix)

Backup files are named with the original filename plus a suffix and timestamp:
- `stickers-layout.json.pre-update-1234567890`
- `stickers-content.json.pre-update-1234567890`
