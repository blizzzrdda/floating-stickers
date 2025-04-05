// DOM Elements
const stickersContainer = document.getElementById('stickers-container');
const addStickerBtn = document.getElementById('add-sticker-btn');

// State
let stickers = [];
let activeSticker = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
const GRID_SIZE = 20; // For snapping to grid

// Check if we're running in Electron
const isElectron = window.electronAPI !== undefined;

// Load stickers (from Electron file system or localStorage)
async function loadStickers() {
    if (isElectron) {
        try {
            const result = await window.electronAPI.loadStickers();
            if (result.success) {
                stickers = result.data;
                renderStickers();
            } else {
                console.error('Failed to load stickers:', result.error);
                // Try loading from localStorage as fallback
                loadFromLocalStorage();
            }
        } catch (error) {
            console.error('Error loading stickers:', error);
            // Try loading from localStorage as fallback
            loadFromLocalStorage();
        }
    } else {
        // Use localStorage in web browser context
        loadFromLocalStorage();
    }
}

// Load from localStorage (web or fallback for Electron)
function loadFromLocalStorage() {
    const savedStickers = localStorage.getItem('stickers');
    if (savedStickers) {
        stickers = JSON.parse(savedStickers);
        renderStickers();
    }
}

// Save stickers (to Electron file system or localStorage)
async function saveStickers() {
    if (isElectron) {
        try {
            const result = await window.electronAPI.saveStickers(stickers);
            if (!result.success) {
                console.error('Failed to save stickers:', result.error);
                // Save to localStorage as fallback
                saveToLocalStorage();
            }
        } catch (error) {
            console.error('Error saving stickers:', error);
            // Save to localStorage as fallback
            saveToLocalStorage();
        }
    } else {
        // Use localStorage in web browser context
        saveToLocalStorage();
    }
}

// Save to localStorage (web or fallback for Electron)
function saveToLocalStorage() {
    localStorage.setItem('stickers', JSON.stringify(stickers));
}

// Create a new sticker
function createSticker(x = 100, y = 100, content = '') {
    const sticker = {
        id: Date.now().toString(),
        content,
        position: { x, y }
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
    content.addEventListener('blur', () => {
        const stickerIndex = stickers.findIndex(s => s.id === stickerId);
        if (stickerIndex !== -1) {
            stickers[stickerIndex].content = content.innerHTML;
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
        // Create at random position within container bounds
        const containerRect = stickersContainer.getBoundingClientRect();
        const x = Math.round((Math.random() * (containerRect.width - 200)) / GRID_SIZE) * GRID_SIZE;
        const y = Math.round((Math.random() * (containerRect.height - 200)) / GRID_SIZE) * GRID_SIZE;
        
        createSticker(x, y);
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
            createSticker(100, 100, 'Welcome to FloatingStickers! Click to edit this text.');
        }
    }, 100); // Small delay to ensure stickers are loaded first
}

// Start the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init); 