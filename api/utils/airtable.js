// api/utils/airtable.js
const fetch = require('node-fetch');

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = 'appJ1jjVSGoVjAVdf';
const AIRTABLE_TABLE_ID = 'tblFv6KbMA2mIAI3U';
const AIRTABLE_API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`;

if (!AIRTABLE_API_KEY) {
    console.warn('[Airtable] AIRTABLE_API_KEY not set - submissions will not be tracked');
}

// 5s timeout - Airtable calls are fast, must not block the main flow
async function fetchWithTimeout(url, options, timeout = 5000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Airtable request timeout');
        }
        throw error;
    }
}

/**
 * Create a new submission record in Airtable (status: pending)
 * Returns the record ID (string) or null on failure.
 * NEVER throws - all errors are caught internally.
 */
async function createSubmissionRecord(email, username, linkedinUrl) {
    if (!AIRTABLE_API_KEY) {
        console.warn('[Airtable] Skipping create - no API key');
        return null;
    }

    try {
        console.log(`[Airtable] Creating submission record for: ${email}`);

        const response = await fetchWithTimeout(AIRTABLE_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: {
                    'Email': email,
                    'LinkedIn Username': username,
                    'LinkedIn URL': linkedinUrl,
                    'Status': 'pending'
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Airtable] Create failed: HTTP ${response.status} - ${errorText.substring(0, 200)}`);
            return null;
        }

        const data = await response.json();
        console.log(`[Airtable] Record created: ${data.id}`);
        return data.id;

    } catch (error) {
        console.error(`[Airtable] Create error: ${error.message}`);
        return null;
    }
}

/**
 * Update an existing submission record in Airtable.
 * Accepts any fields object. NEVER throws.
 */
async function updateSubmissionRecord(recordId, fields) {
    if (!AIRTABLE_API_KEY) {
        console.warn('[Airtable] Skipping update - no API key');
        return null;
    }

    if (!recordId) {
        console.warn('[Airtable] Skipping update - no record ID');
        return null;
    }

    try {
        console.log(`[Airtable] Updating record ${recordId}: Status=${fields.Status || 'n/a'}`);

        const response = await fetchWithTimeout(`${AIRTABLE_API_URL}/${recordId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fields })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Airtable] Update failed: HTTP ${response.status} - ${errorText.substring(0, 200)}`);
            return null;
        }

        const data = await response.json();
        console.log(`[Airtable] Record updated: ${data.id}`);
        return data.id;

    } catch (error) {
        console.error(`[Airtable] Update error: ${error.message}`);
        return null;
    }
}

module.exports = {
    createSubmissionRecord,
    updateSubmissionRecord
};
