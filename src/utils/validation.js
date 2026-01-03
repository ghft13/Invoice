export const PATTERNS = {
    // GSTIN: 2 digits + 5 char (upper) + 4 digits + 1 char (upper) + 1 alphanumeric + Z + 1 alphanumeric
    GSTIN: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    EMAIL: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    PHONE: /^[6-9]\d{9}$/, // Basic Indian mobile number validation
    NAME: /^[a-zA-Z0-9\s\-\.\,\(\)\/]{2,100}$/, // Alphanumeric, spaces, dots, commas, hyphens, brackets, slashes. Min 2, max 100
    // Invoice Number: Uppercase A-Z, 0-9, dash, slash. Max 20.
    INVOICE_NUMBER: /^[A-Z0-9\-\/]{1,20}$/,
    // Semantic HTML tags to strip
    HTML_TAGS: /<[^>]*>?/gm,
    // Dangerous patterns (script, javascript:, etc - for extra safety)
    DANGEROUS_YUCK: /(javascript:|vbscript:|data:|onclick|onload|onerror)/i
};

export const sanitizeText = (text) => {
    if (!text) return "";
    let sanitized = text.toString();
    // 1. Remove HTML tags
    sanitized = sanitized.replace(PATTERNS.HTML_TAGS, "");
    // 2. Remove dangerous event handlers or protocols if any slipped through (though stripping tags usually covers it)
    // We strictly allow only text, so stripping tags is the main defense.
    // Double check for weird encoding? For now, standard strip is sufficient for "Text Fields"
    return sanitized.trim();
};

export const validateGSTIN = (gstin) => {
    if (!gstin) return null; // Optional
    // Strict uppercase enforcement
    if (gstin !== gstin.toUpperCase()) return "GSTIN must be uppercase";

    if (gstin.length !== 15) return "GSTIN must be exactly 15 characters";

    if (!PATTERNS.GSTIN.test(gstin)) return "Invalid GSTIN format (e.g., 29ABCDE1234F1Z5)";

    return null;
};

export const validateEmail = (email) => {
    if (!email) return null; // Optional usually, but if present check format
    if (!PATTERNS.EMAIL.test(email)) return "Invalid email address";
    return null;
};

export const validatePhone = (phone) => {
    if (!phone) return null; // Optional
    if (!PATTERNS.PHONE.test(phone)) return "Invalid mobile number (10 digits)";
    return null;
};

export const validateName = (name, label = "Name") => {
    if (!name) return `${label} is required`;
    const sanitized = sanitizeText(name);
    // If sanitization removed everything (e.g. user entered only <script>), it's invalid.
    if (sanitized.length === 0) return `${label} is invalid`;

    if (sanitized.length < 2) return `${label} must be at least 2 characters`;
    if (sanitized.length > 100) return `${label} must be under 100 characters`;

    // Check for dangerous patterns that might not be tags (like javascript: urls if this were a link, but it's a name)
    if (PATTERNS.DANGEROUS_YUCK.test(sanitized)) return `${label} contains invalid content`;

    return null;
};

export const validateAmount = (amount, label = "Amount") => {
    if (amount === undefined || amount === null || amount === '') return `${label} is required`;
    const num = Number(amount);
    if (isNaN(num)) return `${label} must be a number`;
    if (num < 0) return `${label} cannot be negative`;
    if (!isFinite(num)) return `${label} is invalid`;
    return null;
};

export const validateInvoiceNumber = (number) => {
    if (!number) return "Invoice number is required";
    if (!PATTERNS.INVOICE_NUMBER.test(number)) return "Invalid Invoice Number (A-Z, 0-9, -, / only)";
    return null;
};

export const validateGSTRate = (rate) => {
    const validRates = [0, 5, 12, 18, 28];
    const r = Number(rate);
    if (!validRates.includes(r)) return "Invalid GST Rate";
    return null;
};

export const validateDate = (dateString, label = "Date") => {
    if (!dateString) return `${label} is required`;
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return `Invalid ${label}`;
    // Future date checks can be added here if requested, but "Block invalid or future dates (optional)" 
    // Current requirement: "Block invalid" is mandatory. Future is optional.
    return null;
};
