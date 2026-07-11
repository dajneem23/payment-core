/**
 * Payment confirmation email template.
 *
 * Renders a responsive, brand-neutral receipt that works across
 * Gmail, Outlook, Apple Mail, and mobile clients.
 */

export interface PaymentTemplateVars {
    customerName: string;
    transferId: string;
    amount: string;
    currency: string;
    status: string;
    sourceWalletId: string;
    targetWalletId: string;
    remark?: string;
    timestamp: string;
    supportEmail: string;
}

export function renderPaymentEmail(vars: PaymentTemplateVars): {
    html: string;
    text: string;
} {
    const text = [
        `Hi ${vars.customerName},`,
        '',
        `Your transfer ${vars.transferId} is ${vars.status.toUpperCase()}.`,
        '',
        `Amount: ${vars.amount} ${vars.currency}`,
        `From:  ${vars.sourceWalletId}`,
        `To:    ${vars.targetWalletId}`,
        ...(vars.remark ? [`Note:  ${vars.remark}`] : []),
        `Date:  ${vars.timestamp}`,
        '',
        `Questions? Contact ${vars.supportEmail}`,
        '— VietPay',
    ].join('\n');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Transfer ${vars.status.toUpperCase()}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#1d4ed8;padding:28px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">VietPay</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;font-size:16px;color:#18181b;">Hi ${vars.customerName},</p>
              <p style="margin:0 0 24px;font-size:16px;color:#52525b;">
                Your transfer <strong>${vars.transferId}</strong> is
                <span style="color:${vars.status === 'completed' ? '#16a34a' : '#dc2626'};font-weight:600;">${vars.status.toUpperCase()}</span>.
              </p>

              <!-- Receipt box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border:1px solid #e4e4e7;border-radius:8px;">
                <tr><td style="padding:16px 16px 8px;font-size:13px;color:#71717a;">Amount</td></tr>
                <tr><td style="padding:0 16px 12px;font-size:20px;font-weight:700;color:#18181b;">${vars.amount} ${vars.currency}</td></tr>
                <tr><td style="padding:8px 16px;font-size:13px;color:#71717a;">From</td></tr>
                <tr><td style="padding:0 16px 8px;font-size:14px;color:#18181b;font-family:monospace;">${vars.sourceWalletId}</td></tr>
                <tr><td style="padding:8px 16px;font-size:13px;color:#71717a;">To</td></tr>
                <tr><td style="padding:0 16px 8px;font-size:14px;color:#18181b;font-family:monospace;">${vars.targetWalletId}</td></tr>
                ${vars.remark ? `<tr><td style="padding:8px 16px;font-size:13px;color:#71717a;">Note</td></tr>
                <tr><td style="padding:0 16px 8px;font-size:14px;color:#18181b;">${vars.remark}</td></tr>` : ''}
                <tr><td style="padding:8px 16px;font-size:13px;color:#71717a;">Date</td></tr>
                <tr><td style="padding:0 16px 16px;font-size:14px;color:#18181b;">${vars.timestamp}</td></tr>
              </table>

              <p style="margin:24px 0 0;font-size:14px;color:#a1a1aa;">
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
