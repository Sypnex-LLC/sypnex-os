// Image Node Executor
async function executeImageNode(engine, node, inputData, executed) {
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
async function executeAudioNode(engine, node, inputData, executed) {
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

// Export to global scope
window.mediaExecutors = {
    executeImageNode,
    executeAudioNode
};