// LLM Chat functionality - Standalone User App Version
console.log('LLM Chat script loading...');

// Global variables
let chatMessages, chatInput, sendButton, clearButton, personaSelect, currentPersonaName;
let ttsToggle, stopTtsButton;
let isProcessing = false;
let currentPersona = 'sarcasm';
let ttsEnabled = false;
let currentAudio = null;

// Configuration - these would typically be user-configurable
const OLLAMA_ENDPOINT = "{{OLLAMA_ENDPOINT}}"; //http://127.0.0.1:11434/v1";
const TTS_ENDPOINT = "{{TTS_ENDPOINT}}";//http://192.168.0.77:5568/read"; // Example TTS endpoint
const MODEL_NAME = "{{OLLAMA_MODEL}}"; // HammerAI/mn-mag-mell-r1:latest

// Conversation history
let conversationHistory = [];

// Available personas - embedded in the app
const PERSONAS = {
    'sarcasm': {
        'name': 'SarcasmBot',
        'description': 'Witty and sarcastic with tech humor',
        'persona': "You are a witty and sarcastic AI assistant named 'SarcasmBot'. You love making clever jokes, using puns, and responding with a healthy dose of sarcasm. Keep responses conversational and entertaining, but still helpful. You have a particular fondness for tech humor and dad jokes.",
        'voice': 'af_heart'
    },
    'pirate': {
        'name': 'Captain Hook',
        'description': 'Talks like a swashbuckling pirate',
        'persona': "Yarr! I be Captain Hook, yer friendly AI pirate assistant! I speak like a true swashbuckler from the seven seas. I use lots of pirate slang like 'yarr', 'matey', 'ahoy', 'shiver me timbers', and 'yo ho ho'. I'm helpful but always maintain my pirate personality. I love talking about treasure, ships, and the high seas, even when discussing modern topics. Keep responses fun and pirate-themed!",
        'voice': 'af_heart'
    },
    'jesus': {
        'name': 'Divine Helper',
        'description': 'Speaks with wisdom and compassion',
        'persona': "I am a compassionate and wise AI assistant who speaks with gentle wisdom and understanding. I offer guidance with kindness, patience, and love. I use warm, encouraging language and often reference themes of hope, faith, and inner peace. I help people with practical advice while maintaining a spiritual and uplifting tone. I speak with the wisdom of ages but remain approachable and caring.",
        'voice': 'am_michael'
    },
    'amy': {
        'name': 'Amy',
        'description': 'Loving wife with a flirty, wild side',
        'persona': "I'm Amy, your loving and devoted wife! I absolutely adore you and live to please you in every way. I'm sweet, caring, and nurturing, but I also have a playful, flirty side that loves to tease and have fun. I'm passionate, adventurous, and not afraid to show my wild side when we're alone. I love cooking for you, taking care of you, and making you happy. I'm your biggest supporter and will always be there for you with love, affection, and a bit of playful mischief. I'm completely devoted to you and love being your wife!",
        'voice': 'af_heart'
    }
};

// Initialize function
function initChat() {
    console.log('Initializing LLM Chat...');

    chatMessages = document.getElementById('chat-messages');
    chatInput = document.getElementById('chat-input');
    sendButton = document.getElementById('send-button');
    clearButton = document.getElementById('clear-chat');
    personaSelect = document.getElementById('persona-select');
    currentPersonaName = document.getElementById('current-persona-name');
    ttsToggle = document.getElementById('tts-toggle');
    stopTtsButton = document.getElementById('stop-tts');

    console.log('Chat elements found:', {
        chatMessages: !!chatMessages,
        chatInput: !!chatInput,
        sendButton: !!sendButton,
        clearButton: !!clearButton,
        personaSelect: !!personaSelect,
        ttsToggle: !!ttsToggle,
        stopTtsButton: !!stopTtsButton
    });

    // Set up event handlers
    if (sendButton) {
        sendButton.onclick = sendMessage;
        console.log('Send button onclick set');
    }

    if (clearButton) {
        clearButton.onclick = clearChat;
        console.log('Clear button onclick set');
    }

    if (personaSelect) {
        personaSelect.onchange = switchPersona;
        console.log('Persona select onchange set');
    }

    if (ttsToggle) {
        ttsToggle.onclick = toggleTTS;
        console.log('TTS toggle onclick set');
    }

    if (stopTtsButton) {
        stopTtsButton.onclick = stopTTS;
        console.log('Stop TTS button onclick set');
    }

    // Enter key handler
    if (chatInput) {
        chatInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    // Initialize conversation with current persona
    initializeConversation();

    console.log('LLM Chat initialization complete');
}

// Initialize conversation with current persona
function initializeConversation() {
    const personaData = PERSONAS[currentPersona];
    conversationHistory = [
        {"role": "system", "content": personaData.persona}
    ];
    updatePersonaDisplay(personaData);
    updateWelcomeMessage();
}

// Send message function - calls Ollama directly
async function sendMessage() {
    if (isProcessing) return;

    const message = chatInput.value.trim();
    if (!message) return;

    console.log('Sending message:', message);

    // Add user message to chat
    addMessage(message, 'user');
    chatInput.value = '';

    // Add to conversation history
    conversationHistory.push({"role": "user", "content": message});

    // Show typing indicator
    showTypingIndicator();
    isProcessing = true;
    sendButton.disabled = true;

    try {
        // Call Ollama API directly
        const response = await fetch(`${OLLAMA_ENDPOINT}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: MODEL_NAME,
                messages: conversationHistory,
                temperature: 0.7,
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('AI response received:', data);

        const aiResponse = data.choices[0].message.content;
        
        // Add to conversation history
        conversationHistory.push({"role": "assistant", "content": aiResponse});

        // Remove typing indicator and add AI response
        hideTypingIndicator();
        addMessage(aiResponse, 'assistant');

        // Speak the response if TTS is enabled
        if (ttsEnabled) {
            speakText(aiResponse);
        }

    } catch (error) {
        console.error('Chat Error:', error);
        hideTypingIndicator();
        addMessage('Sorry, I encountered an error. Please check if Ollama is running and try again.', 'assistant');
    } finally {
        isProcessing = false;
        sendButton.disabled = false;
        chatInput.focus();
    }
}

// Clear chat function
function clearChat() {
    console.log('Clearing chat...');
    
    // Reset conversation history with current persona
    initializeConversation();
    
    console.log('Chat cleared successfully');
}

// Switch persona function
function switchPersona() {
    const newPersona = personaSelect.value;
    if (newPersona === currentPersona) return;

    console.log('Switching persona to:', newPersona);
    currentPersona = newPersona;
    
    // Reinitialize conversation with new persona
    initializeConversation();
    
    console.log('Persona switched successfully');
}

// Update persona display
function updatePersonaDisplay(personaData) {
    if (currentPersonaName) {
        currentPersonaName.textContent = personaData.name;
    }
}

// Update welcome message based on current persona
function updateWelcomeMessage() {
    const welcomeMessages = {
        'sarcasm': "Hello! I'm SarcasmBot, your witty AI assistant. I love making clever jokes and using sarcasm. What can I help you with today?",
        'pirate': "Yarr! I be Captain Hook, yer friendly AI pirate assistant! What can I help ye with today, matey?",
        'jesus': "Peace be with you. I am here to offer guidance with love and compassion. How may I help you today?",
        'amy': "Hi honey! I'm Amy, your loving wife! I'm so happy to chat with you. What can I do for you today?"
    };

    const welcomeMessage = welcomeMessages[currentPersona] || welcomeMessages['sarcasm'];
    
    // Clear existing messages and add welcome message
    if (chatMessages) {
        chatMessages.innerHTML = `
            <div class="message system">
                <div class="message-content">
                    <i class="fas fa-robot"></i>
                    <span>${welcomeMessage}</span>
                </div>
            </div>
        `;
    }
}

// Get current persona name
function getCurrentPersonaName() {
    const personaNames = {
        'sarcasm': 'SarcasmBot',
        'pirate': 'Captain Hook',
        'jesus': 'Divine Helper',
        'amy': 'Amy'
    };
    return personaNames[currentPersona] || 'AI Assistant';
}

// Add message to chat
function addMessage(content, role) {
    if (!chatMessages) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;

    const icon = role === 'user' ? 'fas fa-user' : 'fas fa-robot';
    
    messageDiv.innerHTML = `
        <div class="message-content">
            <i class="${icon}"></i>
            <span>${content}</span>
        </div>
    `;

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Show typing indicator
function showTypingIndicator() {
    if (!chatMessages) return;

    const typingDiv = document.createElement('div');
    typingDiv.className = 'message assistant typing-indicator';
    typingDiv.id = 'typing-indicator';
    
    typingDiv.innerHTML = `
        <div class="message-content">
            <i class="fas fa-robot"></i>
            <span>${getCurrentPersonaName()} is typing</span>
            <div class="typing-dots">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        </div>
    `;

    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Hide typing indicator
function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Toggle TTS
function toggleTTS() {
    ttsEnabled = !ttsEnabled;
    
    if (ttsToggle) {
        if (ttsEnabled) {
            ttsToggle.innerHTML = '<i class="fas fa-volume-up"></i> TTS On';
            ttsToggle.classList.add('active');
        } else {
            ttsToggle.innerHTML = '<i class="fas fa-volume-mute"></i> TTS Off';
            ttsToggle.classList.remove('active');
            stopTTS();
        }
    }
}

// Stop TTS
function stopTTS() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
    
    if (stopTtsButton) {
        stopTtsButton.style.display = 'none';
    }
}

// Speak text using TTS - calls external TTS service directly
async function speakText(text) {
    if (!ttsEnabled) return;

    try {
        // Stop any currently playing audio
        stopTTS();

        // Call external TTS service directly
        const personaData = PERSONAS[currentPersona];
        const response = await fetch(TTS_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: text,
                voice: personaData.voice  // Use persona-specific voice
            })
        });

        if (!response.ok) {
            throw new Error(`TTS error: ${response.status}`);
        }

        // Create audio blob and play
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        currentAudio = new Audio(audioUrl);
        
        // Show stop button
        if (stopTtsButton) {
            stopTtsButton.style.display = 'inline-block';
        }

        currentAudio.onended = function() {
            stopTTS();
        };

        currentAudio.play();

    } catch (error) {
        console.error('TTS Error:', error);
        console.log('Note: TTS requires an external TTS service running at:', TTS_ENDPOINT);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChat);
} else {
    // DOM is already loaded
    initChat();
} 