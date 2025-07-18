// TTS functionality
console.log('TTS script loading...');

// Global variables for DOM elements
let ttsText, ttsVoice, previewBtn, clearBtn, statusDiv, errorDiv, audioDiv, audioPlayer, errorMessage;

// Test library loading
async function testLibraryLoading() {
    console.log('=== Testing SypnexAPI Library Loading ===');
    
    try {
        // Test loading a simple library
        console.log('Loading Lodash...');
        const lodash = await sypnexAPI.loadLibrary('https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js', {
            localName: '_'
        });
        console.log('✅ Lodash loaded:', typeof lodash);
        console.log('Lodash version:', lodash.VERSION);
        
        // Test loading another library
        console.log('Loading Moment.js...');
        const moment = await sypnexAPI.loadLibrary('https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.4/moment.min.js', {
            localName: 'moment'
        });
        console.log('✅ Moment.js loaded:', typeof moment);
        console.log('Moment version:', moment.version);
        
        console.log('=== Library loading test completed! ===');
        
    } catch (error) {
        console.error('❌ Library loading test failed:', error);
    }
}

// Initialize function - called when DOM is ready
function initTTS() {
    console.log('Initializing TTS...');

    ttsText = document.getElementById('tts-text');
    ttsVoice = document.getElementById('tts-voice');
    previewBtn = document.getElementById('tts-preview');
    clearBtn = document.getElementById('tts-clear');
    statusDiv = document.getElementById('tts-status');
    errorDiv = document.getElementById('tts-error');
    audioDiv = document.getElementById('tts-audio');
    audioPlayer = document.getElementById('audio-player');
    errorMessage = document.getElementById('error-message');

    console.log('TTS elements found:', {
        ttsText: !!ttsText,
        ttsVoice: !!ttsVoice,
        previewBtn: !!previewBtn,
        clearBtn: !!clearBtn
    });

    // Set onclick handlers
    if (previewBtn) {
        previewBtn.onclick = previewTTS;
        console.log('Preview button onclick set');
    }

    if (clearBtn) {
        clearBtn.onclick = clearTTS;
        console.log('Clear button onclick set');
    }

    // Set up audio ended event
    if (audioPlayer) {
        audioPlayer.addEventListener('ended', function () {
            if (audioPlayer.src) {
                URL.revokeObjectURL(audioPlayer.src);
            }
        });
    }

    console.log('TTS initialization complete');
    
    // Test library loading
    testLibraryLoading();
}

// Preview TTS function
async function previewTTS() {
    await sypnexAPI.logInfo("User clicked button wooohoo");
    console.log('Preview TTS clicked');

    const text = ttsText.value.trim();
    const voice = ttsVoice.value;

    if (!text) {
        showError('Please enter some text to convert to speech.');
        return;
    }

    console.log('Sending TTS request:', { text, voice });

    // Show loading status
    showStatus('Generating speech...');
    hideError();
    hideAudio();

    try {
        const response = await fetch('{{API_ENDPOINT}}', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: text,
                voice: voice
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        console.log('TTS response received');

        // Get the audio blob
        const audioBlob = await response.blob();

        // Create audio URL and play
        const audioUrl = URL.createObjectURL(audioBlob);
        audioPlayer.src = audioUrl;

        // Show success and play audio
        showAudio();
        audioPlayer.play();

    } catch (error) {
        console.error('TTS Error:', error);
        showError(`Failed to generate speech: ${error.message}`);
    }
}

// Clear TTS function
function clearTTS() {
    console.log('Clear TTS clicked');

    ttsText.value = '';
    hideStatus();
    hideError();
    hideAudio();
    if (audioPlayer.src) {
        URL.revokeObjectURL(audioPlayer.src);
        audioPlayer.src = '';
    }
}

// Helper functions
function showStatus(message) {
    statusDiv.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${message}`;
    statusDiv.style.display = 'block';
}

function hideStatus() {
    statusDiv.style.display = 'none';
}

function showError(message) {
    errorMessage.textContent = message;
    errorDiv.style.display = 'block';
}

function hideError() {
    errorDiv.style.display = 'none';
}

function showAudio() {
    hideStatus();
    audioDiv.style.display = 'block';
}

function hideAudio() {
    audioDiv.style.display = 'none';
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTTS);
} else {
    // DOM is already loaded
    initTTS();
}


// Socket.IO test function
async function testSocketIO() {
    try {
        console.log('Testing Socket.IO connection...');
        
        // Connect to Socket.IO server
        const connected = await sypnexAPI.connectSocket();
        
        if (connected) {
            console.log('Socket.IO connected successfully!');
            
            // Listen for messages
            sypnexAPI.on('message', (data) => {
                console.log('Received message:', data);
                // Update UI with received message
            });

            // Listen for broadcasts
            sypnexAPI.on('broadcast', (data) => {
                console.log('Broadcast received:', data.message);
            });

            // Join a room
            sypnexAPI.joinRoom('tts_room');

            // Send a message
            sypnexAPI.sendMessage('message', 'Hello from TTS app!');
            
            // Send a message to specific room
            sypnexAPI.sendMessage('chat', 'TTS app joined the room!', 'tts_room');

            // Check connection status
            if (sypnexAPI.isSocketConnected()) {
                console.log('Socket.IO is connected!');
            }
            
        } else {
            console.error('Failed to connect to Socket.IO server');
        }
        
    } catch (error) {
        console.error('Socket.IO test error:', error);
    }
}

// Also try initialization after a delay for OS environment
setTimeout(initTTS, 1000);

console.log('TTS script loaded');
testSocketIO();