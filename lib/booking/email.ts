export class EmailError extends Error {
  constructor() {
    super("Confirmation email could not be sent.");
    this.name = "EmailError";
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function sendBookingConfirmation(input: {
  name: string;
  email: string;
  companyName: string | null;
  dateLabel: string;
  timeLabel: string;
  meetUrl: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();

  if (!apiKey || !from) {
    throw new EmailError();
  }

  const company = input.companyName
    ? `<p><strong>Company:</strong> ${escapeHtml(input.companyName)}</p>`
    : "";
  const html = `<!DOCTYPE html>
<html>
  <body style="font-family: Arial, sans-serif; color: #07161c; line-height: 1.5;">
    <h1 style="font-size: 20px;">Your Hubble consultation is confirmed</h1>
    <p>Hello ${escapeHtml(input.name)},</p>
    <p>Your consultation has been booked.</p>
    <p><strong>Date:</strong> ${escapeHtml(input.dateLabel)}</p>
    <p><strong>Time:</strong> ${escapeHtml(input.timeLabel)}</p>
    ${company}
    <p><strong>Google Meet:</strong> <a href="${escapeHtml(input.meetUrl)}">${escapeHtml(input.meetUrl)}</a></p>
    <p>Use the Meet link at the scheduled time.</p>
  </body>
</html>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.email],
      subject: "Your Hubble consultation is booked",
      html,
    }),
  });

  if (!response.ok) {
    throw new EmailError();
  }
}
