export const parseVoiceCommand = (transcript) => {
    const normalize = (str) => str.toLowerCase().trim();
    const lowerTranscript = normalize(transcript);

    // 1. Split transcript into "Global Part" and "Items Part"
    const itemSplitters = ['add item', 'new item', 'next item', 'add product'];
    let firstItemIndex = -1;
    let splitPhrase = '';

    for (const splitter of itemSplitters) {
        const idx = lowerTranscript.indexOf(splitter);
        if (idx !== -1 && (firstItemIndex === -1 || idx < firstItemIndex)) {
            firstItemIndex = idx;
            splitPhrase = splitter;
        }
    }

    let globalTranscript = lowerTranscript;
    let itemsTranscript = '';

    if (firstItemIndex !== -1) {
        globalTranscript = lowerTranscript.substring(0, firstItemIndex).trim();
        itemsTranscript = lowerTranscript.substring(firstItemIndex).trim();
    }

    // --- PART 1: PARSE GLOBAL FIELDS ---
    // Mappings cover all Labels found in App.jsx
    const globalMappings = [
        // --- Business Details ---
        { triggers: ['business name', 'company name'], path: 'sender.name' }, // Label: "Business Name"
        { triggers: ['email', 'e-mail', 'e mail', 'email address', 'business email', 'my email', 'contact email'], path: 'sender.email' }, // Label: "Email Address"
        { triggers: ['business address', 'my address', 'office address'], path: 'sender.address' }, // Label: "Business Address"
        { triggers: ['phone number', 'contact number'], path: 'sender.phone' }, // Label: "Phone Number"
        { triggers: ['tax id', 'gst id', 'gstin'], path: 'sender.taxId' }, // Label: "Tax / GST ID"
        { triggers: ['template'], path: 'global.template' }, // Label: "Template"

        // --- Client Details ---
        { triggers: ['client name'], path: 'client.name' }, // Label: "Client Name"
        { triggers: ['company name', 'client company'], path: 'client.company' }, // Label: "Company Name"
        { triggers: ['client address', 'billing address'], path: 'client.address' }, // Label: "Client Address"
        { triggers: ['client email', 'customer email'], path: 'client.email' }, // Label: "Client Email"
        { triggers: ['client gstin', 'client tax', 'customer gst'], path: 'client.taxId' }, // Label: "Client GSTIN"

        // --- Invoice Meta ---
        { triggers: ['number', 'invoice number', 'invoice no'], path: 'meta.number' }, // Label: "Number"
        { triggers: ['date', 'issue date', 'invoice date'], path: 'meta.date' }, // Label: "Date"
        { triggers: ['due date'], path: 'meta.dueDate' }, // Label: "Due Date"
        { triggers: ['currency'], path: 'meta.currency' }, // Label: "Currency"

        // --- Totals / Global ---
        { triggers: ['tax type'], path: 'global.taxType' }, // Label: "Tax Type"
        { triggers: ['round off'], path: 'global.roundOff' }, // Label: "Round Off"
        { triggers: ['payment details', 'notes'], path: 'payment.details' }, // Label: "Payment Details / Notes"
        { triggers: ['discount type'], path: 'global.discountType' }, // Label: "Discount Type" (inferred)
        { triggers: ['discount'], path: 'global.discount' }, // Label: "Discount"
    ];

    const updates = extractFields(globalTranscript, globalMappings);

    // --- PART 2: PARSE ITEMS ---

    const newItems = [];
    if (itemsTranscript) {
        let standardizedItems = itemsTranscript;
        itemSplitters.forEach(s => {
            standardizedItems = standardizedItems.replaceAll(s, '||ITEM||');
        });

        const itemBlocks = standardizedItems.split('||ITEM||').map(s => s.trim()).filter(Boolean);

        const itemMappings = [
            { triggers: ['description', 'item description'], path: 'description' }, // Label: "Description"
            { triggers: ['hsn', 'sac', 'hsn/sac'], path: 'hsn' }, // Label: "HSN/SAC"
            { triggers: ['quantity', 'qty'], path: 'quantity' }, // Label: "Qty"
            { triggers: ['price', 'rate'], path: 'price' }, // Label: "Price"
            { triggers: ['igst %', 'igst'], path: 'igst' }, // Label: "IGST %"
            { triggers: ['cgst %', 'cgst'], path: 'cgst' }, // Label: "CGST %"
            { triggers: ['sgst %', 'sgst'], path: 'sgst' }, // Label: "SGST %"
            { triggers: ['total'], path: 'total' } // Label: "Total" (Read-only usually, but parser detects it)
        ];

        itemBlocks.forEach(block => {
            const itemData = extractFields(block, itemMappings);

            // Clean/Transform Data
            if (itemData.price) itemData.price = parseNumber(itemData.price);
            if (itemData.quantity) itemData.quantity = parseNumber(itemData.quantity);
            if (itemData.igst) itemData.igst = parseNumber(itemData.igst);
            if (itemData.cgst) itemData.cgst = parseNumber(itemData.cgst);
            if (itemData.sgst) itemData.sgst = parseNumber(itemData.sgst);

            // Defaulting Logic
            if (!itemData.description) {
                // Attempt to find description from leftover text if needed, 
                // but strict label matching implies user should say "Description [Desc]"
                // Fallback: if block starts with "Description", fine. 
                // If we want more robust: take everything that isn't another field value? Too complex for regex parser.
                itemData.description = "New Item";
            }

            newItems.push({
                id: Date.now() + Math.random(),
                description: itemData.description,
                hsn: itemData.hsn || '',
                quantity: itemData.quantity || 1,
                price: itemData.price || 0,
                igst: itemData.igst || 0,
                cgst: itemData.cgst || 0,
                sgst: itemData.sgst || 0
            });
        });
    }

    return { updates, newItems };
};

// --- HELPER FUNCTIONS ---

function extractFields(text, mappings) {
    const foundTriggers = [];

    mappings.forEach(mapping => {
        mapping.triggers.forEach(trigger => {
            let index = text.indexOf(trigger);
            while (index !== -1) {
                foundTriggers.push({
                    trigger,
                    index,
                    path: mapping.path,
                    length: trigger.length
                });
                index = text.indexOf(trigger, index + 1);
            }
        });
    });

    // Sort by Length Descending (Longest Match First)
    foundTriggers.sort((a, b) => b.length - a.length);

    // Filter Overlaps
    const activeTriggers = [];
    foundTriggers.forEach(cand => {
        const overlaps = activeTriggers.some(t => {
            const tEnd = t.index + t.length;
            const cEnd = cand.index + cand.length;
            return (cand.index < tEnd && cEnd > t.index); // partial overlap check
        });
        if (!overlaps) {
            activeTriggers.push(cand);
        }
    });

    // Sort by Position
    activeTriggers.sort((a, b) => a.index - b.index);

    const result = {};
    for (let i = 0; i < activeTriggers.length; i++) {
        const t = activeTriggers[i];
        const nextT = activeTriggers[i + 1];
        const startPos = t.index + t.length;

        let rawValue;
        if (nextT) {
            rawValue = text.substring(startPos, nextT.index);
        } else {
            rawValue = text.substring(startPos);
        }

        let value = rawValue.trim();
        // Remove common cleaned symbols at start
        value = value.replace(/^[:\-\s=]+/, '').replace(/^(is|equal to|equals)\s+/, '');

        // Remove trailing period if present (common in speech-to-text sentences)
        value = value.replace(/[.]+$/, '');

        // Special handling for Email fields
        if (t.path.toLowerCase().includes('email')) {
            // Fix " at " and " dot " first, ensuring they are distinct words
            // We use a regex with boundary-like checks or just surrounding spaces
            // " at " -> "@", " dot " -> "."
            value = value.replace(/\s+at\s+/g, '@').replace(/\s+dot\s+/g, '.');

            // Also handle case where it might be at start/end or just "at" if strictly space separated
            // But simpler: just strip spaces AFTER replacing the semantic words
            value = value.replace(/\s+/g, '').toLowerCase();

            // Fix double @@ or .. if happened (in case browser also did it)
            value = value.replace(/@+/g, '@').replace(/\.\.+/g, '.');
        }

        if (value) {
            result[t.path] = value;
        }
    }
    return result;
}

function parseNumber(str) {
    if (!str) return 0;
    const match = str.match(/(\d+(\.\d+)?)/);
    return match ? parseFloat(match[0]) : 0;
}
