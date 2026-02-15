// api/utils/gmail-sender.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // STARTTLS
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});

async function sendAnalysisEmail(toEmail, profile, analysisText) {
    const htmlContent = generateEmailHTML(profile, analysisText);
    const textContent = generateEmailText(profile, analysisText);

    const mailOptions = {
        from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
        to: toEmail,
        replyTo: process.env.REPLY_TO,
        subject: `${profile.fullName.split(' ')[0]}, deine LinkedIn-Analyse ist da`,
        text: textContent,
        html: htmlContent
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('E-Mail konnte nicht gesendet werden');
    }
}

function generateEmailHTML(profile, analysisText) {
    // Convert markdown-style formatting to HTML
    const htmlAnalysis = analysisText
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n\n/g, '</p><p style="margin: 0 0 16px; font-size: 16px; line-height: 1.8; color: #1A1A1A;">')
        .replace(/\n/g, '<br>');

    const firstName = profile.fullName.split(' ')[0];

    return `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Deine LinkedIn-Analyse</title>
    <style>
        @media only screen and (max-width: 620px) {
            .email-container { width: 100% !important; }
            .content-padding { padding: 28px 20px !important; }
            .header-padding { padding: 32px 20px 24px !important; }
            .footer-padding { padding: 24px 20px !important; }
            .analysis-box { padding: 20px 16px !important; }
            .cta-button { padding: 16px 32px !important; font-size: 14px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #FAF7F2; -webkit-text-size-adjust: 100%;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FAF7F2; padding: 32px 16px;">
        <tr>
            <td align="center">
                <table class="email-container" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">

                    <!-- Header -->
                    <tr>
                        <td class="header-padding" style="background: linear-gradient(135deg, #EDA436 0%, #D4922E 100%); padding: 36px 32px 28px; text-align: center;">
                            <h1 style="margin: 0; color: #FFFFFF; font-size: 24px; font-weight: 600; font-family: Georgia, serif;">
                                Deine LinkedIn-Analyse
                            </h1>
                            <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 15px;">
                                Persönlich für dich, ${firstName}
                            </p>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td class="content-padding" style="padding: 32px 28px;">
                            <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.8; color: #1A1A1A;">
                                Hey ${firstName},
                            </p>

                            <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.8; color: #1A1A1A;">
                                ich habe mir dein LinkedIn-Profil und deine letzten Posts angeschaut. Hier ist meine ehrliche Einschätzung - basierend auf den <strong>7 häufigsten LinkedIn-Fehlern</strong>, die ich bei deutschen Unternehmern sehe.
                            </p>

                            <div class="analysis-box" style="background: #F9F6F1; padding: 28px 24px; border-radius: 12px; border-left: 4px solid #EDA436; margin-bottom: 28px;">
                                <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.8; color: #1A1A1A;">
                                    ${htmlAnalysis}
                                </p>
                            </div>

                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0 28px;">
                                <tr>
                                    <td align="center">
                                        <a href="https://calendly.com/trieu-hi-gethighvisibility/30min?utm_source=email&utm_medium=analysis&utm_campaign=lead_magnet"
                                           class="cta-button"
                                           style="display: inline-block; padding: 16px 36px; background: linear-gradient(135deg, #EDA436 0%, #D4922E 100%); color: #FFFFFF; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 15px;">
                                            Kostenloses Erstgespräch buchen
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 0 0 6px; font-size: 16px; line-height: 1.7; color: #1A1A1A;">
                                Talk soon,<br>
                                <strong>Hi</strong>
                            </p>

                            <p style="margin: 0; font-size: 13px; color: #999;">
                                HI.GH Visibility - Content & Positionierung für LinkedIn
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td class="footer-padding" style="background: #F5F0E8; padding: 24px 28px; text-align: center;">
                            <p style="margin: 0 0 12px; font-size: 13px; color: #4A4A4A;">
                                <a href="https://linkedin.com/in/trieu-hi-au-39a808228" style="color: #EDA436; text-decoration: none; margin: 0 8px;">LinkedIn</a>
                                <span style="color: #CCC;">|</span>
                                <a href="https://high-visibility.vercel.app" style="color: #EDA436; text-decoration: none; margin: 0 8px;">Website</a>
                                <span style="color: #CCC;">|</span>
                                <a href="https://high-visibility.vercel.app/datenschutz.html" style="color: #EDA436; text-decoration: none; margin: 0 8px;">Datenschutz</a>
                            </p>
                            <p style="margin: 0; font-size: 11px; color: #999;">
                                © 2026 HI.GH Visibility | Trieu Hi Au | Düsseldorf
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
}

function generateEmailText(profile, analysisText) {
    const firstName = profile.fullName.split(' ')[0];
    return `
Hey ${firstName},

ich habe mir dein LinkedIn-Profil und deine letzten Posts angeschaut. Hier ist meine ehrliche Einschätzung - basierend auf den 7 häufigsten LinkedIn-Fehlern, die ich bei deutschen Unternehmern sehe.

${analysisText}

---

Kostenloses Erstgespräch buchen:
https://calendly.com/trieu-hi-gethighvisibility/30min?utm_source=email&utm_medium=analysis&utm_campaign=lead_magnet

Talk soon,
Hi

HI.GH Visibility - Content & Positionierung für LinkedIn
LinkedIn: https://linkedin.com/in/trieu-hi-au-39a808228
Website: https://high-visibility.vercel.app

--
© 2026 HI.GH Visibility | Trieu Hi Au | Düsseldorf
    `.trim();
}

/**
 * Send a short notification email to the owner (Hi) about a new completed analysis.
 * NEVER throws - all errors are caught internally.
 */
async function sendOwnerNotification(profile, leadEmail, postsCount) {
    try {
        const fullName = profile.fullName || 'Unbekannt';
        const headline = profile.headline || 'Keine Headline';
        const profileUrl = profile.profileUrl || '';

        const textContent = [
            `Neuer Lead-Magnet Abschluss:`,
            ``,
            `Name: ${fullName}`,
            `Headline: ${headline}`,
            `LinkedIn: ${profileUrl}`,
            `E-Mail: ${leadEmail}`,
            `Posts analysiert: ${postsCount}`,
            ``,
            `Analyse wurde erfolgreich per E-Mail versendet.`
        ].join('\n');

        const mailOptions = {
            from: `"HI.GH Visibility Bot" <${process.env.FROM_EMAIL}>`,
            to: process.env.REPLY_TO,
            subject: `Neuer Lead: ${fullName}`,
            text: textContent
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('[Notification] Owner notification sent:', info.messageId);
        return { success: true, messageId: info.messageId };

    } catch (error) {
        console.error('[Notification] Failed to send owner notification:', error.message);
        return { success: false };
    }
}

module.exports = {
    sendAnalysisEmail,
    sendOwnerNotification
};
