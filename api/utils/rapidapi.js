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

async function enrichProfile(username) {
    const url = `https://${RAPIDAPI_HOST}/?username=${username}`;

    try {
        console.log(`[RapidAPI] Fetching profile for: ${username}`);
        console.log(`[RapidAPI] URL: ${url}`);
        console.log(`[RapidAPI] Key: ${RAPIDAPI_KEY ? 'SET (length: ' + RAPIDAPI_KEY.length + ')' : 'MISSING'}`);

        const response = await fetchWithTimeout(url, {
            method: 'GET',
            headers: {
                'x-rapidapi-host': RAPIDAPI_HOST,
                'x-rapidapi-key': RAPIDAPI_KEY,
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0'
            }
        }, 15000);

        console.log(`[RapidAPI] Response status: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[RapidAPI] Error response: ${errorText}`);
            throw new Error(`RapidAPI Profile Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

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
        console.error('Error enriching profile:', error.message);

        if (error.message === 'Request timeout') {
            console.error('[RapidAPI] Request timed out after 15 seconds');
            throw new Error('RapidAPI timeout - bitte versuche es erneut');
        }

        throw new Error('Profil konnte nicht abgerufen werden. Bitte überprüfe die URL.');
    }
}

async function fetchPosts(username) {
    const url = `https://${RAPIDAPI_HOST}/get-profile-posts?start=0&username=${username}`;

    try {
        console.log(`[RapidAPI] Fetching posts for: ${username}`);

        const response = await fetchWithTimeout(url, {
            method: 'GET',
            headers: {
                'x-rapidapi-host': RAPIDAPI_HOST,
                'x-rapidapi-key': RAPIDAPI_KEY,
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0'
            }
        }, 15000);

        if (!response.ok) {
            console.error(`[RapidAPI] Posts error: ${response.status}`);
            throw new Error(`RapidAPI Posts Error: ${response.status}`);
        }

        const data = await response.json();
        const posts = data.data || data.posts || [];

        console.log(`[RapidAPI] Fetched ${posts.length} posts`);

        // Extract last 15 posts with engagement data
        // API fields: totalReactionCount, likeCount, commentsCount, repostsCount, postedDate
        return posts.slice(0, 15).map(post => ({
            text: (post.text || '').substring(0, 500),
            totalReactions: post.totalReactionCount || 0,
            likes: post.likeCount || 0,
            comments: post.commentsCount || 0,
            reposts: post.repostsCount || 0,
            date: post.postedDate || post.postedAt || '',
            url: post.postUrl || ''
        })).filter(post => post.text.length > 20); // Filter empty posts
    } catch (error) {
        console.error('Error fetching posts:', error.message);

        if (error.message === 'Request timeout') {
            console.error('[RapidAPI] Posts request timed out after 15 seconds');
        }

        // Don't fail if posts can't be fetched - continue with profile only
        return [];
    }
}

module.exports = {
    enrichProfile,
    fetchPosts
};
