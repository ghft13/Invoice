export const PATTERNS = {
    // GSTIN: 2 digits + 5 chars + 4 digits + 1 char + 1 char + Z + 1 char/digit
    GSTIN: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    EMAIL: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    PHONE: /^[6-9]\d{9}$/, // Basic Indian mobile number validation
    NAME: /^[a-zA-Z0-9\s\-\.\,]{2,100}$/, // Alphanumeric, spaces, dots, commas, hyphens. Min 2, max 100
    INVOICE_NUMBER: /^[A-Z0-9\-\/]{1,20}$/ // Uppercase, numbers, hyphens, slashes. Max 20
};

export const validateGSTIN = (gstin) => {
    if (!gstin) return null; // Optional
    const normalized = gstin.toUpperCase();
    if (normalized.length !== 15) return "GSTIN must be exactly 15 characters";
    if (!PATTERNS.GSTIN.test(normalized)) return "Invalid GSTIN format";
    return null;
};

export const validateEmail = (email) => {
    if (!email) return null; // Optional usually, but if present check format
    if (!PATTERNS.EMAIL.test(email)) return "Invalid email address";
    return null;
};

export const validatePhone = (phone) => {
    if (!phone) return null; // Optional
    if (!PATTERNS.PHONE.test(phone)) return "Invalid phone number (10 digits)";
    return null;
};

export const validateName = (name, label = "Name") => {
    if (!name) return `${label} is required`;
    if (name.length < 2) return `${label} must be at least 2 characters`;
    if (name.length > 100) return `${label} must be under 100 characters`;
    // Add logic if strictly alphanumeric check is needed, but names can be flexible
    return null;
};

export const validateAmount = (amount, label = "Amount") => {
    if (amount === undefined || amount === null || amount === '') return `${label} is required`;
    const num = Number(amount);
    if (isNaN(num)) return `${label} must be a number`;
    if (num < 0) return `${label} cannot be negative`;
    return null;
};

export const validateInvoiceNumber = (number) => {
    if (!number) return "Invoice number is required";
    if (!PATTERNS.INVOICE_NUMBER.test(number)) return "Invalid Invoice Number (A-Z, 0-9, -, / only)";
    return null;
};
