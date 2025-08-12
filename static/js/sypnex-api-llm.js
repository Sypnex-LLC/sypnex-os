// SypnexAPI LLM - Universal LLM interface for user applications
// Extends SypnexAPI with LLM provider translation capabilities

Object.assign(SypnexAPI.prototype, {
    
    /**
     * Complete a chat conversation using any supported LLM provider
     * Translates OpenAI format to provider-specific format and normalizes response
     * @async
     * @param {object} options - Configuration options
     * @param {string} options.provider - Provider: 'openai', 'anthropic', 'google', 'ollama'
     * @param {string} options.endpoint - API endpoint URL
     * @param {string} [options.apiKey] - API key (not needed for Ollama)
     * @param {string} options.model - Model name
     * @param {Array} options.messages - Messages array in OpenAI format
     * @param {number} [options.temperature=0.7] - Temperature (0-1)
     * @param {number} [options.maxTokens=1000] - Maximum tokens to generate
     * @param {boolean} [options.stream=false] - Whether to stream response
     * @returns {Promise<object>} Normalized response: {content, usage, model, provider}
     */
    async llmComplete(options) {
        try {
            const {
                provider,
                endpoint,
                apiKey,
                model,
                messages,
                temperature = 0.7,
                maxTokens = 1000,
                stream = false
            } = options;

            // Validate required parameters
            if (!provider || !endpoint || !model || !messages) {
                throw new Error('Missing required parameters: provider, endpoint, model, messages');
            }

            if (!Array.isArray(messages) || messages.length === 0) {
                throw new Error('Messages must be a non-empty array');
            }

            // Format request based on provider
            const formattedRequest = this._formatLLMRequest(provider, {
                model,
                messages,
                temperature,
                maxTokens,
                stream
            });

            // Prepare headers
            const headers = this._getLLMHeaders(provider, apiKey);

            // Make the request using existing proxyHTTP
            const proxyRequest = {
                url: endpoint,
                method: 'POST',
                headers: headers,
                body: formattedRequest,
                timeout: 60 // Longer timeout for LLM requests
            };

            const response = await this.proxyHTTP(proxyRequest);

            if (!response || response.status < 200 || response.status >= 300) {
                throw new Error(`LLM API request failed: ${response?.status || 'Unknown error'}`);
            }

            // Parse response
            let responseData;
            if (typeof response.content === 'string') {
                responseData = JSON.parse(response.content);
            } else {
                responseData = response.content;
            }

            // Normalize response based on provider
            const normalizedResponse = this._normalizeLLMResponse(provider, responseData);

            return {
                ...normalizedResponse,
                provider: provider
            };

        } catch (error) {
            console.error('SypnexAPI: LLM completion error:', error);
            throw error;
        }
    },

    /**
     * Format request for specific provider (private method)
     * @private
     */
    _formatLLMRequest(provider, options) {
        const { model, messages, temperature, maxTokens, stream } = options;

        switch (provider.toLowerCase()) {
            case 'openai':
                return {
                    model: model,
                    messages: messages,
                    temperature: temperature,
                    max_tokens: maxTokens,
                    stream: stream
                };

            case 'anthropic':
                // Separate system message for Anthropic
                const anthropicMessages = [];
                let systemMessage = null;

                for (const msg of messages) {
                    if (msg.role === 'system') {
                        systemMessage = msg.content;
                    } else {
                        anthropicMessages.push({
                            role: msg.role,
                            content: msg.content
                        });
                    }
                }

                const anthropicRequest = {
                    model: model,
                    messages: anthropicMessages,
                    max_tokens: maxTokens,
                    temperature: temperature,
                    stream: stream
                };

                if (systemMessage) {
                    anthropicRequest.system = systemMessage;
                }

                return anthropicRequest;

            case 'google':
                // Convert to Google's parts format
                const contents = [];
                let systemInstruction = null;

                for (const msg of messages) {
                    if (msg.role === 'system') {
                        systemInstruction = msg.content;
                    } else if (msg.role === 'user') {
                        contents.push({
                            role: 'user',
                            parts: [{ text: msg.content }]
                        });
                    } else if (msg.role === 'assistant') {
                        contents.push({
                            role: 'model',
                            parts: [{ text: msg.content }]
                        });
                    }
                }

                const googleRequest = {
                    contents: contents,
                    generationConfig: {
                        temperature: temperature,
                        maxOutputTokens: maxTokens
                    }
                };

                if (systemInstruction) {
                    googleRequest.systemInstruction = {
                        parts: [{ text: systemInstruction }]
                    };
                }

                return googleRequest;

            case 'ollama':
                return {
                    model: model,
                    messages: messages,
                    stream: stream,
                    options: {
                        temperature: temperature,
                        num_predict: maxTokens
                    }
                };

            default:
                throw new Error(`Unsupported LLM provider: ${provider}`);
        }
    },

    /**
     * Get headers for specific provider (private method)
     * @private
     */
    _getLLMHeaders(provider, apiKey) {
        const headers = {
            'Content-Type': 'application/json'
        };

        switch (provider.toLowerCase()) {
            case 'openai':
                if (apiKey) {
                    headers['Authorization'] = `Bearer ${apiKey}`;
                }
                break;

            case 'anthropic':
                if (apiKey) {
                    headers['X-API-Key'] = apiKey;
                    headers['anthropic-version'] = '2023-06-01';
                }
                break;

            case 'google':
                if (apiKey) {
                    headers['X-goog-api-key'] = apiKey;
                }
                break;

            case 'ollama':
                // Ollama typically doesn't require authentication
                break;
        }

        return headers;
    },

    /**
     * Normalize response from provider to OpenAI format (private method)
     * @private
     */
    _normalizeLLMResponse(provider, responseData) {
        switch (provider.toLowerCase()) {
            case 'openai':
                return {
                    content: responseData.choices?.[0]?.message?.content || '',
                    model: responseData.model || '',
                    usage: responseData.usage || {}
                };

            case 'anthropic':
                const anthropicContent = responseData.content?.[0]?.text || '';
                return {
                    content: anthropicContent,
                    model: responseData.model || '',
                    usage: responseData.usage || {}
                };

            case 'google':
                const googleContent = responseData.candidates?.[0]?.content?.parts?.[0]?.text || '';
                return {
                    content: googleContent,
                    model: 'google-model', // Google doesn't return model in response
                    usage: responseData.usageMetadata || {}
                };

            case 'ollama':
                return {
                    content: responseData.message?.content || '',
                    model: responseData.model || '',
                    usage: {
                        prompt_tokens: responseData.prompt_eval_count || 0,
                        completion_tokens: responseData.eval_count || 0,
                        total_tokens: (responseData.prompt_eval_count || 0) + (responseData.eval_count || 0)
                    }
                };

            default:
                // Generic fallback
                return {
                    content: JSON.stringify(responseData),
                    model: 'unknown',
                    usage: {}
                };
        }
    }

});
