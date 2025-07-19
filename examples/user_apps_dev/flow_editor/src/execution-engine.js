// execution-engine.js - Dynamic execution engine for Flow Editor

class ExecutionEngine {
    constructor(registry) {
        this.registry = registry;
        this.setupExecutors();
    }

    setupExecutors() {
        // Register executors from external files with engine instance passed as first parameter
        this.registry.registerExecutor('http_executor', (node, inputData, executed) => 
            window.httpExecutors.executeHttpNode(this, node, inputData, executed));
        this.registry.registerExecutor('vfs_save_executor', (node, inputData, executed) => 
            window.httpExecutors.executeVfsSaveNode(this, node, inputData, executed));
        this.registry.registerExecutor('vfs_load_executor', (node, inputData, executed) => 
            window.httpExecutors.executeVfsLoadNode(this, node, inputData, executed));
            
        this.registry.registerExecutor('timer_executor', (node, inputData, executed) => 
            window.flowExecutors.executeTimerNode(this, node, inputData, executed));
        this.registry.registerExecutor('display_executor', (node, inputData, executed) => 
            window.flowExecutors.executeDisplayNode(this, node, inputData, executed));
        this.registry.registerExecutor('repeater_executor', (node, inputData, executed) => 
            window.flowExecutors.executeRepeaterNode(this, node, inputData, executed));
        this.registry.registerExecutor('condition_executor', (node, inputData, executed) => 
            window.flowExecutors.executeConditionNode(this, node, inputData, executed));
        this.registry.registerExecutor('logical_gate_executor', (node, inputData, executed) => 
            window.flowExecutors.executeLogicalGateNode(this, node, inputData, executed));
            
        this.registry.registerExecutor('audio_executor', (node, inputData, executed) => 
            window.mediaExecutors.executeAudioNode(this, node, inputData, executed));
        this.registry.registerExecutor('image_executor', (node, inputData, executed) => 
            window.mediaExecutors.executeImageNode(this, node, inputData, executed));
            
        this.registry.registerExecutor('json_extract_executor', (node, inputData, executed) => 
            window.dataExecutors.executeJsonExtractNode(this, node, inputData, executed));
        this.registry.registerExecutor('random_line_executor', (node, inputData, executed) => 
            window.dataExecutors.executeRandomQuoteNode(this, node, inputData, executed));
        this.registry.registerExecutor('text_executor', (node, inputData, executed) => 
            window.dataExecutors.executeTextNode(this, node, inputData, executed));
            
        this.registry.registerExecutor('llm_chat_executor', (node, inputData, executed) => 
            window.aiExecutors.executeLlmChatNode(this, node, inputData, executed));
        this.registry.registerExecutor('terminal_executor', (node, inputData, executed) => 
            window.aiExecutors.executeTerminalNode(this, node, inputData, executed));
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



    // Stop repeater method
    stopRepeater(node) {
        if (node.repeaterState && node.repeaterState.interval) {
            clearInterval(node.repeaterState.interval);
            node.repeaterState.interval = null;
            node.repeaterState.isRunning = false;
            console.log('Repeater stopped:', node.id);
        }
    }




}

// Global execution engine instance
console.log('Creating global executionEngine instance...');
const executionEngine = new ExecutionEngine(nodeRegistry);
console.log('Global executionEngine created:', executionEngine); 