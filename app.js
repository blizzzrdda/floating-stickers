// DOM Elements
const stickersContainer = document.getElementById('stickers-container');
const addStickerBtn = document.getElementById('add-sticker-btn');

// State
let stickers = [];
let activeSticker = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
const GRID_SIZE = 20; // For snapping to grid

// Load stickers from Electron file system
async function loadStickers() {
    try {
        const result = await window.electronAPI.loadStickers();
        if (result.success) {
            stickers = result.data;
            renderStickers();
        } else {
            console.error('Failed to load stickers:', result.error);
        }
    } catch (error) {
        console.error('Error loading stickers:', error);
    }
}

// Save stickers to Electron file system
async function saveStickers() {
    try {
        const result = await window.electronAPI.saveStickers(stickers);
        if (!result.success) {
            console.error('Failed to save stickers:', result.error);
        }
    } catch (error) {
        console.error('Error saving stickers:', error);
    }
}

// Calculate position for auto alignment
function calculateAutoAlignPosition() {
    const containerRect = stickersContainer.getBoundingClientRect();
    const stickerWidth = 200;
    const stickerHeight = 80; // Header (40px) + single line of text (40px)
    
    if (stickers.length === 0) {
        // First sticker - center top
        return {
            x: Math.round((containerRect.width / 2 - stickerWidth / 2) / GRID_SIZE) * GRID_SIZE,
            y: GRID_SIZE
        };
    }
    
    // Find the lowest sticker
    let lowestY = 0;
    stickers.forEach(sticker => {
        const bottom = sticker.position.y + stickerHeight;
        if (bottom > lowestY) {
            lowestY = bottom;
        }
    });
    
    // Position the new sticker below the lowest one with some padding
    const x = Math.round((containerRect.width / 2 - stickerWidth / 2) / GRID_SIZE) * GRID_SIZE;
    const y = Math.round((lowestY + GRID_SIZE) / GRID_SIZE) * GRID_SIZE;
    
    // Ensure we're not placing stickers off-screen
    return {
        x: Math.min(x, containerRect.width - stickerWidth),
        y: Math.min(y, containerRect.height - stickerHeight)
    };
}

// Create a new sticker
function createSticker(x = null, y = null, content = '') {
    // Use provided position or calculate auto-aligned position
    let position;
    if (x !== null && y !== null) {
        position = { x, y };
    } else {
        position = calculateAutoAlignPosition();
    }
    
    const sticker = {
        id: Date.now().toString(),
        content,
        position
    };
    
    stickers.push(sticker);
    renderSticker(sticker);
    saveStickers();
    return sticker;
}

// Render all stickers
function renderStickers() {
    stickersContainer.innerHTML = '';
    stickers.forEach(renderSticker);
}

// Render a single sticker
function renderSticker(sticker) {
    const stickerElement = document.createElement('div');
    stickerElement.className = 'sticker';
    stickerElement.dataset.id = sticker.id;
    stickerElement.style.left = `${sticker.position.x}px`;
    stickerElement.style.top = `${sticker.position.y}px`;
    
    // If content is empty, set a smaller initial size
    if (!sticker.content || sticker.content.trim() === '') {
        stickerElement.style.height = '80px'; // Header + single line height
    }
    
    stickerElement.innerHTML = `
        <div class="sticker-header">
            <div class="sticker-drag-handle"></div>
            <button class="sticker-close">×</button>
        </div>
        <div class="sticker-content" contenteditable="true">${sticker.content}</div>
    `;
    
    // Add event listeners for the sticker
    setupStickerEvents(stickerElement);
    
    stickersContainer.appendChild(stickerElement);
}

// Set up event listeners for a sticker
function setupStickerEvents(stickerElement) {
    const header = stickerElement.querySelector('.sticker-header');
    const closeBtn = stickerElement.querySelector('.sticker-close');
    const content = stickerElement.querySelector('.sticker-content');
    const stickerId = stickerElement.dataset.id;
    
    // Make sticker draggable
    header.addEventListener('mousedown', (e) => {
        const rect = stickerElement.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;
        activeSticker = stickerElement;
        
        stickerElement.classList.add('active');
        
        // Move to front
        stickersContainer.appendChild(stickerElement);
        
        // Prevent text selection during drag
        e.preventDefault();
    });
    
    // Close button click
    closeBtn.addEventListener('click', () => {
        stickers = stickers.filter(s => s.id !== stickerId);
        stickerElement.remove();
        saveStickers();
    });
    
    // Content change
    content.addEventListener('input', () => {
        // Automatically grow height when content added
        if (content.innerHTML && content.innerHTML.trim() !== '') {
            // Allow sticker to grow based on content
            stickerElement.style.height = '';
            
            // Apply a minimum height if needed
            const minHeight = Math.max(100, content.scrollHeight + 40); // 40px for header
            stickerElement.style.minHeight = `${minHeight}px`;
        }
    });
    
    // Save changes when focus lost
    content.addEventListener('blur', () => {
        const stickerIndex = stickers.findIndex(s => s.id === stickerId);
        if (stickerIndex !== -1) {
            stickers[stickerIndex].content = content.innerHTML;
            
            // Update sticker size in the state
            const rect = stickerElement.getBoundingClientRect();
            stickers[stickerIndex].size = {
                width: rect.width,
                height: rect.height
            };
            
            saveStickers();
        }
    });
    
    // Activate on click
    stickerElement.addEventListener('mousedown', () => {
        document.querySelectorAll('.sticker').forEach(s => s.classList.remove('active'));
        stickerElement.classList.add('active');
    });
}

// Mouse move handler for dragging
function handleMouseMove(e) {
    if (!activeSticker) return;
    
    let newX = e.clientX - dragOffsetX;
    let newY = e.clientY - dragOffsetY;
    
    // Snap to grid
    newX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
    newY = Math.round(newY / GRID_SIZE) * GRID_SIZE;
    
    // Constrain to container boundaries
    const containerRect = stickersContainer.getBoundingClientRect();
    const stickerRect = activeSticker.getBoundingClientRect();
    
    newX = Math.max(0, Math.min(containerRect.width - stickerRect.width, newX));
    newY = Math.max(0, Math.min(containerRect.height - stickerRect.height, newY));
    
    activeSticker.style.left = `${newX}px`;
    activeSticker.style.top = `${newY}px`;
    
    // Update sticker position in state
    const stickerId = activeSticker.dataset.id;
    const stickerIndex = stickers.findIndex(s => s.id === stickerId);
    if (stickerIndex !== -1) {
        stickers[stickerIndex].position.x = newX;
        stickers[stickerIndex].position.y = newY;
    }
}

// Mouse up handler for ending drag
function handleMouseUp() {
    if (activeSticker) {
        saveStickers();
        activeSticker = null;
    }
}

// Add event listeners
function setupEventListeners() {
    // Create new sticker button
    addStickerBtn.addEventListener('click', () => {
        // Create a new sticker with auto alignment
        createSticker();
    });
    
    // Global mouse events for dragging
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
}

// Initialize app
function init() {
    loadStickers();
    setupEventListeners();
    
    // Create a starter sticker if no stickers exist
    setTimeout(() => {
        if (stickers.length === 0) {
            createSticker(null, null, 'Welcome to FloatingStickers! Click to edit this text.');
        }
    }, 100); // Small delay to ensure stickers are loaded first
}

// Start the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init); 