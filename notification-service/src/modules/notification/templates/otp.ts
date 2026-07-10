/**
 * OTP (One-Time Password) email template.
 *
 * Clean, high-contrast design optimized for quick code scanning on mobile.
 */

export interface OtpTemplateVars {
    customerName: string;
    otpCode: string;
    purpose: string; // e.g. "login", "password reset", "transfer confirmation"
    expiresInMinutes: number;
    supportEmail: string;
}

export function renderOtpEmail(vars: OtpTemplateVars): {
    html: string;
    text: string;
} {
    const text = [
        `Hi ${vars.customerName},`,
        '',
        `Your OTP code for ${vars.purpose} is: ${vars.otpCode}`,
        '',
        `This code expires in ${vars.expiresInMinutes} minutes.`,
        '',
        `If you didn't request this, please ignore this email or contact ${vars.supportEmail}.`,
        '— VietPay',
    ].join('\n');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your OTP Code</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#1d4ed8;padding:28px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">VietPay</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;text-align:center;">
              <p style="margin:0 0 8px;font-size:16px;color:#18181b;">Hi ${vars.customerName},</p>
              <p style="margin:0 0 24px;font-size:15px;color:#52525b;">
                Use the code below to complete ${vars.purpose}.
              </p>

              <!-- OTP display -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:20px 0 24px;">
                    <span style="display:inline-block;background:#fafafa;border:2px dashed #d4d4d8;border-radius:8px;padding:16px 32px;font-size:32px;font-weight:700;letter-spacing:8px;color:#18181b;font-family:'Courier New',monospace;">${vars.otpCode}</span>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px;font-size:13px;color:#a1a1aa;">
                This code expires in <strong style="color:#52525b;">${vars.expiresInMinutes} minutes</strong>.
                Do not share it with anyone.
              </p>

              <p style="margin:0;font-size:13px;color:#a1a1aa;">
                If you didn't request this code, please ignore this email or contact
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
