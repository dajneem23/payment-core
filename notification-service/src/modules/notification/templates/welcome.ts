/**
 * New-user welcome / greeting email template.
 *
 * Sent immediately after registration. Warm, minimal, and brand-forward.
 */

export interface WelcomeTemplateVars {
    customerName: string;
    supportEmail: string;
}

export function renderWelcomeEmail(vars: WelcomeTemplateVars): {
    html: string;
    text: string;
} {
    const text = [
        `Hi ${vars.customerName},`,
        '',
        'Welcome to VietPay — your account is ready.',
        '',
        'You can now:',
        '• Send and receive money instantly',
        '• Track every transfer in real time',
        '• Secure your account with two-factor authentication',
        '',
        'If you have any questions, just reply to this email or contact',
        `${vars.supportEmail}.`,
        '',
        '— The VietPay Team',
    ].join('\n');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to VietPay</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#1d4ed8;padding:36px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Welcome to VietPay</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:18px;color:#18181b;font-weight:600;">
                Hi ${vars.customerName} —
              </p>
              <p style="margin:0 0 24px;font-size:16px;color:#52525b;line-height:1.6;">
                Your VietPay account is ready. You're all set to send, receive,
                and manage money — instantly and securely.
              </p>

              <!-- Feature cards -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #f4f4f5;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:36px;height:36px;background:#eff6ff;border-radius:8px;text-align:center;font-size:18px;">&#x1F4B8;</td>
                        <td style="padding-left:12px;font-size:15px;color:#18181b;">Send and receive money instantly</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #f4f4f5;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:36px;height:36px;background:#eff6ff;border-radius:8px;text-align:center;font-size:18px;">&#x1F4CA;</td>
                        <td style="padding-left:12px;font-size:15px;color:#18181b;">Track every transfer in real time</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 0;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:36px;height:36px;background:#eff6ff;border-radius:8px;text-align:center;font-size:18px;">&#x1F512;</td>
                        <td style="padding-left:12px;font-size:15px;color:#18181b;">Secure your account with two-factor authentication</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="https://google.com/dashboard" style="display:inline-block;background:#1d4ed8;color:#ffffff;font-size:15px;font-weight:600;padding:14px 40px;border-radius:8px;text-decoration:none;">Go to Dashboard</a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:14px;color:#a1a1aa;">
                Questions? Reply to this email or contact
                <a href="mailto:${vars.supportEmail}" style="color:#1d4ed8;text-decoration:none;">${vars.supportEmail}</a>.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#fafafa;padding:16px 32px;text-align:center;font-size:12px;color:#a1a1aa;border-top:1px solid #e4e4e7;">
              VietPay &middot; This is an automated message.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    return { html, text };
}
