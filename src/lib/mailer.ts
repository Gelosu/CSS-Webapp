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

function formatExpiry(expiresAt: number | null | undefined) {
  if (!expiresAt) return null;
  return new Date(expiresAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" });
}

function downloadInviteEmailHtml(opts: {
  classroomName: string;
  classCode: string;
  downloadLink: string;
  expiresAt?: number | null;
}) {
  const expiry = formatExpiry(opts.expiresAt);
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
                  used again.${expiry ? ` It expires on <strong style="color:#c3cede;">${expiry}</strong>.` : ""}
                  If you need another copy, ask your instructor to resend it.
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
  expiresAt?: number | null;
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
      `This link can only be used once.` +
      (opts.expiresAt ? ` It expires on ${formatExpiry(opts.expiresAt)}.` : ""),
  });
}

function reportEmailHtml(opts: {
  title: string;
  subtitle: string;
  senderName: string;
  message: string;
  fileName: string;
}) {
  const title = escapeHtml(opts.title);
  const subtitle = escapeHtml(opts.subtitle);
  const senderName = escapeHtml(opts.senderName);
  const fileName = escapeHtml(opts.fileName);
  const message = opts.message
    ? `<tr><td style="padding:20px 32px 0 32px;">
         <p style="margin:0;padding:14px 16px;background-color:#1e3a5f;border-radius:12px;border:1px solid #2a3f60;color:#dbe3ee;font-size:14px;line-height:1.6;">${escapeHtml(opts.message).replace(/\r?\n/g, "<br>")}</p>
       </td></tr>`
    : "";

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#eef1f5;font-family:Georgia,'Times New Roman',serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef1f5;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#152540;border-radius:16px;border:1px solid #2a3f60;overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 8px 32px;text-align:center;">
                <p style="margin:0;color:#f5f7fa;font-size:20px;font-weight:700;">Computer Systems Servicing</p>
                <p style="margin:4px 0 0 0;color:#9fb0c9;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Progress Report</p>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 32px 0 32px;text-align:center;">
                <h1 style="margin:0;color:#f5f7fa;font-size:19px;font-weight:600;">${title}</h1>
                <p style="margin:8px 0 0 0;color:#e0b34d;font-size:14px;">${subtitle}</p>
                <p style="margin:12px 0 0 0;color:#c3cede;font-size:14px;line-height:1.6;">
                  ${senderName} sent you this report. It is attached to this email as
                  <strong style="color:#f5f7fa;">${fileName}</strong>.
                </p>
              </td>
            </tr>
            ${message}
            <tr>
              <td style="padding:22px 32px 30px 32px;">
                <p style="margin:0;color:#8496b3;font-size:12px;line-height:1.6;text-align:center;">
                  You can reply to this email to reach ${senderName} directly.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendReportEmail(opts: {
  to: string[];
  subject: string;
  message: string;
  title: string;
  subtitle: string;
  senderName: string;
  senderEmail: string | null;
  fileName: string;
  contentType: string;
  content: Buffer;
}) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  await getTransporter().sendMail({
    from: `"Computer Systems Servicing" <${from}>`,
    to: opts.to,
    ...(opts.senderEmail ? { replyTo: `"${opts.senderName.replace(/"/g, "")}" <${opts.senderEmail}>` } : {}),
    subject: opts.subject,
    html: reportEmailHtml(opts),
    text:
      `${opts.title}\n${opts.subtitle}\n\n` +
      `${opts.senderName} sent you this progress report (attached: ${opts.fileName}).\n` +
      (opts.message ? `\n${opts.message}\n` : ""),
    attachments: [
      { filename: opts.fileName, content: opts.content, contentType: opts.contentType },
    ],
  });
}

function appUpdateEmailHtml(opts: { version: string; notes: string; updateLink: string }) {
  const version = escapeHtml(opts.version);
  const notes = opts.notes
    ? `<tr><td style="padding:18px 32px 0 32px;">
         <p style="margin:0;padding:14px 16px;background-color:#1e3a5f;border-radius:12px;border:1px solid #2a3f60;color:#dbe3ee;font-size:13px;line-height:1.6;">${escapeHtml(opts.notes).replace(/\r?\n/g, "<br>")}</p>
       </td></tr>`
    : "";
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#eef1f5;font-family:Georgia,'Times New Roman',serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef1f5;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#152540;border-radius:16px;border:1px solid #2a3f60;overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 8px 32px;text-align:center;">
                <p style="margin:0;color:#f5f7fa;font-size:20px;font-weight:700;">Computer Systems Servicing</p>
                <p style="margin:4px 0 0 0;color:#9fb0c9;font-size:11px;letter-spacing:2px;text-transform:uppercase;">App update</p>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 32px 0 32px;text-align:center;">
                <h1 style="margin:0;color:#f5f7fa;font-size:19px;font-weight:600;">A new version is ready</h1>
                <p style="margin:8px 0 0 0;color:#e0b34d;font-size:22px;font-weight:700;letter-spacing:2px;">${version}</p>
                <p style="margin:12px 0 0 0;color:#c3cede;font-size:14px;line-height:1.6;">
                  Please update the app to get the latest lessons, fixes and improvements. Your progress stays on your account.
                </p>
              </td>
            </tr>
            ${notes}
            <tr>
              <td style="padding:26px 32px 0 32px;text-align:center;">
                <a href="${opts.updateLink}" style="display:inline-block;background-color:#c8962c;color:#152540;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:9999px;">
                  Update the app
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 30px 32px;">
                <p style="margin:0;color:#8496b3;font-size:12px;line-height:1.6;text-align:center;">
                  This link <strong style="color:#c3cede;">never expires</strong> and always gives you the newest version.
                  You can also update from inside the app when it shows &ldquo;Update available&rdquo;.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendAppUpdateEmail(opts: { to: string; version: string; notes: string; updateLink: string }) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  await getTransporter().sendMail({
    from: `"Computer Systems Servicing" <${from}>`,
    to: opts.to,
    subject: `App update available — version ${opts.version}`,
    html: appUpdateEmailHtml(opts),
    text:
      `A new version (${opts.version}) of the Computer Systems Servicing app is ready.\n\n` +
      (opts.notes ? `${opts.notes}\n\n` : "") +
      `Update here (this link never expires): ${opts.updateLink}\n\n` +
      `You can also update from inside the app when it shows "Update available".`,
  });
}

function assignmentEmailHtml(opts: { name: string; classrooms: { name: string; code: string; isNew: boolean }[]; portalUrl: string }) {
  const name = escapeHtml(opts.name);
  const rows = opts.classrooms
    .map(
      (c) => `<tr>
        <td style="padding:12px 16px;border-top:1px solid #2a3f60;">
          <p style="margin:0;color:#f5f7fa;font-size:15px;font-weight:600;">${escapeHtml(c.name)}${c.isNew ? ' <span style="color:#e0b34d;font-size:10px;letter-spacing:1px;">NEW</span>' : ""}</p>
          <p style="margin:6px 0 0 0;color:#9fb0c9;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;">Class code</p>
          <p style="margin:2px 0 0 0;color:#e0b34d;font-size:22px;font-weight:700;letter-spacing:4px;">${escapeHtml(c.code)}</p>
        </td></tr>`
    )
    .join("");
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#eef1f5;font-family:Georgia,'Times New Roman',serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef1f5;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#152540;border-radius:16px;border:1px solid #2a3f60;overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 8px 32px;text-align:center;">
                <p style="margin:0;color:#f5f7fa;font-size:20px;font-weight:700;">Computer Systems Servicing</p>
                <p style="margin:4px 0 0 0;color:#9fb0c9;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Classroom assignment</p>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 32px 0 32px;text-align:center;">
                <h1 style="margin:0;color:#f5f7fa;font-size:19px;font-weight:600;">Hi ${name}, you have been assigned</h1>
                <p style="margin:10px 0 0 0;color:#c3cede;font-size:14px;line-height:1.6;">
                  Share these class codes with your students: they enter the code in the mobile app to join your class.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 0 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1e3a5f;border-radius:12px;border:1px solid #2a3f60;">
                  ${rows}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 32px 0 32px;text-align:center;">
                <a href="${opts.portalUrl}" style="display:inline-block;background-color:#c8962c;color:#152540;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:9999px;">
                  Open the portal
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 30px 32px;">
                <p style="margin:0;color:#8496b3;font-size:12px;line-height:1.6;text-align:center;">
                  Sign in with this email address. If you did not expect this, please contact your administrator.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendClassroomAssignmentEmail(opts: {
  to: string;
  name: string;
  classrooms: { name: string; code: string; isNew: boolean }[];
  portalUrl: string;
}) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const many = opts.classrooms.length > 1;
  await getTransporter().sendMail({
    from: `"Computer Systems Servicing" <${from}>`,
    to: opts.to,
    subject: `Classroom assignment — ${opts.classrooms.map((c) => c.name).join(", ")}`,
    html: assignmentEmailHtml(opts),
    text:
      `Hi ${opts.name}, you have been assigned to ${many ? "these classrooms" : "this classroom"}:\n\n` +
      opts.classrooms.map((c) => `${c.name} - class code ${c.code}${c.isNew ? " (new)" : ""}`).join("\n") +
      `\n\nStudents enter the class code in the mobile app to join your class.\nPortal: ${opts.portalUrl}`,
  });
}
