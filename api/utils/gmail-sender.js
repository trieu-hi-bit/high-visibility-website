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
        subject: `${profile.fullName}, hier ist deine LinkedIn-Analyse 🎯`,
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
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');

    return `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Deine LinkedIn-Analyse</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background-color: #FAF7F2;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FAF7F2; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.08);">

                    <!-- Header with gradient -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #EDA436 0%, #D4922E 100%); padding: 40px 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #FFFFFF; font-size: 28px; font-weight: 600; font-family: 'Playfair Display', Georgia, serif;">
                                Deine LinkedIn-Analyse
                            </h1>
                            <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                                Personalisiert für ${profile.fullName}
                            </p>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.7; color: #1A1A1A;">
                                Hallo ${profile.fullName.split(' ')[0]},
                            </p>

                            <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.7; color: #1A1A1A;">
                                hier ist deine persönliche LinkedIn-Analyse. Ich habe dein Profil und deine letzten Posts analysiert, basierend auf den <strong>7 größten LinkedIn-Fehlern deutscher Unternehmer</strong>.
                            </p>

                            <div style="background: #F5F0E8; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
                                <p style="margin: 0; font-size: 16px; line-height: 1.8; color: #1A1A1A;">
                                    ${htmlAnalysis}
                                </p>
                            </div>

                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 40px 0 30px;">
                                <tr>
                                    <td align="center">
                                        <a href="https://calendly.com/trieu-hi-gethighvisibility/30min?utm_source=email&utm_medium=analysis&utm_campaign=lead_magnet"
                                           style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #EDA436 0%, #D4922E 100%); color: #FFFFFF; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 15px; letter-spacing: 0.5px;">
                                            📅 Jetzt kostenloses Erstgespräch buchen
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 0 0 10px; font-size: 16px; line-height: 1.7; color: #1A1A1A;">
                                Beste Grüße,<br>
                                <strong>Trieu Hi</strong>
                            </p>

                            <p style="margin: 0; font-size: 14px; color: #8A8A8A;">
                                HI.GH Visibility – LinkedIn Content & Positionierung
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background: #F5F0E8; padding: 30px 40px; text-align: center;">
                            <p style="margin: 0 0 15px; font-size: 14px; color: #4A4A4A;">
                                <a href="https://linkedin.com/in/trieu-hi-au-39a808228" style="color: #EDA436; text-decoration: none; margin: 0 10px;">LinkedIn</a>
                                <span style="color: #8A8A8A;">|</span>
                                <a href="https://high-visibility.vercel.app" style="color: #EDA436; text-decoration: none; margin: 0 10px;">Website</a>
                                <span style="color: #8A8A8A;">|</span>
                                <a href="https://high-visibility.vercel.app/datenschutz.html" style="color: #EDA436; text-decoration: none; margin: 0 10px;">Datenschutz</a>
                            </p>
                            <p style="margin: 0; font-size: 12px; color: #8A8A8A;">
                                © 2026 HI.GH Visibility | Trieu Hi Au | Düsseldorf, Deutschland
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
    return `
Hallo ${profile.fullName.split(' ')[0]},

hier ist deine persönliche LinkedIn-Analyse. Ich habe dein Profil und deine letzten Posts analysiert, basierend auf den 7 größten LinkedIn-Fehlern deutscher Unternehmer.

${analysisText}

---

📅 Jetzt kostenloses Erstgespräch buchen:
https://calendly.com/trieu-hi-gethighvisibility/30min?utm_source=email&utm_medium=analysis&utm_campaign=lead_magnet

Beste Grüße,
Trieu Hi

HI.GH Visibility – LinkedIn Content & Positionierung
LinkedIn: https://linkedin.com/in/trieu-hi-au-39a808228
Website: https://high-visibility.vercel.app

--
© 2026 HI.GH Visibility | Trieu Hi Au | Düsseldorf, Deutschland
    `.trim();
}

module.exports = {
    sendAnalysisEmail
};
