
const parseVoiceCommand = (transcript) => {
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
        { triggers: ['business name', 'my business'], path: 'sender.name' }, // Label: "Business Name"
        { triggers: ['email', 'e-mail', 'e mail', 'email address', 'business email', 'my email', 'contact email'], path: 'sender.email' }, // Label: "Email Address"
        { triggers: ['business address', 'my address', 'office address'], path: 'sender.address' }, // Label: "Business Address"
        { triggers: ['phone number', 'contact number'], path: 'sender.phone' }, // Label: "Phone Number"
        { triggers: ['tax id', 'gst id', 'gstin'], path: 'sender.taxId' }, // Label: "Tax / GST ID"
        { triggers: ['template'], path: 'global.template' }, // Label: "Template"

        // --- Client Details ---
        { triggers: ['client name'], path: 'client.name' }, // Label: "Client Name"
        { triggers: ['company name', 'client company'], path: 'client.company' }, // Label: "Company Name"
        { triggers: ['client address', 'billing address'], path: 'client.address' }, // Label: "Client Address"
        { triggers: ['client email', 'customer email', 'client email address', 'customer email address', "client's email", "clients email", "billing email", "client mail", "customer mail"], path: 'client.email' }, // Label: "Client Email"
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
    return { updates };
};

// --- HELPER FUNCTIONS ---

function extractFields(text, mappings) {
    const foundTriggers = [];

    mappings.forEach(mapping => {
        mapping.triggers.forEach(trigger => {
            let index = text.indexOf(trigger);
            while (index !== -1) {
                // Check word boundaries
                const prevChar = index > 0 ? text[index - 1] : ' ';
                const nextChar = index + trigger.length < text.length ? text[index + trigger.length] : ' ';
                const isWordChar = (c) => /[a-z0-9]/i.test(c);

                if (!isWordChar(prevChar) && !isWordChar(nextChar)) {
                    foundTriggers.push({
                        trigger,
                        index,
                        path: mapping.path,
                        length: trigger.length
                    });
                }
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
            value = value.replace(/\s+at\s+/g, '@').replace(/\s+dot\s+/g, '.');
            value = value.replace(/\s+/g, '').toLowerCase();
            value = value.replace(/@+/g, '@').replace(/\.\.+/g, '.');
        }

        if (value) {
            // Date Parsing Logic
            if (t.path.toLowerCase().includes('date')) {
                value = parseDate(value);
            }
            result[t.path] = value;
        }
    }
    return result;
}

function parseDate(str) {
    if (!str) return '';
    try {
        // Clean up ordinals (1st, 2nd, 3rd, 4th)
        const cleanStr = str.replace(/(\d+)(st|nd|rd|th)/g, '$1');
        const date = new Date(cleanStr);
        if (isNaN(date.getTime())) return str; // Return original if parse fails

        // Use local time to avoid timezone shifts
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) {
        return str;
    }
}

// TEST CASES
const inputs = [
    "client email jay12@gmail.com",
    "client email address jay12@gmail.com",
    "email address jay12@gmail.com", // should trigger sender.email
    "clients email jay12@gmail.com",
    "Client Email jay12@gmail.com",
    "client email: jay12@gmail.com",
    "client email",
    "client emailjay12@gmail.com",
    "client, email jay12@gmail.com",
    "client-email jay12@gmail.com",
    "client-email jay12@gmail.com",
    "client. email jay12@gmail.com",
    "client gst 123ABC",
    "date january 1 2024",
    "invoice date 10th october 2024",
    "issue date 2024-12-25"
];

inputs.forEach(input => {
    console.log(`Input: "${input}"`);
    console.log(JSON.stringify(parseVoiceCommand(input), null, 2));
    console.log('---');
});
