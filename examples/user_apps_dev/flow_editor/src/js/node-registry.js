// node-registry.js - Dynamic node registry for Flow Editor

class NodeRegistry {
    constructor() {
        console.log('NodeRegistry constructor called');
        this.nodeTypes = new Map();
        this.executors = new Map();
        this.loaded = false;
        console.log('NodeRegistry initialized');
    }
    
    async loadNodesFromVFS() {
        if (this.loaded) return;
        
        try {
            console.log('Loading nodes from VFS packed file...');
            
            // Load the packed nodes file directly
            const packFilePath = '/nodes/nodes-pack.json';
            console.log(`Loading packed nodes from: ${packFilePath}`);
            
            const content = await sypnexAPI.readVirtualFileText(packFilePath);
            const packData = JSON.parse(content);
            
            console.log(`Loaded packed nodes (version ${packData.version}), total nodes: ${packData.total_nodes}`);
            
            // Register all nodes from the pack
            for (const [nodeId, nodeDef] of Object.entries(packData.nodes)) {
                this.registerNode(nodeDef);
                console.log(`Registered node: ${nodeId}`);
            }
            
            this.loaded = true;
            console.log(`Loaded ${this.nodeTypes.size} node types:`, Array.from(this.nodeTypes.keys()));
            
        } catch (error) {
            console.error('Failed to load nodes from VFS packed file:', error);
            throw error; // Re-throw to indicate failure
        }
    }
    
    async loadNodeFile(filePath) {
        try {
            console.log(`Loading node from: ${filePath}`);
            const content = await sypnexAPI.readVirtualFileText(filePath);
            const nodeDef = JSON.parse(content);
            this.registerNode(nodeDef);
            console.log(`Loaded node: ${nodeDef.id}`);
        } catch (error) {
            console.error(`Failed to load node from ${filePath}:`, error);
        }
    }
    
    registerNode(nodeDef) {
        this.nodeTypes.set(nodeDef.id, nodeDef);
    }
    
    registerExecutor(name, executor) {
        this.executors.set(name, executor);
    }
    
    getNodeType(id) {
        return this.nodeTypes.get(id);
    }
    
    getExecutor(name) {
        return this.executors.get(name);
    }
    
    getAllNodeTypes() {
        return Array.from(this.nodeTypes.values());
    }
    
    getNodeTypesByCategory(category) {
        return this.getAllNodeTypes().filter(node => node.category === category);
    }
}

// Global node registry instance
console.log('Creating global nodeRegistry instance...');
const nodeRegistry = new NodeRegistry();
console.log('Global nodeRegistry created:', nodeRegistry); 