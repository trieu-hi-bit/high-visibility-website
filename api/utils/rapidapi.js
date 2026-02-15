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

// Helper function to add timeout to fetch
function fetchWithTimeout(url, options, timeout = 15000) {
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), timeout)
        )
    ]);
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
            },
            timeout: 15000
        }, 15000);

        console.log(`[RapidAPI] Response status: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[RapidAPI] Error response: ${errorText}`);
            throw new Error(`RapidAPI Profile Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log(`[RapidAPI] Profile data received for: ${data.fullName || data.name}`);

        return {
            fullName: data.fullName || data.name || 'LinkedIn User',
            headline: data.headline || '',
            about: data.about || data.summary || '',
            connections: data.connectionsCount || data.connections || 0,
            followers: data.followersCount || data.followers || 0,
            industry: data.industry || '',
            location: data.location || '',
            profileUrl: data.publicIdentifier ? `https://linkedin.com/in/${data.publicIdentifier}` : ''
        };
    } catch (error) {
        console.error('Error enriching profile:', error.message);
        console.error('Error stack:', error.stack);

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
            },
            timeout: 15000
        }, 15000);

        if (!response.ok) {
            console.error(`[RapidAPI] Posts error: ${response.status}`);
            throw new Error(`RapidAPI Posts Error: ${response.status}`);
        }

        const data = await response.json();
        const posts = data.data || data.posts || [];

        console.log(`[RapidAPI] Fetched ${posts.length} posts`);

        // Extract last 10-15 posts with engagement data
        return posts.slice(0, 15).map(post => ({
            text: (post.text || post.commentary || '').substring(0, 500),
            likes: post.numLikes || post.likesCount || 0,
            comments: post.numComments || post.commentsCount || 0,
            shares: post.numShares || post.sharesCount || 0,
            date: post.postedAt || post.created || '',
            url: post.url || ''
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
