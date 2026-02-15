// api/utils/validators.js

function validateInput(email, linkedinUrl, consent) {
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        return { valid: false, error: 'Ungültige E-Mail-Adresse' };
    }

    // LinkedIn URL validation
    const linkedinRegex = /^https?:\/\/(www\.)?linkedin\.com\/in\/.+/;
    if (!linkedinUrl || !linkedinRegex.test(linkedinUrl)) {
        return { valid: false, error: 'Ungültige LinkedIn-URL' };
    }

    // Consent validation
    if (!consent || consent !== true) {
        return { valid: false, error: 'Bitte akzeptiere die Datenschutzerklärung' };
    }

    return { valid: true };
}

function sanitizeEmail(email) {
    return email.trim().toLowerCase().replace(/[<>]/g, '');
}

function sanitizeText(text) {
    if (!text) return '';
    return text.trim().replace(/[<>]/g, '').substring(0, 5000);
}

function extractLinkedInUsername(url) {
    const match = url.match(/linkedin\.com\/in\/([^/?#]+)/);
    return match ? match[1] : null;
}

module.exports = {
    validateInput,
    sanitizeEmail,
    sanitizeText,
    extractLinkedInUsername
};
