
// LLM Chat Node Executor
async function executeLlmChatNode(engine, node, inputData, executed) {
    const endpoint = node.config.endpoint.value;
    const model = node.config.model.value;
    const temperature = parseFloat(node.config.temperature.value);
    const maxTokens = parseInt(node.config.max_tokens.value);
    const systemPrompt = node.config.system_prompt.value;
    const includeContext = node.config.include_context.value === 'true';

    // Accept prompt from either 'prompt' or 'text' input
    let prompt = inputData.prompt;
    if (!prompt && inputData.text) {
        prompt = inputData.text;
    }
    if (!prompt && inputData.context) {
        // If context is a string, use it as prompt
        if (typeof inputData.context === 'string') {
            prompt = inputData.context;
        } else if (inputData.context && typeof inputData.context === 'object' && inputData.context.text) {
            // If context is an object with text field, use that
            prompt = inputData.context.text;
        }
    }
    if (!prompt) {
        throw new Error('LLM Chat requires a prompt input. Connect a Text node to provide the prompt.');
    }

    try {
        const messages = [];

        if (systemPrompt) {
            messages.push({ role: 'system', content: systemPrompt });
        }

        if (includeContext && inputData.context) {
            messages.push({ role: 'user', content: `Context: ${JSON.stringify(inputData.context)}\n\nPrompt: ${prompt}` });
        } else {
            messages.push({ role: 'user', content: prompt });
        }

        const response = await fetch(`${endpoint}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                temperature: temperature,
                max_tokens: maxTokens
            })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message || 'LLM API error');
        }

        const responseText = data.choices[0]?.message?.content || '';

        // Store for display in config panel
        node.lastResponse = responseText;
        node.lastUsage = data.usage;
        node.lastModel = model;

        return {
            response: responseText,
            tokens_used: data.usage?.total_tokens || 0,
            model_used: model,
            full_response: data
        };
    } catch (error) {
        console.error('LLM Chat error:', error);
        return { response: null, error: error.message };
    }
}


// Terminal Node Executor
async function executeTerminalNode(engine, node, inputData, executed) {
    const command = node.config.command.value;
    const useInputCommand = node.config.use_input_command.value === 'true';
    const workingDirectory = node.config.working_directory.value;
    const timeout = parseInt(node.config.timeout.value);

    let finalCommand = command;
    if (useInputCommand && inputData.command) {
        finalCommand = inputData.command;
    }

    try {
        // This would need to be implemented with actual terminal execution
        // For now, we'll return a placeholder
        console.log('Terminal command would execute:', finalCommand);

        return {
            output: `Command executed: ${finalCommand}`,
            success: true,
            error: null,
            exit_code: 0
        };
    } catch (error) {
        console.error('Terminal execution error:', error);
        return {
            output: null,
            success: false,
            error: error.message,
            exit_code: 1
        };
    }
}

// Export to global scope
window.aiExecutors = {
    executeLlmChatNode,
    executeTerminalNode
};