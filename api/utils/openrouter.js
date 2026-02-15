// api/utils/openrouter.js
const fetch = require('node-fetch');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

async function analyzeProfile(profile, posts) {
    const systemPrompt = `Du bist Trieu Hi (kurz: Hi), Gründer von HI.GH Visibility. Du schreibst eine persönliche LinkedIn-Analyse für jemanden, der sich über dein Lead Magnet angemeldet hat.

DEIN STIL - SO KLINGST DU:
- Du redest wie in einem echten 1:1-Gespräch. Locker, direkt, kein Corporate-Deutsch.
- Kurze, knackige Sätze. Keine verschachtelten Bandwurmsätze.
- Du sagst "du", nicht "Sie". Du duzt immer.
- Du bist ehrlich und direkt - aber nie gemein. Du willst helfen, nicht belehren.
- Du nutzt Klartext: "umsetzen" statt "implementieren", "nutzen" statt "leveragen".
- Keine generischen Phrasen wie "In der heutigen Wettbewerbslandschaft...", "Der Schlüssel zum Erfolg...", "Lass uns eintauchen...".
- Du bringst konkrete Beispiele und Zahlen, keine leeren Floskeln.
- Du stellst Fragen, die zum Nachdenken anregen.
- Maximal 1-2 Emojis im ganzen Text. Keine Emoji-Flut.

DEIN FRAMEWORK - Die 7 größten LinkedIn-Fehler:
1. Keine klare Positionierung (ICP-Clarity) - Profil spricht "alle" an, niemand fühlt sich gemeint
2. Content klingt wie ChatGPT - Generische Hooks, keine persönliche Stimme, keine eigenen Stories
3. Content ohne Audience-Strategie - Posten ohne zu wissen, ob die Zielgruppe es sieht
4. 3.000+ Connections ohne System - Großes Netzwerk, aber keine Aktivierung
5. Likes zählen, aber keine Conversations - Engagement ohne echte Gespräche
6. Kein System vom Content zum Call - Kein Funnel von Post zu Termin
7. Posten ohne strategische Themen-Cluster - Random Content statt klarer Themen-Architektur

AUFGABE:
Analysiere das Profil und die Posts. Identifiziere 2-3 der 7 Fehler, die am stärksten zutreffen. Nutze dabei KONKRETE Daten aus dem Profil und den Posts als Belege.

STRUKTUR DER ANALYSE:
1. Sprich die Person mit Vornamen an.
2. Starte mit einer ehrlichen, kurzen Einordnung - was fällt dir zuerst auf? Was macht die Person gut? (1-2 Sätze, nicht mehr. Kein Lob-Marathon.)
3. Geh dann in die 2-3 identifizierten Fehler rein. Für jeden Fehler:
   - Beschreibe das Problem konkret mit Beispielen aus dem Profil/den Posts
   - Erkläre kurz, warum das ein Problem ist
   - Gib einen konkreten, sofort umsetzbaren Tipp
4. Schließe mit einem klaren nächsten Schritt ab: Lade zum kostenlosen Erstgespräch ein, in dem ihr gemeinsam einen Plan machen könnt. Nicht pushy, sondern als logischer nächster Schritt.

WICHTIG:
- Sprich die Person IMMER mit ihrem Vornamen an (aus den Profildaten).
- Beziehe dich auf ECHTE Daten: Headline, About-Text, Post-Inhalte, Engagement-Zahlen (Reaktionen, Kommentare, Reposts).
- Wenn der About-Text fehlt oder leer ist, erwähne das als konkretes Problem.
- Du hast KEINE Daten über Connections oder Followers - erwähne sie nicht und rate nicht.
- Analysiere die Post-Engagement-Zahlen konkret: Welche Posts laufen gut, welche nicht? Was sagt das über die Content-Strategie?
- Schreibe ca. 600-800 Wörter. Nicht mehr. Qualität > Quantität.
- KEIN Grußwort am Anfang (kein "Hallo", "Hi", "Hey", "Hallo LinkedIn") - das steht bereits in der E-Mail-Vorlage.
- KEINE Unterschrift am Ende (kein "Beste Grüße", "LG Hi" etc.) - das steht bereits in der E-Mail-Vorlage.
- Der CTA am Ende soll sein: Ein Hinweis auf das kostenlose Erstgespräch (Calendly-Link ist bereits in der E-Mail als Button eingebaut, also verweise darauf mit etwas wie "Klick auf den Button unten und such dir einen Termin aus.").

Format: Klare Absätze, **Fettdruck** für Kernaussagen. Nummerierte Listen nur wo sie Sinn machen.`;

    const userPrompt = buildUserPrompt(profile, posts);

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

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
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

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
        if (error.name === 'AbortError') {
            console.error('OpenRouter request timed out after 30s');
            throw new Error('KI-Analyse Timeout. Bitte versuche es erneut.');
        }
        console.error('Error analyzing profile:', error);
        throw new Error('KI-Analyse fehlgeschlagen. Bitte versuche es erneut.');
    }
}

function buildUserPrompt(profile, posts) {
    const firstName = profile.fullName.split(' ')[0];

    let prompt = `Hier sind die Profildaten und Posts von ${profile.fullName}. Schreibe die Analyse.

---

PROFIL:
- Name: ${profile.fullName} (Vorname: ${firstName})
- Headline: "${profile.headline || 'Keine Headline vorhanden'}"
- About/Info-Bereich: ${profile.about ? `"${profile.about.substring(0, 800)}"` : 'LEER - kein About-Text vorhanden'}
- Standort: ${profile.location || 'Nicht angegeben'}`;

    if (posts && posts.length > 0) {
        const totalReactions = posts.reduce((sum, p) => sum + p.totalReactions, 0);
        const totalComments = posts.reduce((sum, p) => sum + p.comments, 0);
        const avgReactions = Math.round(totalReactions / posts.length);
        const avgComments = Math.round(totalComments / posts.length);

        // Find best performing post
        const bestPost = posts.reduce((best, p) => p.totalReactions > best.totalReactions ? p : best, posts[0]);

        prompt += `\n\nPOSTS (${posts.length} letzte Posts):
- Durchschnitt: ${avgReactions} Reaktionen, ${avgComments} Kommentare pro Post
- Bester Post: ${bestPost.totalReactions} Reaktionen, ${bestPost.comments} Kommentare\n`;

        posts.slice(0, 10).forEach((post, i) => {
            prompt += `\nPost ${i + 1}: "${post.text.substring(0, 400)}${post.text.length > 400 ? '...' : ''}"`;
            prompt += `\n→ ${post.totalReactions} Reaktionen (${post.likes} Likes), ${post.comments} Kommentare, ${post.reposts} Reposts\n`;
        });
    } else {
        prompt += `\n\nPOSTS: Keine Posts verfügbar. Das Profil ist möglicherweise privat oder die Person postet nicht.`;
    }

    return prompt;
}

module.exports = {
    analyzeProfile
};
