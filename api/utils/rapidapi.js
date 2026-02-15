// api/utils/rapidapi.js
const fetch = require('node-fetch');
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;

// Debug: Check if env vars are loaded
if (!RAPIDAPI_KEY || !RAPIDAPI_HOST) {
    console.error('[RapidAPI] MISSING ENV VARS!');
    console.error(`RAPIDAPI_KEY: ${RAPIDAPI_KEY ? 'SET' : 'MISSING'}`);
    console.error(`RAPIDAPI_HOST: ${RAPIDAPI_HOST ? 'SET' : 'MISSING'}`);
}

// AbortController-based timeout - actually aborts the connection on timeout
async function fetchWithTimeout(url, options, timeout = 15000) {
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
            throw new Error('Request timeout');
        }
        throw error;
    }
}

// Retry wrapper for intermittent RapidAPI failures (Bad Gateway, timeouts)
async function fetchWithRetry(url, options, { timeout = 15000, maxRetries = 2, label = 'RapidAPI' } = {}) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetchWithTimeout(url, options, timeout);

            // Read body once
            const text = await response.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch {
                console.error(`[${label}] Invalid JSON response (attempt ${attempt}): ${text.substring(0, 200)}`);
                throw new Error(`${label}: Invalid JSON response`);
            }

            // Check HTTP status
            if (!response.ok) {
                console.error(`[${label}] HTTP ${response.status} (attempt ${attempt}): ${text.substring(0, 200)}`);
                throw new Error(`${label} HTTP ${response.status}: ${text.substring(0, 200)}`);
            }

            // Check for API-level errors (HTTP 200 but success: false)
            if (data.success === false) {
                const msg = data.message || 'Unknown error';
                console.error(`[${label}] API success:false (attempt ${attempt}): ${msg}`);
                // Bad Gateway is intermittent - retry
                if (msg.toLowerCase().includes('bad gateway') || msg.toLowerCase().includes('timeout')) {
                    throw new Error(`${label} transient error: ${msg}`);
                }
                // Non-transient errors (e.g. "Profile not found") - don't retry
                throw { permanent: true, message: `${label}: ${msg}` };
            }

            console.log(`[${label}] Success on attempt ${attempt}`);
            return data;

        } catch (error) {
            // Permanent errors - don't retry
            if (error.permanent) {
                throw new Error(error.message);
            }

            lastError = error;
            console.warn(`[${label}] Attempt ${attempt}/${maxRetries} failed: ${error.message}`);

            // Wait before retry (1s, then 2s)
            if (attempt < maxRetries) {
                const delay = attempt * 1000;
                console.log(`[${label}] Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError;
}

// Clean username: remove whitespace, trailing slashes, URL encoding artifacts
function cleanUsername(username) {
    return username
        .trim()
        .replace(/\/+$/, '')       // trailing slashes
        .replace(/^\/+/, '')       // leading slashes
        .replace(/%20/g, '')       // URL-encoded spaces
        .replace(/\s+/g, '')       // whitespace
        .toLowerCase();
}

async function enrichProfile(username) {
    const cleaned = cleanUsername(username);
    const url = `https://${RAPIDAPI_HOST}/?username=${encodeURIComponent(cleaned)}`;

    try {
        console.log(`[RapidAPI] Fetching profile for: "${cleaned}" (original: "${username}")`);

        const data = await fetchWithRetry(url, {
            method: 'GET',
            headers: {
                'x-rapidapi-host': RAPIDAPI_HOST,
                'x-rapidapi-key': RAPIDAPI_KEY,
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0'
            }
        }, { timeout: 15000, maxRetries: 2, label: 'RapidAPI Profile' });

        // API returns firstName/lastName separately, no fullName field
        const fullName = data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'LinkedIn User';
        console.log(`[RapidAPI] Profile data received for: ${fullName}`);

        return {
            fullName,
            headline: data.headline || '',
            about: data.summary || data.about || '',
            location: data.geo ? data.geo.full || data.geo.city || '' : (data.location || ''),
            profileUrl: data.username ? `https://linkedin.com/in/${data.username}` : '',
            isCreator: data.isCreator || false,
            isPremium: data.isPremium || false
        };
    } catch (error) {
        console.error('[RapidAPI] Profile fetch failed after all retries:', error.message);

        if (error.message === 'Request timeout') {
            throw new Error('RapidAPI timeout - bitte versuche es erneut');
        }

        throw new Error('Profil konnte nicht abgerufen werden. Bitte überprüfe die URL.');
    }
}

async function fetchPosts(username) {
    const cleaned = cleanUsername(username);
    const url = `https://${RAPIDAPI_HOST}/get-profile-posts?start=0&username=${encodeURIComponent(cleaned)}`;

    try {
        console.log(`[RapidAPI] Fetching posts for: "${cleaned}"`);

        const data = await fetchWithRetry(url, {
            method: 'GET',
            headers: {
                'x-rapidapi-host': RAPIDAPI_HOST,
                'x-rapidapi-key': RAPIDAPI_KEY,
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0'
            }
        }, { timeout: 15000, maxRetries: 2, label: 'RapidAPI Posts' });

        const posts = data.data || data.posts || [];

        console.log(`[RapidAPI] Fetched ${posts.length} posts for "${cleaned}"`);

        if (posts.length === 0) {
            console.warn(`[RapidAPI] Zero posts returned for "${cleaned}" - profile may be private or user doesn't post`);
        }

        // Extract author info from first post (fallback if profile API fails)
        const author = posts[0]?.author || null;

        // Extract last 15 posts with engagement data
        // API fields: totalReactionCount, likeCount, commentsCount, repostsCount, postedDate
        const mappedPosts = posts.slice(0, 15).map(post => ({
            text: (post.text || '').substring(0, 500),
            totalReactions: post.totalReactionCount || 0,
            likes: post.likeCount || 0,
            comments: post.commentsCount || 0,
            reposts: post.repostsCount || 0,
            date: post.postedDate || post.postedAt || '',
            url: post.postUrl || ''
        })).filter(post => post.text.length > 20);

        console.log(`[RapidAPI] ${mappedPosts.length} posts after filtering (min 20 chars)`);

        return { posts: mappedPosts, author };
    } catch (error) {
        console.error('[RapidAPI] Posts fetch failed after all retries:', error.message);

        if (error.message === 'Request timeout') {
            console.error('[RapidAPI] Posts request timed out');
        }

        // Don't fail if posts can't be fetched - continue with profile only
        return { posts: [], author: null };
    }
}

module.exports = {
    enrichProfile,
    fetchPosts
};
