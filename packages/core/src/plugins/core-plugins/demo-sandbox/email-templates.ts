/**
 * Demo Sandbox Email Templates
 *
 * Branded HTML email template for OTP authentication codes.
 */

/**
 * Returns branded HTML and plain-text email content for the demo OTP code.
 *
 * Design goals:
 * - Inline CSS only (no external assets — works in all email clients)
 * - Large, readable 6-digit code with generous letter-spacing
 * - Clear expiry notice
 * - Plain text fallback for accessibility and spam filtering
 */
export function getDemoOtpEmailHtml(code: string): { html: string; text: string } {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Flare CMS Demo Code</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0f172a;">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">

          <!-- Logo / Brand -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <div style="display:inline-flex;align-items:center;gap:10px;">
                <div style="width:36px;height:36px;background:linear-gradient(135deg,#f97316,#ef4444);border-radius:8px;display:inline-block;"></div>
                <span style="color:#f8fafc;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Flare CMS</span>
              </div>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#1e293b;border-radius:16px;padding:40px 40px 36px;border:1px solid #334155;">

              <!-- Heading -->
              <p style="margin:0 0 8px;color:#94a3b8;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">Demo Access</p>
              <h1 style="margin:0 0 24px;color:#f8fafc;font-size:26px;font-weight:700;line-height:1.3;">Your one-time login code</h1>
              <p style="margin:0 0 32px;color:#94a3b8;font-size:15px;line-height:1.6;">
                Use the code below to access the Flare CMS interactive demo. You'll be able to explore the admin panel as a demo user.
              </p>

              <!-- OTP Code block -->
              <div style="background-color:#0f172a;border:1px solid #475569;border-radius:12px;padding:28px 24px;text-align:center;margin-bottom:28px;">
                <p style="margin:0 0 10px;color:#64748b;font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;">Your code</p>
                <p style="margin:0;color:#f97316;font-family:'Courier New',Courier,monospace;font-size:44px;font-weight:700;letter-spacing:0.35em;line-height:1;">${code}</p>
              </div>

              <!-- Expiry notice -->
              <div style="background-color:#422006;border:1px solid #7c2d12;border-radius:8px;padding:12px 16px;margin-bottom:28px;text-align:center;">
                <p style="margin:0;color:#fb923c;font-size:13px;font-weight:500;">
                  &#x23F0; This code expires in <strong>5 minutes</strong>. Do not share it with anyone.
                </p>
              </div>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #334155;margin:0 0 24px;" />

              <!-- Footer note -->
              <p style="margin:0;color:#475569;font-size:12px;line-height:1.6;">
                If you did not request this code, you can safely ignore this email. Someone may have entered your email address by mistake.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:28px;">
              <p style="margin:0;color:#475569;font-size:12px;">
                Flare CMS &mdash; Headless CMS for Cloudflare Workers
              </p>
              <p style="margin:8px 0 0;color:#334155;font-size:11px;">
                <a href="https://flarecms.dev" style="color:#f97316;text-decoration:none;">flarecms.dev</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = `Flare CMS — Demo Access

Your one-time login code:

  ${code}

This code expires in 5 minutes. Do not share it with anyone.

If you did not request this code, you can safely ignore this email.

— Flare CMS (flarecms.dev)`

  return { html, text }
}
