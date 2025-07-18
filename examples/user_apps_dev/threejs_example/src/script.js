// Neural Network Visualization with Three.js
console.log('Neural Network app loading...');

// Test that we can access functions from test.js (loaded first)
if (typeof testUtility === 'function') {
    console.log('🎉 Success! testUtility function is available from test.js');
    const result = testUtility();
    console.log('Result from testUtility:', result);
} else {
    console.warn('⚠️ testUtility function not found - test.js may not have loaded properly');
}

// Check if test script loaded flag is set
if (window.testScriptLoaded) {
    console.log('✅ test.js loaded successfully (flag detected)');
} else {
    console.warn('⚠️ test.js may not have loaded (flag not detected)');
}

// Global variables
let THREE, scene, camera, renderer, animationId;
let nodes = [], connections = [];
let isPaused = false;
let clock = new Date();
let frameCount = 0;
let lastTime = 0;

// DOM elements
let pauseResumeBtn, resetBtn, networkSizeSelect;
let loadingStatus, errorStatus, errorMessage;
let nodeCountEl, connectionCountEl, fpsEl;
let threejsContainer;

// Network configuration
const networkConfigs = {
    small: { layers: [3, 4, 3], spacing: 2 },
    medium: { layers: [4, 6, 4], spacing: 1.8 },
    large: { layers: [5, 8, 5], spacing: 1.5 }
};

// Initialize the app
async function initNeuralNetwork() {
    console.log('Initializing Neural Network...');
    
    // Get DOM elements
    pauseResumeBtn = document.getElementById('pause-resume');
    resetBtn = document.getElementById('reset');
    networkSizeSelect = document.getElementById('network-size');
    loadingStatus = document.getElementById('loading-status');
    errorStatus = document.getElementById('error-status');
    errorMessage = document.getElementById('error-message');
    nodeCountEl = document.getElementById('node-count');
    connectionCountEl = document.getElementById('connection-count');
    fpsEl = document.getElementById('fps');
    threejsContainer = document.getElementById('threejs-container');
    
    try {
        // Load Three.js using SypnexAPI
        console.log('Loading Three.js...');
        // THREE = await sypnexAPI.loadLibrary('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', {
        //     localName: 'THREE'
        // });
        THREE = await sypnexAPI.loadCommonLibrary('threejs');
        
        console.log('✅ Three.js loaded successfully:', typeof THREE);
        console.log('Three.js version:', THREE.REVISION);
        
        // Hide loading status
        loadingStatus.style.display = 'none';
        
        // Initialize Three.js scene
        initThreeJS();
        
        // Set up event listeners
        setupEventListeners();
        
        // Start animation
        animate();
        
        console.log('Neural Network initialized successfully!');
        
    } catch (error) {
        console.error('❌ Failed to initialize Neural Network:', error);
        showError(`Failed to load Three.js: ${error.message}`);
    }
}

// Initialize Three.js scene
function initThreeJS() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);
    
    // Create camera
    camera = new THREE.PerspectiveCamera(
        75,
        threejsContainer.clientWidth / threejsContainer.clientHeight,
        0.1,
        1000
    );
    camera.position.set(0, 0, 15);
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(threejsContainer.clientWidth, threejsContainer.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Add renderer to container
    threejsContainer.appendChild(renderer.domElement);
    
    // Add lighting
    addLighting();
    
    // Create neural network
    createNeuralNetwork();
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
}

// Add lighting to the scene
function addLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);
    
    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    // Point lights for dramatic effect
    const pointLight1 = new THREE.PointLight(0x4CAF50, 0.5, 20);
    pointLight1.position.set(-5, 5, 5);
    scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0x2196F3, 0.5, 20);
    pointLight2.position.set(5, -5, 5);
    scene.add(pointLight2);
}

// Create neural network
function createNeuralNetwork() {
    // Clear existing network
    clearNetwork();
    
    const config = networkConfigs[networkSizeSelect.value];
    const { layers, spacing } = config;
    
    // Create nodes for each layer
    layers.forEach((nodeCount, layerIndex) => {
        const layerNodes = [];
        const layerX = (layerIndex - (layers.length - 1) / 2) * spacing * 3;
        
        for (let i = 0; i < nodeCount; i++) {
            const nodeY = (i - (nodeCount - 1) / 2) * spacing;
            const node = createNode(layerX, nodeY, layerIndex);
            layerNodes.push(node);
            nodes.push(node);
        }
        
        // Create connections to next layer
        if (layerIndex < layers.length - 1) {
            const nextLayerNodes = [];
            const nextLayerX = ((layerIndex + 1) - (layers.length - 1) / 2) * spacing * 3;
            
            for (let i = 0; i < layers[layerIndex + 1]; i++) {
                const nodeY = (i - (layers[layerIndex + 1] - 1) / 2) * spacing;
                const node = createNode(nextLayerX, nodeY, layerIndex + 1);
                nextLayerNodes.push(node);
                nodes.push(node);
            }
            
            // Connect layers
            layerNodes.forEach(fromNode => {
                nextLayerNodes.forEach(toNode => {
                    const connection = createConnection(fromNode, toNode);
                    connections.push(connection);
                });
            });
        }
    });
    
    // Update info display
    updateInfoDisplay();
}

// Create a node
function createNode(x, y, layerIndex) {
    const geometry = new THREE.SphereGeometry(0.15, 16, 16);
    const material = new THREE.MeshPhongMaterial({
        color: getNodeColor(layerIndex),
        emissive: getNodeColor(layerIndex),
        emissiveIntensity: 0.2,
        shininess: 100
    });
    
    const node = new THREE.Mesh(geometry, material);
    node.position.set(x, y, 0);
    node.castShadow = true;
    node.receiveShadow = true;
    
    // Add animation properties
    node.userData = {
        originalPosition: node.position.clone(),
        pulsePhase: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02
    };
    
    scene.add(node);
    return node;
}

// Create a connection between nodes
function createConnection(fromNode, toNode) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array([
        fromNode.position.x, fromNode.position.y, fromNode.position.z,
        toNode.position.x, toNode.position.y, toNode.position.z
    ]);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.LineBasicMaterial({
        color: 0x4CAF50,
        transparent: true,
        opacity: 0.6
    });
    
    const connection = new THREE.Line(geometry, material);
    connection.userData = {
        fromNode: fromNode,
        toNode: toNode,
        pulsePhase: Math.random() * Math.PI * 2
    };
    
    scene.add(connection);
    return connection;
}

// Get node color based on layer
function getNodeColor(layerIndex) {
    const colors = [0x4CAF50, 0x2196F3, 0xFF9800, 0x9C27B0, 0xF44336];
    return colors[layerIndex % colors.length];
}

// Clear network
function clearNetwork() {
    nodes.forEach(node => scene.remove(node));
    connections.forEach(connection => scene.remove(connection));
    nodes = [];
    connections = [];
}

// Animation loop
function animate() {
    if (!isPaused) {
        animationId = requestAnimationFrame(animate);
        
        const currentTime = performance.now();
        const deltaTime = currentTime - lastTime;
        lastTime = currentTime;
        
        // Update FPS
        frameCount++;
        if (frameCount % 60 === 0) {
            const fps = Math.round(1000 / (deltaTime || 1));
            fpsEl.textContent = fps;
        }
        
        // Animate nodes
        nodes.forEach(node => {
            const userData = node.userData;
            const time = currentTime * 0.001;
            
            // Pulsing effect
            const pulse = Math.sin(time * 2 + userData.pulsePhase) * 0.1 + 1;
            node.scale.setScalar(pulse);
            
            // Gentle rotation
            node.rotation.x += userData.rotationSpeed;
            node.rotation.y += userData.rotationSpeed * 0.5;
            
            // Floating motion
            const floatY = Math.sin(time + userData.pulsePhase) * 0.1;
            node.position.y = userData.originalPosition.y + floatY;
        });
        
        // Animate connections
        connections.forEach(connection => {
            const userData = connection.userData;
            const time = currentTime * 0.001;
            
            // Pulse opacity
            const opacity = Math.sin(time * 3 + userData.pulsePhase) * 0.3 + 0.7;
            connection.material.opacity = opacity;
            
            // Update connection positions
            const positions = connection.geometry.attributes.position.array;
            positions[0] = userData.fromNode.position.x;
            positions[1] = userData.fromNode.position.y;
            positions[2] = userData.fromNode.position.z;
            positions[3] = userData.toNode.position.x;
            positions[4] = userData.toNode.position.y;
            positions[5] = userData.toNode.position.z;
            connection.geometry.attributes.position.needsUpdate = true;
        });
        
        // Rotate camera slowly
        const cameraRadius = 15;
        const cameraSpeed = 0.0005;
        camera.position.x = Math.cos(currentTime * cameraSpeed) * cameraRadius;
        camera.position.z = Math.sin(currentTime * cameraSpeed) * cameraRadius;
        camera.lookAt(0, 0, 0);
    }
    
    renderer.render(scene, camera);
}

// Handle window resize
function onWindowResize() {
    if (camera && renderer && threejsContainer) {
        camera.aspect = threejsContainer.clientWidth / threejsContainer.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(threejsContainer.clientWidth, threejsContainer.clientHeight);
    }
}

// Set up event listeners
function setupEventListeners() {
    // Pause/Resume button
    pauseResumeBtn.addEventListener('click', () => {
        isPaused = !isPaused;
        
        if (isPaused) {
            pauseResumeBtn.innerHTML = '<i class="fas fa-play"></i> Resume';
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
        } else {
            pauseResumeBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
            animate();
        }
    });
    
    // Reset button
    resetBtn.addEventListener('click', () => {
        createNeuralNetwork();
    });
    
    // Network size selector
    networkSizeSelect.addEventListener('change', () => {
        createNeuralNetwork();
    });
}

// Update info display
function updateInfoDisplay() {
    nodeCountEl.textContent = nodes.length;
    connectionCountEl.textContent = connections.length;
}

// Show error
function showError(message) {
    errorMessage.textContent = message;
    errorStatus.style.display = 'block';
    loadingStatus.style.display = 'none';
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNeuralNetwork);
} else {
    initNeuralNetwork();
}
