
// Timer Node Executor
async function executeTimerNode(engine, node, inputData, executed) {
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
async function executeDisplayNode(engine, node, inputData, executed) {
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


// Repeater Node Executor
async function executeRepeaterNode(engine, node, inputData, executed) {
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
                engine.stopRepeater(node);
            }
        }, interval);
    }

    return { trigger: Date.now(), count: node.repeaterState.count, isRunning: node.repeaterState.isRunning };
}

// Condition Node Executor
async function executeConditionNode(engine, node, inputData, executed) {
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
async function executeLogicalGateNode(engine, node, inputData, executed) {
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

// Export to global scope
window.flowExecutors = {
    executeTimerNode,
    executeDisplayNode,
    executeRepeaterNode,
    executeConditionNode,
    executeLogicalGateNode
};