/**
 * Convert a number to words (Indian Numbering System / International mix based on requirement)
 * For GST invoices in India, Indian Numbering System (Lakhs/Crores) is standard.
 */

const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const convertLessThanOneThousand = (n) => {
    if (n === 0) {
        return '';
    }

    if (n < 10) {
        return units[n];
    }

    if (n < 20) {
        return teens[n - 10];
    }

    if (n < 100) {
        return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + units[n % 10] : '');
    }

    return units[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertLessThanOneThousand(n % 100) : '');
};

export const numberToWords = (n) => {
    if (n === 0) return 'Zero';

    let num = parseInt(n, 10);
    if (isNaN(num)) return '';

    const parts = [];

    // Crores
    if (num >= 10000000) {
        parts.push(convertLessThanOneThousand(Math.floor(num / 10000000)) + ' Crore');
        num %= 10000000;
    }

    // Lakhs
    if (num >= 100000) {
        parts.push(convertLessThanOneThousand(Math.floor(num / 100000)) + ' Lakh');
        num %= 100000;
    }

    // Thousands
    if (num >= 1000) {
        parts.push(convertLessThanOneThousand(Math.floor(num / 1000)) + ' Thousand');
        num %= 1000;
    }

    // Remaining
    if (num > 0) {
        parts.push(convertLessThanOneThousand(num));
    }

    return parts.join(' ');
};

export const amountToWords = (amount, currency = 'Rupees') => {
    const mainAmount = Math.floor(amount);
    const paise = Math.round((amount - mainAmount) * 100);

    let words = numberToWords(mainAmount) + ' ' + currency;

    if (paise > 0) {
        words += ' and ' + numberToWords(paise) + ' Paise';
    }

    return words + ' Only';
};
