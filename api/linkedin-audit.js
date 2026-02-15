// api/linkedin-audit.js
const { validateInput, sanitizeEmail, extractLinkedInUsername } = require('./utils/validators');
const { enrichProfile, fetchPosts } = require('./utils/rapidapi');
const { analyzeProfile } = require('./utils/openrouter');
const { sendAnalysisEmail } = require('./utils/gmail-sender');

// Rate limiting (in-memory, resets on cold start)
const submissionTracker = new Map();
const MAX_SUBMISSIONS_PER_HOUR = 3;

module.exports = async (req, res) => {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production'
        ? 'https://high-visibility.vercel.app'
        : '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        const { email, linkedinUrl, consent, timestamp } = req.body;

        // 1. Validation
        const validation = validateInput(email, linkedinUrl, consent);
        if (!validation.valid) {
            return res.status(400).json({ success: false, message: validation.error });
        }

        // 2. Rate Limiting
        const sanitizedEmail = sanitizeEmail(email);
        const now = Date.now();
        const userSubmissions = submissionTracker.get(sanitizedEmail) || [];
        const recentSubmissions = userSubmissions.filter(time => now - time < 3600000); // 1 hour

        if (recentSubmissions.length >= MAX_SUBMISSIONS_PER_HOUR) {
            return res.status(429).json({
                success: false,
                message: 'Zu viele Anfragen. Bitte versuche es in einer Stunde erneut.'
            });
        }

        // 3. Extract LinkedIn username
        const username = extractLinkedInUsername(linkedinUrl);
        if (!username) {
            return res.status(400).json({
                success: false,
                message: 'Ungültige LinkedIn-URL. Bitte verwende das Format: https://linkedin.com/in/dein-name'
            });
        }

        // Track submission
        submissionTracker.set(sanitizedEmail, [...recentSubmissions, now]);

        // 4. Process analysis SYNCHRONOUSLY before sending response
        //    (Vercel kills serverless functions after response is sent)
        await processAnalysis(email, username, linkedinUrl);

        // 5. Send success response AFTER processing completes
        return res.status(200).json({
            success: true,
            message: 'Deine Analyse wurde erstellt und per E-Mail verschickt! Schau in dein Postfach.'
        });

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Ein Fehler ist aufgetreten. Bitte versuche es in ein paar Minuten erneut.'
        });
    }
};

async function processAnalysis(email, username, linkedinUrl) {
    try {
        console.log(`[${username}] Starting analysis...`);

        // Step 1: Fetch profile and posts IN PARALLEL (saves 2-4s)
        console.log(`[${username}] Fetching profile and posts in parallel...`);
        const [profileResult, postsResult] = await Promise.allSettled([
            enrichProfile(username),
            fetchPosts(username)
        ]);

        // Profile is required - if it fails, abort
        if (profileResult.status === 'rejected') {
            throw new Error(profileResult.reason.message);
        }
        const profile = profileResult.value;

        // Posts are optional - use empty array if failed
        const posts = postsResult.status === 'fulfilled' ? postsResult.value : [];
        if (postsResult.status === 'rejected') {
            console.warn(`[${username}] Posts fetch failed (continuing without posts): ${postsResult.reason.message}`);
        }

        // Step 2: AI Analysis (5-15s)
        console.log(`[${username}] Running AI analysis...`);
        const analysis = await analyzeProfile(profile, posts);

        // Step 3: Send Email (1-2s)
        console.log(`[${username}] Sending email to ${email}...`);
        await sendAnalysisEmail(email, profile, analysis);

        console.log(`[${username}] Analysis completed successfully!`);
    } catch (error) {
        console.error(`[${username}] Error:`, error.message);
        throw error;
    }
}
