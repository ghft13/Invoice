
// Mock of App.jsx logic to test the integration
import { parseItemDetails } from './src/utils/voiceParser.js';

console.log("Testing Row Voice Command Logic...");

// Mock handleVoiceInput logic
function handleVoiceInput(text) {
    console.log(`\nInput: "${text}"`);

    // 1. Try parsing structured command
    const itemData = parseItemDetails(text);

    if (Object.keys(itemData).length > 0) {
        console.log("Structured Update:", JSON.stringify(itemData, null, 2));
    } else {
        // 2. Fallback
        const numericString = text.replace(/[^0-9.]/g, '');
        const value = parseFloat(numericString);
        if (!isNaN(value)) {
            console.log("Legacy Price Update:", value);
        } else {
            console.log("No update.");
        }
    }
}

// Test Cases
handleVoiceInput("Description Soap Quantity 5 Price 100");
handleVoiceInput("Quantity 10");
handleVoiceInput("500"); // Legacy price check
handleVoiceInput("Hello World"); // Should do nothing
