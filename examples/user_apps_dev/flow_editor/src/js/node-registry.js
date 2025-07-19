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
            console.log('Loading nodes from VFS...');
            
            // List all files in /nodes/ directory
            const directoryData = await sypnexAPI.listVirtualFiles('/nodes/');
            console.log('Directory data from /nodes/:', directoryData);
            
            if (!directoryData.items) {
                console.log('No items found in /nodes/ directory');
                return;
            }
            
            const allFiles = directoryData.items;
            console.log('All files in /nodes/:', allFiles);
            
            const nodeFiles = allFiles.filter(file => file.name && file.name.endsWith('.node'));
            console.log(`Found ${nodeFiles.length} node files:`, nodeFiles);
            
            for (const file of nodeFiles) {
                await this.loadNodeFile(`/nodes/${file.name}`);
            }
            
            this.loaded = true;
            console.log(`Loaded ${this.nodeTypes.size} node types:`, Array.from(this.nodeTypes.keys()));
            
        } catch (error) {
            console.error('Failed to load nodes from VFS:', error);
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