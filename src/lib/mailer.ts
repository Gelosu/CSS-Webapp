import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | undefined;

function getTransporter(): Transporter {
  if (!transporter) {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!user || !pass) {
      throw new Error(
        "Email is not configured. Set SMTP_USER and SMTP_PASS (a Gmail App Password) in .env.local."
      );
    }
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }
  return transporter;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function downloadInviteEmailHtml(opts: {
  classroomName: string;
  classCode: string;
  downloadLink: string;
}) {
  const classroomName = escapeHtml(opts.classroomName);
  const classCode = escapeHtml(opts.classCode);

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#eef1f5;font-family:Georgia,'Times New Roman',serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef1f5;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#152540;border-radius:16px;border:1px solid #2a3f60;overflow:hidden;">
            <tr>
              <td style="padding:36px 32px 8px 32px;text-align:center;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                  <tr>
                    <td style="width:56px;height:56px;border-radius:9999px;border:2px solid #c8962c;background-color:#1e3a5f;text-align:center;vertical-align:middle;font-size:24px;">
                      &#127891;
                    </td>
                  </tr>
                </table>
                <p style="margin:16px 0 0 0;color:#f5f7fa;font-size:20px;font-weight:700;">Computer Systems Servicing</p>
                <p style="margin:4px 0 0 0;color:#9fb0c9;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Admin Portal</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 0 32px;">
                <h1 style="margin:0;color:#f5f7fa;font-size:19px;font-weight:600;text-align:center;">Your app download is ready</h1>
                <p style="margin:10px 0 0 0;color:#c3cede;font-size:14px;line-height:1.6;text-align:center;">
                  Use the class code below to sign in once the app is installed.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 0 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1e3a5f;border-radius:12px;border:1px solid #2a3f60;">
                  <tr>
                    <td style="padding:16px 20px;text-align:center;">
                      <p style="margin:0;color:#9fb0c9;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;">Classroom</p>
                      <p style="margin:4px 0 0 0;color:#f5f7fa;font-size:15px;font-weight:600;">${classroomName}</p>
                      <p style="margin:14px 0 0 0;color:#9fb0c9;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;">Class Code</p>
                      <p style="margin:4px 0 0 0;color:#e0b34d;font-size:22px;font-weight:700;letter-spacing:4px;">${classCode}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 0 32px;text-align:center;">
                <a href="${opts.downloadLink}" style="display:inline-block;background-color:#c8962c;color:#152540;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:9999px;">
                  Download APK
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 32px 32px;">
                <p style="margin:0;color:#8496b3;font-size:12px;line-height:1.6;text-align:center;">
                  This is a <strong style="color:#c3cede;">one-time link</strong> — once opened, it can&rsquo;t be
                  used again. If you need another copy, ask your instructor to resend it.
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:20px 0 0 0;color:#9aa5b5;font-size:11px;text-align:center;">
            You&rsquo;re receiving this because your instructor added your email for classroom access.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendDownloadInviteEmail(opts: {
  to: string;
  classroomName: string;
  classCode: string;
  downloadLink: string;
}) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  await getTransporter().sendMail({
    from: `"Computer Systems Servicing" <${from}>`,
    to: opts.to,
    subject: `Your download link — ${opts.classroomName}`,
    html: downloadInviteEmailHtml(opts),
    text:
      `Your Computer Systems Servicing app download is ready.\n\n` +
      `Classroom: ${opts.classroomName}\n` +
      `Class code: ${opts.classCode}\n\n` +
      `Download (one-time link): ${opts.downloadLink}\n\n` +
      `This link can only be used once.`,
  });
}
