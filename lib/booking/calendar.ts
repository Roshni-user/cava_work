import { createSign } from "node:crypto";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";

export class CalendarError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "CalendarError";
  }
}

type TokenCache = {
  token: string;
  expiresAt: number;
};

type CalendarConfig =
  | {
      mode: "oauth";
      clientId: string;
      clientSecret: string;
      refreshToken: string;
      calendarId: string;
    }
  | {
      mode: "service-account";
      clientEmail: string;
      privateKey: string;
      calendarId: string;
    };

let tokenCache: TokenCache | null = null;

function required(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

export function calendarConfigured(): boolean {
  return readCalendarConfig() !== null;
}

function readCalendarConfig(): CalendarConfig | null {
  const calendarId = required("GOOGLE_CALENDAR_ID");
  if (!calendarId) {
    return null;
  }

  const clientId = required("GOOGLE_CLIENT_ID");
  const clientSecret = required("GOOGLE_CLIENT_SECRET");
  const refreshToken = required("GOOGLE_REFRESH_TOKEN");
  if (clientId && clientSecret && refreshToken) {
    return { mode: "oauth", clientId, clientSecret, refreshToken, calendarId };
  }

  const clientEmail = required("GOOGLE_CLIENT_EMAIL");
  const privateKey = required("GOOGLE_PRIVATE_KEY");
  if (clientEmail && privateKey) {
    return {
      mode: "service-account",
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, "\n"),
      calendarId,
    };
  }

  return null;
}

function base64Url(value: string): string {
  return Buffer.from(value).toString("base64url");
}

async function serviceAccountToken(clientEmail: string, privateKey: string): Promise<TokenCache> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64Url(
    JSON.stringify({
      iss: clientEmail,
      scope: CALENDAR_SCOPE,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  signer.end();
  const assertion = `${header}.${claim}.${signer.sign(privateKey).toString("base64url")}`;
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const payload: unknown = await response.json().catch(() => null);
  return readToken(response.status, payload);
}

async function oauthToken(config: Extract<CalendarConfig, { mode: "oauth" }>): Promise<TokenCache> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: config.refreshToken,
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const payload: unknown = await response.json().catch(() => null);
  return readToken(response.status, payload);
}

function readToken(status: number, payload: unknown): TokenCache {
  if (
    status >= 200 &&
    status < 300 &&
    payload &&
    typeof payload === "object" &&
    "access_token" in payload &&
    typeof payload.access_token === "string"
  ) {
    const expiresIn =
      "expires_in" in payload && typeof payload.expires_in === "number" ? payload.expires_in : 3600;
    return {
      token: payload.access_token,
      expiresAt: Date.now() + Math.max(60, expiresIn - 60) * 1000,
    };
  }

  throw new CalendarError("Consultation booking is unavailable right now. Please try again later.", 503);
}

async function accessToken(config: CalendarConfig): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token;
  }

  tokenCache =
    config.mode === "oauth"
      ? await oauthToken(config)
      : await serviceAccountToken(config.clientEmail, config.privateKey);
  return tokenCache.token;
}

async function calendarFetch(
  config: CalendarConfig,
  path: string,
  init: { method: string; body?: unknown },
): Promise<{ status: number; payload: unknown }> {
  const token = await accessToken(config);
  const response = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    method: init.method,
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/json",
      ...(init.body ? { "content-type": "application/json" } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const payload: unknown = await response.json().catch(() => null);
  return { status: response.status, payload };
}

function calendarFailure(status: number): CalendarError {
  if (status === 401 || status === 403) {
    return new CalendarError(
      "Consultation booking is unavailable right now. Please try again later.",
      503,
    );
  }

  if (status === 409) {
    return new CalendarError("Unable to complete the booking. Please try another time slot.", 409);
  }

  return new CalendarError("Unable to complete the booking. Please try another time slot.", 502);
}

export async function overlappingBusy(
  rangeStart: Date,
  rangeEnd: Date,
): Promise<Array<{ start: number; end: number }> | null> {
  const config = readCalendarConfig();
  if (!config) {
    return null;
  }

  const { status, payload } = await calendarFetch(config, "/freeBusy", {
    method: "POST",
    body: {
      timeMin: rangeStart.toISOString(),
      timeMax: rangeEnd.toISOString(),
      items: [{ id: config.calendarId }],
    },
  });

  if (status < 200 || status >= 300 || !payload || typeof payload !== "object") {
    throw calendarFailure(status);
  }

  const calendars =
    "calendars" in payload && payload.calendars && typeof payload.calendars === "object"
      ? (payload.calendars as Record<string, unknown>)
      : {};
  const calendar = calendars[config.calendarId];
  const busy =
    calendar && typeof calendar === "object" && "busy" in calendar && Array.isArray(calendar.busy)
      ? calendar.busy
      : [];
  const ranges: Array<{ start: number; end: number }> = [];

  for (const item of busy) {
    if (!item || typeof item !== "object" || !("start" in item) || !("end" in item)) {
      continue;
    }
    if (typeof item.start !== "string" || typeof item.end !== "string") {
      continue;
    }
    const start = new Date(item.start).getTime();
    const end = new Date(item.end).getTime();
    if (!Number.isNaN(start) && !Number.isNaN(end)) {
      ranges.push({ start, end });
    }
  }

  return ranges;
}

export function overlapsBusy(
  slotStart: number,
  slotEnd: number,
  busy: ReadonlyArray<{ start: number; end: number }>,
): boolean {
  return busy.some((item) => slotStart < item.end && slotEnd > item.start);
}

type CreatedEvent = {
  eventId: string;
  meetUrl: string;
};

function eventIdentity(payload: unknown): { eventId: string; meetUrl: string } {
  if (!payload || typeof payload !== "object") {
    return { eventId: "", meetUrl: "" };
  }

  const eventId = "id" in payload && typeof payload.id === "string" ? payload.id : "";
  const hangoutLink =
    "hangoutLink" in payload && typeof payload.hangoutLink === "string" ? payload.hangoutLink : "";
  const entryPoints =
    "conferenceData" in payload &&
    payload.conferenceData &&
    typeof payload.conferenceData === "object" &&
    "entryPoints" in payload.conferenceData &&
    Array.isArray(payload.conferenceData.entryPoints)
      ? payload.conferenceData.entryPoints
      : [];
  let videoUrl = "";

  for (const entry of entryPoints) {
    if (
      entry &&
      typeof entry === "object" &&
      "entryPointType" in entry &&
      entry.entryPointType === "video" &&
      "uri" in entry &&
      typeof entry.uri === "string" &&
      entry.uri.startsWith("https://")
    ) {
      videoUrl = entry.uri;
      break;
    }
  }

  const meetUrl = hangoutLink.startsWith("https://") ? hangoutLink : videoUrl;
  return { eventId, meetUrl };
}

async function waitForMeetUrl(config: CalendarConfig, eventId: string): Promise<string> {
  const calendarId = encodeURIComponent(config.calendarId);
  const eventPath = `/calendars/${calendarId}/events/${encodeURIComponent(eventId)}`;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    const { status, payload } = await calendarFetch(config, eventPath, { method: "GET" });
    if (status < 200 || status >= 300) {
      continue;
    }
    const meetUrl = eventIdentity(payload).meetUrl;
    if (meetUrl) {
      return meetUrl;
    }
  }

  return "";
}

export async function createConsultationEvent(input: {
  consultationId: string;
  name: string;
  email: string;
  phone: string | null;
  companyName: string | null;
  message: string;
  start: Date;
  end: Date;
  timeZone: string;
}): Promise<CreatedEvent> {
  const config = readCalendarConfig();
  if (!config) {
    throw new CalendarError(
      "Consultation booking is unavailable right now. Please try again later.",
      503,
    );
  }

  const description = [
    "Hubble consultation",
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    input.phone ? `Phone: ${input.phone}` : null,
    input.companyName ? `Company: ${input.companyName}` : null,
    "",
    input.message,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  const calendarId = encodeURIComponent(config.calendarId);
  const { status, payload } = await calendarFetch(
    config,
    `/calendars/${calendarId}/events?conferenceDataVersion=1`,
    {
      method: "POST",
      body: {
        summary: `Hubble Consultation — ${input.name}`,
        description,
        start: { dateTime: input.start.toISOString(), timeZone: input.timeZone },
        end: { dateTime: input.end.toISOString(), timeZone: input.timeZone },
        attendees: [{ email: input.email }],
        conferenceData: {
          createRequest: {
            requestId: `${input.consultationId}-${input.start.getTime()}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      },
    },
  );

  if (status < 200 || status >= 300 || !payload || typeof payload !== "object") {
    throw calendarFailure(status);
  }

  const created = eventIdentity(payload);
  const eventId = created.eventId;
  const meetUrl = created.meetUrl || (eventId ? await waitForMeetUrl(config, eventId) : "");

  if (!eventId || !meetUrl.startsWith("https://")) {
    if (eventId) {
      await deleteConsultationEvent(eventId);
    }
    throw new CalendarError("Unable to complete the booking. Please try another time slot.", 502);
  }

  return { eventId, meetUrl };
}

export async function deleteConsultationEvent(eventId: string): Promise<void> {
  const config = readCalendarConfig();
  if (!config) {
    return;
  }

  const calendarId = encodeURIComponent(config.calendarId);
  await calendarFetch(config, `/calendars/${calendarId}/events/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
  }).catch(() => undefined);
}
