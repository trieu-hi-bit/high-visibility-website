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

        // 4. Determine delay based on environment
        const isDevelopment = process.env.NODE_ENV !== 'production';
        const delayMinutes = isDevelopment ? 0 : Math.floor(Math.random() * 2) + 3; // 0 for dev, 3-5 for production
        const delayMs = delayMinutes * 60 * 1000;

        // 5. Send immediate response
        res.status(200).json({
            success: true,
            message: isDevelopment
                ? 'Deine Analyse wird sofort erstellt und per E-Mail verschickt (Dev-Modus).'
                : 'Deine Analyse wird erstellt und in 3-5 Minuten per E-Mail verschickt.'
        });

        // 6. Process with delay
        if (delayMs > 0) {
            // Production: delay before processing
            setTimeout(() => {
                processAnalysis(email, username, linkedinUrl).catch(error => {
                    console.error('Error processing analysis:', error);
                });
            }, delayMs);
        } else {
            // Development: process immediately
            processAnalysis(email, username, linkedinUrl).catch(error => {
                console.error('Error processing analysis:', error);
            });
        }

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Ein interner Fehler ist aufgetreten. Bitte versuche es später erneut.'
        });
    }
};

async function processAnalysis(email, username, linkedinUrl) {
    try {
        console.log(`[${username}] Starting analysis...`);

        // Step 1: Enrich Profile (2-4s)
        console.log(`[${username}] Enriching profile...`);
        const profile = await enrichProfile(username);

        // Step 2: Fetch Posts (2-4s)
        console.log(`[${username}] Fetching posts...`);
        const posts = await fetchPosts(username);

        // Step 3: AI Analysis (5-8s)
        console.log(`[${username}] Running AI analysis...`);
        const analysis = await analyzeProfile(profile, posts);

        // Step 4: Send Email (1-2s)
        console.log(`[${username}] Sending email to ${email}...`);
        await sendAnalysisEmail(email, profile, analysis);

        console.log(`[${username}] Analysis completed successfully!`);
    } catch (error) {
        console.error(`[${username}] Error:`, error.message);
        // TODO: Send error notification email or log to monitoring service
        throw error;
    }
}
