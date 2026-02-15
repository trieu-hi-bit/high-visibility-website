// api/utils/openrouter.js
const fetch = require('node-fetch');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

async function analyzeProfile(profile, posts) {
    const systemPrompt = `Du bist ein LinkedIn-Experte, der deutschen Unternehmern hilft, ihre LinkedIn-Präsenz zu optimieren.

Deine Aufgabe: Analysiere das LinkedIn-Profil und die Posts gegen das "7 größten LinkedIn-Fehler deutscher Unternehmer" Framework:

1. Keine klare Positionierung (ICP-Clarity)
2. Content klingt wie ChatGPT
3. Content ohne Audience-Strategie
4. 3.000+ Connections ohne System
5. Likes zählen, aber keine Conversations
6. Kein System vom Content zum Call
7. Posten ohne strategische Themen-Cluster

Schreibe eine 800-1000 Wort personalisierte Analyse in Trieu Hi's Stil:
- Direkt und ehrlich
- Keine generischen Phrasen
- Konkrete Beispiele aus dem Profil
- 3 klare Action Steps
- Motivierend, aber nicht übertrieben
- Schließe mit einem CTA zum Erstgespräch ab

Format: Nutze klare Absätze, **Fettdruck** für Kernaussagen, und nummerierte Listen.`;

    const userPrompt = buildUserPrompt(profile, posts);

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://high-visibility.vercel.app',
                'X-Title': 'HI.GH Visibility LinkedIn Analysis'
            },
            body: JSON.stringify({
                model: 'anthropic/claude-3.5-sonnet',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            throw new Error(`OpenRouter Error: ${response.status}`);
        }

        const data = await response.json();
        const analysis = data.choices[0].message.content;

        // Quality check
        if (analysis.length < 500) {
            throw new Error('Analysis too short');
        }

        return analysis;
    } catch (error) {
        console.error('Error analyzing profile:', error);
        throw new Error('KI-Analyse fehlgeschlagen. Bitte versuche es erneut.');
    }
}

function buildUserPrompt(profile, posts) {
    let prompt = `**PROFIL-DATEN:**

Name: ${profile.fullName}
Headline: ${profile.headline}
About: ${profile.about ? profile.about.substring(0, 500) : 'Nicht vorhanden'}
Connections: ${profile.connections}
Followers: ${profile.followers}
Branche: ${profile.industry || 'Nicht angegeben'}
`;

    if (posts && posts.length > 0) {
        prompt += `\n**LETZTE POSTS (${posts.length} Posts):**\n\n`;

        posts.slice(0, 10).forEach((post, i) => {
            const engagementRate = post.likes > 0
                ? ((post.likes + post.comments * 2) / 100).toFixed(1)
                : '0';

            prompt += `Post ${i + 1}:
Text: "${post.text.substring(0, 300)}${post.text.length > 300 ? '...' : ''}"
Engagement: ${post.likes} Likes, ${post.comments} Kommentare, ${post.shares} Shares
Rate: ~${engagementRate}%

`;
        });
    } else {
        prompt += `\n**POSTS:** Keine Posts verfügbar (möglicherweise privates Profil oder keine Posts vorhanden)\n`;
    }

    prompt += `\nAnalysiere dieses Profil gegen die 7 größten LinkedIn-Fehler. Identifiziere 2-4 konkrete Fehler mit Beispielen aus den Daten. Gib 3 klare Action Steps.`;

    return prompt;
}

module.exports = {
    analyzeProfile
};
