// execution-engine.js - Dynamic execution engine for Flow Editor

class ExecutionEngine {
    constructor(registry) {
        this.registry = registry;
        this.setupExecutors();
    }
    
    setupExecutors() {
        // Register all existing executors
        this.registry.registerExecutor('http_executor', this.executeHttpNode.bind(this));
        this.registry.registerExecutor('timer_executor', this.executeTimerNode.bind(this));
        this.registry.registerExecutor('display_executor', this.executeDisplayNode.bind(this));
        this.registry.registerExecutor('audio_executor', this.executeAudioNode.bind(this));
        this.registry.registerExecutor('json_extract_executor', this.executeJsonExtractNode.bind(this));
        this.registry.registerExecutor('vfs_save_executor', this.executeVfsSaveNode.bind(this));
        this.registry.registerExecutor('vfs_load_executor', this.executeVfsLoadNode.bind(this));
        this.registry.registerExecutor('random_line_executor', this.executeRandomQuoteNode.bind(this));
        this.registry.registerExecutor('repeater_executor', this.executeRepeaterNode.bind(this));
        this.registry.registerExecutor('image_executor', this.executeImageNode.bind(this));
        this.registry.registerExecutor('llm_chat_executor', this.executeLlmChatNode.bind(this));
        this.registry.registerExecutor('text_executor', this.executeTextNode.bind(this));
        this.registry.registerExecutor('terminal_executor', this.executeTerminalNode.bind(this));
        this.registry.registerExecutor('condition_executor', this.executeConditionNode.bind(this));
        this.registry.registerExecutor('logical_gate_executor', this.executeLogicalGateNode.bind(this));
    }
    
    async executeNode(node, inputData, executed) {
        const nodeDef = this.registry.getNodeType(node.type);
        if (!nodeDef) {
            throw new Error(`No node definition found for type: ${node.type}`);
        }
        
        const executorName = nodeDef.executor;
        const executor = this.registry.getExecutor(executorName);
        
        if (!executor) {
            throw new Error(`No executor found for: ${executorName}`);
        }
        
        return await executor(node, inputData, executed);
    }
    
    // HTTP Node Executor
    async executeHttpNode(node, inputData, executed) {
        const url = node.config.url.value;
        const method = node.config.method.value;
        const headers = JSON.parse(node.config.headers.value || '{}');
        const body = node.config.body.value;
        const useTemplate = (node.config.use_template?.value || 'false') === 'true';
        
        let processedBody = body;
        
        // Parse body as JSON if it's a string and looks like JSON
        if (typeof processedBody === 'string' && processedBody.trim().startsWith('{')) {
            try {
                processedBody = JSON.parse(processedBody);
            } catch (e) {
                console.warn('Failed to parse body as JSON, using as string:', e);
            }
        }
        
        if (useTemplate && inputData.template_data) {
            processedBody = window.flowEditorUtils.processTemplates(processedBody, inputData.template_data);
        }
        
        // Use OS proxy to bypass CORS
        const proxyRequest = {
            url: url,
            method: method,
            headers: headers,
            body: processedBody,
            timeout: 30
        };
        
        console.log('HTTP node: Sending proxy request:', proxyRequest);
        console.log('HTTP node: Body type:', typeof processedBody);
        console.log('HTTP node: Body content:', processedBody);
        console.log('HTTP node: JSON stringified body:', JSON.stringify(proxyRequest));
        
        const proxyResponse = await fetch('/api/proxy/http', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(proxyRequest)
        });
        
        if (!proxyResponse.ok) {
            throw new Error(`Proxy request failed: ${proxyResponse.status}`);
        }
        
        const proxyData = await proxyResponse.json();
        
        if (proxyData.error) {
            throw new Error(`HTTP request failed: ${proxyData.error}`);
        }
        
        // Check if response is binary (audio, image, etc.)
        if (proxyData.is_binary) {
            console.log('HTTP node: Processing binary response');
            console.log('HTTP node: Content type:', proxyData.headers['content-type'] || proxyData.headers['Content-Type']);
            console.log('HTTP node: Content length:', proxyData.content.length);
            
            // Convert base64 content to blob for binary data
            const binaryData = atob(proxyData.content);
            const bytes = new Uint8Array(binaryData.length);
            for (let i = 0; i < binaryData.length; i++) {
                bytes[i] = binaryData.charCodeAt(i);
            }
            const contentType = proxyData.headers['content-type'] || proxyData.headers['Content-Type'] || 'application/octet-stream';
            const blob = new Blob([bytes], { type: contentType });
            console.log('HTTP node: Created Blob:', blob);
            console.log('HTTP node: Blob size:', blob.size);
            console.log('HTTP node: Blob type:', blob.type);
            
            // Return blob directly for backward compatibility with image/audio nodes
            // The workflow execution will handle mapping to the correct ports
            return blob;
        }
        
        // For text responses, try to parse as JSON and return structured output
        console.log('HTTP node: Processing text response');
        console.log('HTTP node: Status code:', proxyData.status || 200);
        console.log('HTTP node: Content preview:', proxyData.content.substring(0, 200));
        
        let parsedJson = null;
        try {
            // Try to parse as JSON
            parsedJson = JSON.parse(proxyData.content);
            console.log('HTTP node: Successfully parsed JSON response');
        } catch (e) {
            console.log('HTTP node: Response is not valid JSON, parsed_json will be null');
        }
        
        // Return structured output for text responses matching new node architecture
        return {
            original_data: proxyData.content,
            processed_data: parsedJson || proxyData.content,
            response: proxyData.content,
            status_code: proxyData.status || 200,
            headers: proxyData.headers || {},
            parsed_json: parsedJson,
            // Also provide the raw response as 'data' for compatibility
            data: proxyData.content,
            // Add the missing output ports from node definition
            text: proxyData.content,
            json: parsedJson,
            url: url
        };
    }
    
    // Timer Node Executor
    async executeTimerNode(node, inputData, executed) {
        const interval = node.config.interval.value;
        const count = node.config.count.value;
        
        return new Promise((resolve) => {
            setTimeout(() => {
                const timestamp = Date.now();
                resolve({ 
                    trigger: timestamp,
                    original_data: timestamp,
                    processed_data: timestamp,
                    timestamp: timestamp,
                    elapsed: interval
                });
            }, interval);
        });
    }
    
    // Display Node Executor
    async executeDisplayNode(node, inputData, executed) {
        const format = node.config.format.value;
        const maxLength = node.config.maxLength.value;
        const inputPort = node.config.input_port?.value || 'auto';
        
        // Try to find content based on configured input port or auto-detect
        let content = null;
        
        if (inputPort !== 'auto') {
            // Use the specified input port
            content = inputData[inputPort];
            console.log(`Display node using specified input port '${inputPort}':`, content);
        } else {
            // Auto-detect: Priority order: text, json, data, binary
            if (inputData.text !== undefined) {
                content = inputData.text;
            } else if (inputData.json !== undefined) {
                content = inputData.json;
            } else if (inputData.data !== undefined) {
                content = inputData.data;
            } else if (inputData.binary !== undefined) {
                content = inputData.binary;
            } else {
                // Use the first available input
                const firstInput = Object.values(inputData)[0];
                content = firstInput;
            }
            console.log('Display node auto-detected input port');
        }
        
        console.log('Display node input data:', inputData);
        console.log('Display node selected content:', content);
        console.log('Display node content type:', typeof content);
        
        // Only convert to JSON string if format is 'json' or if it's an object and format is not specified
        if (typeof content === 'object' && format === 'json') {
            content = JSON.stringify(content, null, 2);
        } else if (typeof content === 'object' && format === 'text') {
            // For text format, extract the actual value from common fields
            if (content === null) {
                content = 'null';
            } else if (Array.isArray(content)) {
                content = content.join(', ');
            } else if (typeof content === 'object') {
                // Look for the actual value in common fields
                if (content.extracted_value !== undefined) {
                    content = String(content.extracted_value);
                } else if (content.value !== undefined) {
                    content = String(content.value);
                } else if (content.text !== undefined) {
                    content = String(content.text);
                } else if (content.data !== undefined) {
                    content = String(content.data);
                } else {
                    // If no common fields found, just show the first value
                    const firstValue = Object.values(content)[0];
                    content = String(firstValue);
                }
            }
        }
        
        if (content && content.length > maxLength) {
            content = content.substring(0, maxLength) + '...';
        }
        
        // Update display node content
        updateDisplayNodeContent(node.id, content, format);
        
        return { 
            original_data: content,
            displayed: content,
            processed_data: content
        };
    }
    
    // VFS Load Node Executor
    async executeVfsLoadNode(node, inputData, executed) {
        const filePath = node.config.file_path.value;
        const format = node.config.format.value;
        
        console.log('VFS Load executing:', filePath, 'format:', format);
        
        try {
            let data = null;
            
            if (format === 'json') {
                data = await sypnexAPI.readVirtualFileJSON(filePath);
                console.log('VFS Load JSON data:', data);
            } else if (format === 'text') {
                data = await sypnexAPI.readVirtualFileText(filePath);
                console.log('VFS Load text data length:', data ? data.length : 0);
                console.log('VFS Load text data preview:', data ? data.substring(0, 100) + '...' : 'null');
            } else {
                // For binary files, use the direct URL method
                console.log('VFS Load binary file, using direct URL method');
                const fileUrl = sypnexAPI.getVirtualFileUrl(filePath);
                console.log('VFS Load binary file URL:', fileUrl);
                
                // Check file extension to determine if it's audio
                const extension = filePath.split('.').pop()?.toLowerCase();
                const isAudioFile = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(extension);
                const isImageFile = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension);
                
                if (isAudioFile) {
                    console.log('VFS Load detected audio file:', extension);
                } else if (isImageFile) {
                    console.log('VFS Load detected image file:', extension);
                } else {
                    console.log('VFS Load detected binary file:', extension);
                }
                
                // Fetch the binary data as a Blob
                const response = await fetch(fileUrl);
                if (!response.ok) {
                    throw new Error(`Failed to fetch binary file: ${response.status} ${response.statusText}`);
                }
                
                data = await response.blob();
                console.log('VFS Load binary data as Blob:', data);
                console.log('VFS Load binary data type:', data.type);
                console.log('VFS Load binary data size:', data.size);
            }
            
            // Store the loaded data for display in config panel
            node.lastLoadedFile = filePath;
            node.lastLoadedData = data;
            
            // Return structured output with appropriate port names
            const result = { 
                data: data,
                file_path: filePath,  // Return the actual file path string
                json_data: format === 'json' ? data : null
            };
            console.log('VFS Load returning:', result);
            return result;
        } catch (error) {
            console.error('VFS Load error:', error);
            return { data: null, error: error.message };
        }
    }
    
    // Image Node Executor
    async executeImageNode(node, inputData, executed) {
        const maxPreviewSize = node.config.max_preview_size.value;
        const showInfo = node.config.show_info.value === 'true';
        
        let imageData = inputData.image_data;
        let imageUrl = null;
        let imageInfo = null;
        
        // Handle different types of image data
        if (imageData instanceof Blob) {
            // Create object URL for Blob data
            imageUrl = URL.createObjectURL(imageData);
            imageInfo = {
                type: imageData.type || 'image',
                size: imageData.size
            };
        } else if (typeof imageData === 'string') {
            // Check if it's base64 data
            if (imageData.startsWith('data:image/') || imageData.startsWith('data:application/')) {
                // Already a data URL
                imageUrl = imageData;
            } else if (imageData.match(/^[A-Za-z0-9+/]*={0,2}$/)) {
                // Looks like base64 data, convert to data URL
                // Try to detect image type from the data
                const imageType = window.flowEditorUtils.detectImageTypeFromBase64(imageData);
                imageUrl = `data:${imageType};base64,${imageData}`;
            } else {
                // Assume it's a regular URL
                imageUrl = imageData;
            }
        } else if (imageData && typeof imageData === 'object') {
            // Handle object with image data
            if (imageData.url) {
                imageUrl = imageData.url;
            } else if (imageData.data) {
                imageUrl = imageData.data;
            }
            
            if (imageData.info) {
                imageInfo = imageData.info;
            }
        }
        
        // Note: Removed image dimension detection as it's not needed
        
        // Store image data for display in config panel
        node.lastImageData = imageData;
        node.lastImageUrl = imageUrl;
        node.lastImageInfo = imageInfo;
        
        return {
            image_data: imageData,
            image_url: imageUrl,
            image_info: imageInfo,
            data: imageData
        };
    }
    
    // Audio Node Executor
    async executeAudioNode(node, inputData, executed) {
        const autoPlay = node.config.autoPlay.value === 'true';
        const volume = parseFloat(node.config.volume.value);
        
        let audioData = inputData.audio_data;
        
        console.log('Audio node execution - inputData:', inputData);
        console.log('Audio node execution - audioData:', audioData);
        console.log('Audio data type:', typeof audioData);
        console.log('Audio data instanceof Blob:', audioData instanceof Blob);
        
        if (!audioData) {
            throw new Error('No audio data provided');
        }
        
        // Store audio data for manual play button system (like old system)
        node.audioData = audioData;
        node.volume = volume;
        
        // Create audio element if it doesn't exist (like old system)
        if (!node.audioElement) {
            node.audioElement = new Audio();
            node.audioElement.controls = true;
            node.audioElement.style.width = '100%';
            node.audioElement.style.marginTop = '10px';
        }
        
        // Set audio source (like old system)
        if (audioData instanceof Blob) {
            node.audioElement.src = URL.createObjectURL(audioData);
            console.log('Set audio source from Blob');
            console.log('Audio element src:', node.audioElement.src);
        } else if (typeof audioData === 'string') {
            if (audioData.startsWith('data:audio/') || audioData.startsWith('data:application/')) {
                // Already a data URL
                node.audioElement.src = audioData;
                console.log('Set audio source from data URL');
            } else if (audioData.match(/^[A-Za-z0-9+/]*={0,2}$/)) {
                // Looks like base64 data, convert to data URL
                const audioType = 'audio/mpeg'; // Default to MP3, could be enhanced to detect type
                const dataUrl = `data:${audioType};base64,${audioData}`;
                node.audioElement.src = dataUrl;
                console.log('Set audio source from base64 data');
            } else {
                // Assume it's a regular URL
                node.audioElement.src = audioData;
                console.log('Set audio source from URL');
            }
            console.log('Audio element src:', node.audioElement.src);
            console.log('Audio data received:', audioData);
        } else {
            console.log('Set audio source from unknown data type:', typeof audioData);
            node.audioElement.src = audioData;
        }
        
        // Set volume
        node.audioElement.volume = volume;
        
        // Store for config panel compatibility
        node.lastAudioData = audioData;
        node.lastAudioUrl = node.audioElement.src;
        
        // Auto-play if configured
        if (autoPlay) {
            try {
                await node.audioElement.play();
                console.log('Auto-play started');
            } catch (error) {
                console.error('Auto-play failed:', error);
            }
        }
        
        // Convert audio data to proper data URL for VFS Save
        let dataUrlForSave = null;
        
        if (audioData instanceof Blob) {
            // Convert Blob to data URL
            const reader = new FileReader();
            dataUrlForSave = await new Promise((resolve, reject) => {
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(audioData);
            });
            console.log('Converted Blob to data URL for save:', dataUrlForSave.substring(0, 50) + '...');
        } else if (typeof audioData === 'string') {
            if (audioData.startsWith('data:audio/') || audioData.startsWith('data:application/')) {
                // Already a data URL
                dataUrlForSave = audioData;
            } else if (audioData.match(/^[A-Za-z0-9+/]*={0,2}$/)) {
                // Base64 data, convert to data URL
                const audioType = 'audio/mpeg'; // Default to MP3, could be enhanced to detect type
                dataUrlForSave = `data:${audioType};base64,${audioData}`;
            } else {
                // Regular URL, keep as is
                dataUrlForSave = audioData;
            }
        } else {
            // Fallback
            dataUrlForSave = audioData;
        }
        
        return {
            audio_data: audioData,
            audio_url: node.audioElement.src,
            data: dataUrlForSave  // Return the actual audio data as data URL
        };
    }
    
    // JSON Extract Node Executor
    async executeJsonExtractNode(node, inputData, executed) {
        const fieldPath = node.config.field_path.value;
        const defaultValue = node.config.default_value?.value || '';
        
        // Accept any input data, not just json_data
        let jsonData = null;
        
        // Try to find JSON data from any input
        if (inputData.json_data) {
            jsonData = inputData.json_data;
        } else if (inputData.data) {
            jsonData = inputData.data;
        } else if (inputData.text) {
            jsonData = inputData.text;
        } else if (inputData.response) {
            jsonData = inputData.response;
        } else {
            // Use the first available input
            const firstInput = Object.values(inputData)[0];
            jsonData = firstInput;
        }
        
        console.log('JSON Extract input data:', inputData);
        console.log('JSON Extract selected jsonData:', jsonData);
        console.log('JSON Extract jsonData type:', typeof jsonData);
        
        let extractedValue = null;
        
        try {
            // Parse JSON if it's a string
            if (typeof jsonData === 'string') {
                jsonData = JSON.parse(jsonData);
            }
            
            // Extract value using dot notation
            extractedValue = window.flowEditorUtils.extractNestedValue(jsonData, fieldPath);
            
            // Use default value if extraction failed
            if (extractedValue === null || extractedValue === undefined) {
                extractedValue = defaultValue;
            }
            
            // Format the output as string for consistency
            let formattedValue = String(extractedValue);
            
            // Store for display in config panel
            node.lastExtractedValue = formattedValue;
            node.lastFieldPath = fieldPath;
            
            // Debug logging
            console.log('JSON Extract debug:');
            console.log('  Field path:', fieldPath);
            console.log('  Raw extracted value:', extractedValue, 'Type:', typeof extractedValue);
            console.log('  Default value:', defaultValue);
            console.log('  Formatted value:', formattedValue, 'Type:', typeof formattedValue);
            console.log('  Returning:', { 
                original_data: jsonData,
                extracted_value: formattedValue,
                processed_data: formattedValue
            });
            
            return { 
                data: formattedValue,
                text: formattedValue,
                json: extractedValue,
                extracted_value: formattedValue,
                field_path: fieldPath,
                original: jsonData
            };
        } catch (error) {
            console.error('JSON Extract error:', error);
            return { 
                data: defaultValue,
                text: defaultValue,
                json: null,
                extracted_value: defaultValue,
                field_path: fieldPath,
                original: jsonData,
                error: error.message 
            };
        }
    }
    
    // VFS Save Node Executor
    async executeVfsSaveNode(node, inputData, executed) {
        const filePath = node.config.file_path.value;
        const format = node.config.format.value;
        const overwrite = node.config.overwrite.value === 'true';
        const append = node.config.append.value === 'true';
        
        try {
            let data = inputData.data;
            let success = false;
            
            console.log('VFS Save input value instanceof Blob:', data instanceof Blob);
            console.log('VFS Save input data type:', typeof data);
            
            if (format === 'json') {
                success = await sypnexAPI.writeVirtualFileJSON(filePath, data);
            } else if (format === 'text') {
                const textData = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
                success = await sypnexAPI.writeVirtualFile(filePath, textData);
            } else {
                // For binary data (like Blobs), convert to data URL
                if (data instanceof Blob) {
                    // Convert Blob to data URL
                    const reader = new FileReader();
                    const dataUrl = await new Promise((resolve, reject) => {
                        reader.onload = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(data);
                    });
                    success = await sypnexAPI.writeVirtualFile(filePath, dataUrl);
                } else if (typeof data === 'string') {
                    // If it's already a data URL, save it directly
                    success = await sypnexAPI.writeVirtualFile(filePath, data);
                } else {
                    // Fallback to JSON string
                    const textData = JSON.stringify(data, null, 2);
                    success = await sypnexAPI.writeVirtualFile(filePath, textData);
                }
            }
            
            return { success: success };
        } catch (error) {
            console.error('VFS Save error:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Random Line Node Executor
    async executeRandomQuoteNode(node, inputData, executed) {
        const skipEmpty = node.config.skip_empty.value === 'true';
        const trimWhitespace = node.config.trim_whitespace.value === 'true';
        const maxLength = parseInt(node.config.max_length.value);
        
        console.log('Random Line inputData:', inputData);
        console.log('Random Line inputData.text:', inputData.text);
        console.log('Random Line inputData.text type:', typeof inputData.text);
        
        let text = inputData.text;
        if (typeof text !== 'string') {
            text = JSON.stringify(text);
        }
        
        console.log('Random Line processed text:', text);
        console.log('Random Line text length:', text.length);
        
        const lines = text.split('\n');
        console.log('Random Line split lines:', lines.length, 'lines');
        
        let validLines = lines;
        
        if (skipEmpty) {
            validLines = lines.filter(line => line.trim().length > 0);
            console.log('Random Line after skipEmpty:', validLines.length, 'lines');
        }
        
        if (trimWhitespace) {
            validLines = validLines.map(line => line.trim());
            console.log('Random Line after trimWhitespace:', validLines.length, 'lines');
        }
        
        if (validLines.length === 0) {
            console.log('Random Line: No valid lines found');
            return { random_line: null, line_number: 0, total_lines: 0 };
        }
        
        const randomIndex = Math.floor(Math.random() * validLines.length);
        let randomLine = validLines[randomIndex];
        
        console.log('Random Line Math.random():', Math.random());
        console.log('Random Line validLines.length:', validLines.length);
        console.log('Random Line calculated index:', randomIndex, 'out of', validLines.length);
        console.log('Random Line selected line:', randomLine);
        console.log('Random Line all valid lines:', validLines);
        
        if (maxLength > 0 && randomLine.length > maxLength) {
            randomLine = randomLine.substring(0, maxLength) + '...';
            console.log('Random Line truncated to:', randomLine);
        }
        
        const result = {
            random_line: randomLine,
            line_number: randomIndex + 1,
            total_lines: validLines.length
        };
        
        console.log('Random Line returning:', result);
        return result;
    }
    
    // Repeater Node Executor
    async executeRepeaterNode(node, inputData, executed) {
        const interval = parseInt(node.config.interval.value);
        const count = parseInt(node.config.count.value);
        
        // Initialize repeater state if not exists
        if (!node.repeaterState) {
            node.repeaterState = {
                count: 0,
                interval: null,
                isRunning: false
            };
        }
        
        // If this is a manual trigger (not from interval), start the repeater
        if (!node.repeaterState.isRunning) {
            node.repeaterState.isRunning = true;
            node.repeaterState.count = 0;
            
            // Start the interval
            node.repeaterState.interval = setInterval(async () => {
                node.repeaterState.count++;
                console.log('Repeater triggered:', node.id, 'count:', node.repeaterState.count);
                
                // Execute the connected workflow
                try {
                    const connectedNodes = findConnectedNodes(node.id);
                    const executed = new Set();
                    
                    for (const connectedNode of connectedNodes) {
                        await executeNode(connectedNode.node, { trigger: Date.now() }, executed);
                    }
                } catch (error) {
                    console.error('Error executing repeater workflow:', error);
                }
                
                // Stop if count limit reached
                if (count > 0 && node.repeaterState.count >= count) {
                    this.stopRepeater(node);
                }
            }, interval);
        }
        
        return { trigger: Date.now(), count: node.repeaterState.count, isRunning: node.repeaterState.isRunning };
    }
    
    // Stop repeater method
    stopRepeater(node) {
        if (node.repeaterState && node.repeaterState.interval) {
            clearInterval(node.repeaterState.interval);
            node.repeaterState.interval = null;
            node.repeaterState.isRunning = false;
            console.log('Repeater stopped:', node.id);
        }
    }
    
    // LLM Chat Node Executor
    async executeLlmChatNode(node, inputData, executed) {
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
    
    // Text Node Executor
    async executeTextNode(node, inputData, executed) {
        const textContent = node.config.text_content.value;
        
        return { text: textContent };
    }
    
    // Terminal Node Executor
    async executeTerminalNode(node, inputData, executed) {
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
    
    // Condition Node Executor
    async executeConditionNode(node, inputData, executed) {
        const operator = node.config.operator.value;
        const compareValue = node.config.compare_value.value;
        const caseSensitive = node.config.case_sensitive.value === 'true';
        
        let inputValue = inputData.value;
        let result = false;
        
        // Convert input to string for comparison if needed
        let inputStr = String(inputValue);
        let compareStr = String(compareValue);
        
        // Debug logging for string comparisons
        console.log('Condition node debug:');
        console.log('  Input value:', inputValue, 'Type:', typeof inputValue);
        console.log('  Compare value:', compareValue, 'Type:', typeof compareValue);
        console.log('  Input string:', inputStr, 'Length:', inputStr.length);
        console.log('  Compare string:', compareStr, 'Length:', compareStr.length);
        console.log('  Case sensitive:', caseSensitive);
        
        // Handle case sensitivity
        if (!caseSensitive) {
            inputStr = inputStr.toLowerCase();
            compareStr = compareStr.toLowerCase();
            console.log('  After case conversion - Input:', inputStr, 'Compare:', compareStr);
        }
        
        // Perform comparison based on operator
        switch (operator) {
            case 'equals':
                result = inputStr === compareStr;
                break;
            case 'not_equals':
                result = inputStr !== compareStr;
                break;
            case 'greater_than':
                result = Number(inputValue) > Number(compareValue);
                break;
            case 'less_than':
                result = Number(inputValue) < Number(compareValue);
                break;
            case 'greater_than_or_equal':
                result = Number(inputValue) >= Number(compareValue);
                break;
            case 'less_than_or_equal':
                result = Number(inputValue) <= Number(compareValue);
                break;
            case 'contains':
                result = inputStr.includes(compareStr);
                break;
            case 'not_contains':
                result = !inputStr.includes(compareStr);
                break;
            case 'starts_with':
                result = inputStr.startsWith(compareStr);
                break;
            case 'ends_with':
                result = inputStr.endsWith(compareStr);
                break;
            case 'is_empty':
                result = inputStr.trim() === '';
                break;
            case 'is_not_empty':
                result = inputStr.trim() !== '';
                break;
            default:
                result = false;
        }
        
        // Store for display in config panel
        node.lastInputValue = inputValue;
        node.lastCompareValue = compareValue;
        node.lastResult = result;
        node.lastOperator = operator;
        
        return { result: result };
    }
    
    // Logical Gate Node Executor
    async executeLogicalGateNode(node, inputData, executed) {
        const invert = node.config.invert.value === 'true';
        const description = node.config.description.value;
        
        let condition = inputData.condition;
        
        // Convert to boolean if needed
        if (typeof condition === 'string') {
            condition = condition.toLowerCase() === 'true';
        } else if (typeof condition === 'number') {
            condition = condition !== 0;
        } else if (typeof condition === 'object') {
            // If it's an object with a result field (from condition node)
            condition = condition.result === true;
        }
        
        // Apply inversion if configured
        if (invert) {
            condition = !condition;
        }
        
        // Store for display in config panel
        node.lastCondition = condition;
        node.lastInverted = invert;
        node.lastDescription = description;
        
        // Only return trigger if condition is true
        if (condition) {
            return { trigger: Date.now() };
        } else {
            // Return special object to indicate execution should stop
            return { __stop_execution: true };
        }
    }
}

// Global execution engine instance
console.log('Creating global executionEngine instance...');
const executionEngine = new ExecutionEngine(nodeRegistry);
console.log('Global executionEngine created:', executionEngine); 