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

async function enrichProfile(username) {
    // TEMPORARY: Use mock data to test OpenRouter + Gmail workflow
    console.log(`[RapidAPI] Using MOCK data for testing (RapidAPI not responding)`);

    return {
        fullName: username.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        headline: 'LinkedIn Consultant & Content Strategist',
        about: 'Helping B2B companies build authentic LinkedIn presence.',
        connections: 500,
        followers: 1200,
        industry: 'Marketing & Advertising',
        location: 'Germany',
        profileUrl: `https://linkedin.com/in/${username}`
    };

    /* ORIGINAL CODE - DISABLED FOR TESTING
    const url = `https://${RAPIDAPI_HOST}/?username=${username}`;

    const options = {
        method: 'GET',
        headers: {
            'x-rapidapi-host': RAPIDAPI_HOST,
            'x-rapidapi-key': RAPIDAPI_KEY
        }
    };

    try {
        console.log(`[RapidAPI] Fetching profile for: ${username}`);
        console.log(`[RapidAPI] URL: ${url}`);

        const response = await fetch(url, options);

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
        throw new Error('Profil konnte nicht abgerufen werden. Bitte überprüfe die URL.');
    }
    */
}

async function fetchPosts(username) {
    // TEMPORARY: Use mock posts for testing
    console.log(`[RapidAPI] Using MOCK posts for testing`);

    return [
        {
            text: 'Example LinkedIn post about building authentic content that resonates with your audience.',
            likes: 85,
            comments: 12,
            shares: 3,
            date: new Date().toISOString(),
            url: ''
        },
        {
            text: 'Another post discussing LinkedIn strategy and personal branding for B2B professionals.',
            likes: 120,
            comments: 18,
            shares: 5,
            date: new Date(Date.now() - 86400000).toISOString(),
            url: ''
        }
    ];

    /* ORIGINAL CODE - DISABLED FOR TESTING
    const url = `https://${RAPIDAPI_HOST}/get-profile-posts?start=0&username=${username}`;

    const options = {
        method: 'GET',
        headers: {
            'x-rapidapi-host': RAPIDAPI_HOST,
            'x-rapidapi-key': RAPIDAPI_KEY
        }
    };

    try {
        console.log(`[RapidAPI] Fetching posts for: ${username}`);

        const response = await fetch(url, options);

        if (!response.ok) {
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
        // Don't fail if posts can't be fetched - continue with profile only
        return [];
    }
    */
}

module.exports = {
    enrichProfile,
    fetchPosts
};
