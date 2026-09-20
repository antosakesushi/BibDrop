/**
 * Delivery stub. Resend is preferred; SendGrid is the fallback.
 * With neither key set, sendAlertEmail no-ops so Alert rows can still be
 * scheduled — adding a key later enables send without a redesign.
 */

export function getEmailProvider() {
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.SENDGRID_API_KEY) return "sendgrid";
  return null;
}

export function hasEmailProvider() {
  return Boolean(getEmailProvider());
}

function fromAddress() {
  return process.env.ALERT_FROM_EMAIL || "BibDrop <alerts@bibdrop.local>";
}

function fromEmailOnly() {
  const raw = fromAddress();
  const match = raw.match(/<([^>]+)>/);
  return match ? match[1] : raw;
}

export async function sendAlertEmail({ to, subject, text }) {
  const provider = getEmailProvider();
  if (!provider) {
    console.warn(
      "[email] No RESEND_API_KEY or SENDGRID_API_KEY set — leaving the alert scheduled and not sending."
    );
    return { sent: false, skipped: true, reason: "no_provider_key" };
  }
  if (!to) {
    throw new Error("Alert email is missing a recipient.");
  }

  if (provider === "resend") {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [to],
        subject,
        text,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(body.message || `Resend send failed (${res.status})`);
    }
    return { sent: true, provider: "resend", providerMessageId: body.id || null };
  }

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: fromEmailOnly() },
      subject,
      content: [{ type: "text/plain", value: text }],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || `SendGrid send failed (${res.status})`);
  }
  return {
    sent: true,
    provider: "sendgrid",
    providerMessageId: res.headers.get("x-message-id") || null,
  };
}

export function buildAlertEmail({ race, deadline, leadDays }) {
  const when = deadline.date ? new Date(deadline.date).toISOString().slice(0, 10) : "TBD";
  const subject = `${race.name}: ${deadline.label || deadline.type} in ${leadDays} day${leadDays === 1 ? "" : "s"}`;
  const text = [
    `${race.name} — ${deadline.label || deadline.type}`,
    `Date: ${when} (${deadline.dateConfidence})`,
    `This is your ${leadDays}-day heads-up.`,
    race.officialUrl ? `Official site: ${race.officialUrl}` : "",
    "",
    "BibDrop does not register for you. Confirm on the official race site.",
  ]
    .filter(Boolean)
    .join("\n");
  return { subject, text };
}
