// Gemma 3N Function Calling Demo (Ollama Version)
console.log('Function Calling script loading...');

// Global variables
let chatMessages, chatInput, sendButton, clearButton;
let isProcessing = false;

// Ollama Configuration - Use correct endpoint
const OLLAMA_ENDPOINT = "http://127.0.0.1:11434/v1"; // Correct Ollama API endpoint
// IMPORTANT: Ensure you have this model pulled in Ollama (e.g., ollama pull gemma:latest or ollama pull google/gemma-3n-e4)
const MODEL_NAME = "gemma3n:latest"; 

// System prompt for function calling - no conversation history
let systemPrompt = "";

// Define available tools/functions
// In a real application, these would interact with actual APIs or backend services.
const TOOLS = [
    {
        "name": "get_current_weather",
        "description": "Gets the current weather for a specific location.",
        "parameters": {
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": "The city and state, e.g., San Francisco, CA"
                },
                "unit": {
                    "type": "string",
                    "enum": ["celsius", "fahrenheit"],
                    "description": "The unit of temperature. Defaults to 'fahrenheit'."
                }
            },
            "required": ["location"]
        }
    },
    {
        "name": "get_stock_price",
        "description": "Gets the current stock price for a given ticker symbol.",
        "parameters": {
            "type": "object",
            "properties": {
                "ticker_symbol": {
                    "type": "string",
                    "description": "The stock ticker symbol, e.g., GOOG, AAPL"
                }
            },
            "required": ["ticker_symbol"]
        }
    }
];

// Simulate tool execution
async function executeTool(toolCall) {
    const functionName = toolCall.name;
    const args = toolCall.parameters;

    console.log(`Executing tool: ${functionName} with args:`, args);

    // Simulate API calls based on function name
    if (functionName === "get_current_weather") {
        const { location, unit = "fahrenheit" } = args;
        // Simulate a delay for API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (location.toLowerCase().includes("london")) {
            return { location: location, temperature: "15", unit: "celsius", conditions: "cloudy" };
        } else if (location.toLowerCase().includes("new york")) {
            return { location: location, temperature: "70", unit: "fahrenheit", conditions: "sunny" };
        } else {
            return { location: location, temperature: "unavailable", unit: unit, conditions: "unknown" };
        }
    } else if (functionName === "get_stock_price") {
        const { ticker_symbol } = args;
        // Simulate a delay for API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        const prices = {
            "GOOG": "175.50",
            "AAPL": "215.20",
            "MSFT": "450.10"
        };
        const price = prices[ticker_symbol.toUpperCase()] || "unavailable";
        return { ticker_symbol: ticker_symbol, price: price, currency: "USD" };
    } else {
        return { error: `Unknown tool: ${functionName}` };
    }
}

// Initialize function
function initChat() {
    console.log('Initializing Function Calling Chat...');

    chatMessages = document.getElementById('chat-messages');
    chatInput = document.getElementById('chat-input');
    sendButton = document.getElementById('send-button');
    clearButton = document.getElementById('clear-chat');

    console.log('Chat elements found:', {
        chatMessages: !!chatMessages,
        chatInput: !!chatInput,
        sendButton: !!sendButton,
        clearButton: !!clearButton
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

    // Enter key handler
    if (chatInput) {
        chatInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    // Initialize conversation with system message
    initializeConversation();

    console.log('Function Calling Chat initialization complete');
}

// Initialize conversation with system message and tool definitions for Ollama
function initializeConversation() {
    // Convert TOOLS array to a string format that Ollama can understand as function definitions
    // This instructs the model on how to call the functions and what format to use for its response.
    const toolDefinitionsString = TOOLS.map(tool => {
        return `Function Name: ${tool.name}\nDescription: ${tool.description}\nParameters: ${JSON.stringify(tool.parameters)}`;
    }).join('\n\n');

    systemPrompt = `You are a helpful AI assistant that can use tools.
    Here are the tools you can use:

    ${toolDefinitionsString}

    When you need to use a tool, respond ONLY with a JSON object in the format:
    { "name": "function_name", "parameters": { "param1": "value1", "param2": "value2" } }
    Do NOT include any other text or backticks when making a tool call.
    If you don't need to use a tool, respond in natural language.`;

    updateWelcomeMessage();
}

// Send message function - calls Ollama API
async function sendMessage() {
    if (isProcessing) return;

    const message = chatInput.value.trim();
    if (!message) return;

    console.log('Sending message:', message);

    // Add user message to chat
    addMessage(message, 'user');
    chatInput.value = '';

    // Show typing indicator
    showTypingIndicator();
    isProcessing = true;
    sendButton.disabled = true;

    try {
        // For function calling, we only send the current message with system prompt - NO HISTORY
        const payload = {
            model: MODEL_NAME,
            messages: [
                {"role": "system", "content": systemPrompt},
                {"role": "user", "content": message}
            ],
            stream: false
        };

        // Fixed API endpoint to match working llm_chat
        const response = await fetch(`${OLLAMA_ENDPOINT}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ollama API error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        console.log('AI response received:', data);

        const aiResponseContent = data.choices[0].message.content;
        console.log('Raw AI response content:', aiResponseContent);

        let isToolCall = false;
        let parsedToolCall = null;
        
        // Try to parse as JSON and check if it's a tool call
        try {
            // Clean the response - remove markdown code blocks if present
            let cleanContent = aiResponseContent.trim();
            if (cleanContent.startsWith('```json')) {
                cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (cleanContent.startsWith('```')) {
                cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }
            
            console.log('Cleaned content for parsing:', cleanContent);
            parsedToolCall = JSON.parse(cleanContent);
            console.log('Parsed JSON:', parsedToolCall);
            
            // Check if it looks like a tool call based on expected JSON structure
            if (parsedToolCall && 
                typeof parsedToolCall.name === 'string' && 
                typeof parsedToolCall.parameters === 'object') {
                isToolCall = true;
                console.log('Detected tool call:', parsedToolCall.name);
            }
        } catch (e) {
            console.log('Not a valid JSON string, treating as regular response. Error:', e.message);
            // Not a valid JSON string, so not a tool call
        }

        if (isToolCall) {
            console.log('Processing tool call:', parsedToolCall);

            // Execute the tool call
            const toolOutput = await executeTool(parsedToolCall);
            console.log('Tool execution completed, output:', toolOutput);

            // Format the tool result for display - no second LLM call needed
            let formattedResponse = "";
            if (parsedToolCall.name === "get_current_weather") {
                const { location, temperature, unit, conditions } = toolOutput;
                formattedResponse = `The current weather in ${location} is ${temperature}°${unit === "celsius" ? "C" : "F"} and ${conditions}.`;
            } else if (parsedToolCall.name === "get_stock_price") {
                const { ticker_symbol, price, currency } = toolOutput;
                formattedResponse = `${ticker_symbol} stock is currently trading at $${price} ${currency}.`;
            } else {
                formattedResponse = `Function ${parsedToolCall.name} returned: ${JSON.stringify(toolOutput)}`;
            }

            // Display the formatted result
            hideTypingIndicator();
            addMessage(formattedResponse, 'assistant');

        } else {
            // No tool call, just a regular text response
            console.log('No tool call detected, treating as regular response');
            hideTypingIndicator();
            addMessage(aiResponseContent, 'assistant');
        }

    } catch (error) {
        console.error('Chat Error:', error);
        hideTypingIndicator();
        addMessage(`Sorry, I encountered an error: ${error.message}. Please check the console for details. Make sure Ollama is running and the model '${MODEL_NAME}' is available.`, 'assistant');
    } finally {
        isProcessing = false;
        sendButton.disabled = false;
        chatInput.focus();
    }
}

// Clear chat function
function clearChat() {
    console.log('Clearing chat...');
    
    // Reset conversation with system message
    initializeConversation();
    
    console.log('Chat cleared successfully');
}

// Update welcome message
function updateWelcomeMessage() {
    if (chatMessages) {
        chatMessages.innerHTML = `
            <div class="message system">
                <div class="message-content">
                    <i class="fas fa-robot"></i>
                    <span>Hello! I'm Gemma 3N, an AI assistant capable of using tools via Ollama. Try asking me:
                        <ul>
                            <li>"What's the weather in London?"</li>
                            <li>"What is the stock price of GOOG?"</li>
                            <li>"How much is Apple stock?"</li>
                        </ul>
                    </span>
                </div>
            </div>
        `;
    }
}

// Add message to chat
function addMessage(content, role) {
    if (!chatMessages) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;

    const icon = role === 'user' ? 'fas fa-user' : 
                 role === 'assistant' ? 'fas fa-robot' :
                 role === 'tool-call' ? 'fas fa-cogs' : // Icon for tool call
                 role === 'tool-output' ? 'fas fa-check-circle' : 'fas fa-info-circle'; // Icon for tool output

    // Pre-format JSON for better display in tool messages
    let formattedContent = content;
    if (role === 'tool-call' || role === 'tool-output') {
        try {
            formattedContent = `<pre>${JSON.stringify(JSON.parse(content), null, 2)}</pre>`;
        } catch (e) {
            // Not valid JSON, display as is
        }
    }
    
    messageDiv.innerHTML = `
        <div class="message-content">
            <i class="${icon}"></i>
            <span>${formattedContent}</span>
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
            <span>Gemma 3N is thinking</span>
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

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChat);
} else {
    // DOM is already loaded
    initChat();
}
