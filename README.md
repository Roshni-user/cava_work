# Cavli Wireless

Cavli Wireless Hubble product showcase and consultation booking application. The site presents five Hubble features, shows the MMI Connect exhibitor catalogue from PostgreSQL, and lets a visitor request a consultation, choose a weekday time, and book that slot.

Booking creates a Google Calendar event with a Google Meet conference, stores the event id and Meet URL, and sends a confirmation email through Resend. The landing page, product pages, and exhibitor import do not depend on those external accounts.

## Demo Video

[Watch the demo video on Google Drive](https://drive.google.com/file/d/18tP4ZbnFBfNdjNivPRm3wrHNjni2Yla5/view?usp=sharing)

## Features

- Hubble landing page with header, hero, introduction, feature cards, exhibitor section, Consult Now form, and footer
- Five Hubble features, each linked to `/products/[slug]`
- Product detail pages, with a not-found page for an unknown slug
- Interactive 3D viewer for the supplied Hubble GLB, using `@google/model-viewer`
- Live MMI exhibitor catalogue in the header, exhibitor section, and footer
- PostgreSQL persistence through Prisma
- MMI GraphQL scraper with pagination and upsert
- Consult Now form with inline validation, loading, success, and error states, and no full-page reload
- Weekday time-slot selection
- Google Calendar event creation and Google Meet link retrieval
- Resend confirmation email
- Slot claim and release when Calendar does not return a Meet URL

## Tech stack

- Next.js 16.3.6 (App Router) and React 19
- TypeScript
- Tailwind CSS 4
- PostgreSQL
- Prisma 7 with `@prisma/adapter-pg` and `pg`
- `@google/model-viewer` for the GLB viewer
- Google Calendar API, called with `fetch` from the server, including Meet conference data
- Resend HTTP API, called with `fetch` from the server
- MMI Connect public GraphQL API
- ESLint
- `tsx` for the scraper script
- `dotenv` for the Prisma CLI and the scraper script

PostgreSQL is a local server. Docker is not used. The app is not described here as a deployed production site.

## Project structure

```text
app/
  page.tsx                         Landing page
  layout.tsx                       Header, footer, and exhibitor provider
  products/[slug]/page.tsx         Feature page and 3D viewer
  products/[slug]/not-found.tsx    Unknown feature
  api/consult/route.ts             POST /api/consult
  api/consult/slots/route.ts       GET /api/consult/slots
  api/consult/book/route.ts        POST /api/consult/book
  api/exhibitors/route.ts          GET /api/exhibitors
  api/models/hubble/route.ts       GET /api/models/hubble
  api/scrape/exhibitors/route.ts   POST /api/scrape/exhibitors
components/                        Landing sections, consult form, booking panel, 3D viewer
lib/data/products.ts               Hubble feature copy used by the pages
lib/prisma.ts                      Shared Prisma client
lib/consultations.ts               Consultation validation and insert
lib/exhibitor-catalogue.ts         Exhibitor preview query
lib/booking/                       Slots, Calendar, Meet, and confirmation email
lib/scraper/                       MMI GraphQL client and database upsert
prisma/schema.prisma               PostgreSQL schema
prisma/migrations/                 Applied SQL migrations
scripts/scrape-exhibitors.ts       npm run scrape
docs/database-schema.md            Table, relationship, and 3NF notes
docs/exhibitor-source-analysis.md  MMI GraphQL source notes
```

## Main routes

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/` | Hubble landing page |
| GET | `/products/[slug]` | One Hubble feature, its 3D viewer, and a link back to Consult Now |
| GET | `/products/not-a-feature` | Unknown slug. Renders “Feature not found.” |
| GET | `/api/exhibitors` | Exhibitor previews for the header, exhibitor section, and footer |
| GET | `/api/models/hubble` | Streams the supplied Hubble GLB from the same origin |
| POST | `/api/consult` | Validates the form and inserts a `PENDING` consultation |
| GET | `/api/consult/slots` | Upcoming weekday dates, or slots for `?date=YYYY-MM-DD` |
| POST | `/api/consult/book` | Claims a slot, creates the Calendar event and Meet link, saves the booking, and sends email |
| POST | `/api/scrape/exhibitors` | Runs the MMI scraper and returns that run’s summary |

Feature slugs:

- `/products/cellular-connectivity`
- `/products/gnss-positioning`
- `/products/edge-processing`
- `/products/device-management`
- `/products/secure-connectivity`

The 3D viewer loads `/api/models/hubble`. That route fetches:

```text
https://d8wojkg2185gh.cloudfront.net/strapi/C41_QS_a3f9c78cdb.glb
```

`camera-controls` is enabled, so a pointer or touch can rotate and zoom the model. The card shows “Loading 3D model…” and an inline message if the model cannot be loaded. The rest of the product page stays a server component. Feature copy comes from `lib/data/products.ts`, not from the `products` table.

## Database

Prisma schema: `prisma/schema.prisma`. Connection string: `DATABASE_URL` in `prisma7.config.ts` and `lib/prisma.ts`. Migrations live in `prisma/migrations/` and are applied with `npx prisma migrate deploy`. Column-level notes and the 3NF explanation are in `docs/database-schema.md`.

| Table | Role |
| --- | --- |
| `catalogue_groups` | MMI catalogue group, such as `ep-blr-2026` |
| `shows` | Show name and dates, referenced by exhibitors |
| `exhibitors` | One MMI participation. Unique `mmi_customer_id` is the upsert key |
| `addresses` | Registered and headquarters addresses |
| `contacts` | At most one contact person per exhibitor |
| `contact_points` | Email, phone, fax, and related channels |
| `categories` | MMI categories |
| `exhibitor_categories` | Exhibitor-to-category links |
| `exhibitor_products` | Catalogue product names from MMI, not the Hubble feature pages |
| `products` | Hubble product table in the schema. The current pages do not read or write it |
| `product_features` | Features for a Hubble product row |
| `consultations` | Consult Now submissions and bookings |

A consultation starts as `PENDING`. Confirming a slot stores:

- `slot_start` and `slot_end` (`slot_start` is unique)
- `google_event_id`
- `meet_url`
- `booking_status` (`PENDING` or `BOOKED`)
- `booked_at`

The form also stores `name`, `email`, `phone`, optional `company_name`, and `message`. `product_id` stays null for the current form.

## MMI exhibitor scraper

The scraper reads the public MMI GraphQL endpoint in `MMI_GRAPHQL_URL`. The list operation is `getExhibitorListForGroup` for `MMI_CATALOGUE_GROUP` (`ep-blr-2026` in `.env.example`). Detail fields come from `catalogueDetailQuery` using each exhibitor’s `userId` and `showId`.

Pagination uses `MMI_PAGE_SIZE` (default 100). The first request uses `after = -1`. Each later request adds the page size to that offset. The loop stops from the MMI response: an empty page, `totalCount` of 0, no new customer ids, enough ids to reach `totalCount`, a short page, or a page-count guard. It does not stop after 20 rows and does not hardcode the catalogue size.

Each exhibitor is upserted on `mmi_customer_id`. A second run updates that row and its addresses, contact, categories, and catalogue products instead of inserting a duplicate. Related rows use their own unique keys. `npm run scrape` and `POST /api/scrape/exhibitors` both return the counts from that run: pages processed, processed, created, updated, skipped, and failed. A second request while a scrape is already running returns HTTP 409.

PostgreSQL must be running and migrations applied:

```bash
npm run scrape
```

With the Next.js server running:

```bash
curl -X POST http://localhost:3000/api/scrape/exhibitors
```

## Consultation booking flow

1. The visitor submits name, email, phone, optional company, and message. Name, email, phone, and message are required. Email must match an email shape. The page posts JSON to `POST /api/consult` with `preventDefault()`, so the browser does not reload.
2. Invalid input stays on the page with inline field errors. A valid request inserts a `PENDING` row and returns `consultationId`.
3. The page loads weekday dates from `GET /api/consult/slots`, then times for the selected date from `GET /api/consult/slots?date=YYYY-MM-DD`.
4. Slots are weekdays from 10:00 to 17:00 in `CONSULTATION_TIMEZONE` (default `Asia/Kolkata`), every 30 minutes, for 14 days. Past slots, slots already `BOOKED`, and times Google Calendar reports as busy are unavailable and cannot be selected.
5. The visitor selects one available slot and confirms it. The page posts to `POST /api/consult/book` without reloading.
6. The server checks that the slot is still a generated open time, checks existing bookings and Calendar free/busy data, and claims `slot_start` in a transaction. A second claim of the same start returns HTTP 409.
7. The server creates a Calendar event, adds the visitor as an attendee, and requests a Meet conference with `conferenceDataVersion=1`. If the first response has no Meet link yet, it reads the event again. The stored URL is the `https://` link Calendar returns.
8. The event id and Meet URL are saved, `booking_status` is `BOOKED`, and Resend sends a confirmation email with the visitor’s name, date, time, company when one was entered, and the Meet link.
9. The page shows “Your consultation has been booked successfully.” with the date, time, and Meet link. If the email send fails after the event exists, the booking stays saved and the page still shows the Meet link, with a note that the email was not sent.
10. If Calendar authentication fails, event creation fails, or Calendar does not return a Meet URL, the created event is deleted when one exists, the claimed slot is released back to `PENDING`, and the page shows an inline error. Credentials are not included in that message.

## Environment variables

Copy `.env.example` to `.env` for the database and scraper. Put Google and Resend values in `.env.local`. Both files are gitignored. `.env.example` is the only env file that should be committed, and it contains placeholders only.

| Name | Used for |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string for Prisma and the app |
| `MMI_GRAPHQL_URL` | Public MMI GraphQL endpoint |
| `MMI_CATALOGUE_GROUP` | Catalogue group. Example value: `ep-blr-2026` |
| `MMI_PAGE_SIZE` | List page size. Default 100 |
| `MMI_DETAIL_CONCURRENCY` | Parallel detail requests. Default 4 |
| `CONSULTATION_TIMEZONE` | Slot timezone. Default `Asia/Kolkata` |
| `GOOGLE_CALENDAR_ID` | Calendar that receives consultation events. `primary` is the owner’s main calendar |
| `GOOGLE_CLIENT_ID` | OAuth client id |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret. Server only |
| `GOOGLE_REFRESH_TOKEN` | OAuth refresh token for the calendar owner. Server only |
| `GOOGLE_CLIENT_EMAIL` | Service-account email. Alternative to the OAuth values |
| `GOOGLE_PRIVATE_KEY` | Service-account private key. Server only |
| `RESEND_API_KEY` | Resend API key. Server only |
| `EMAIL_FROM` | From address Resend is allowed to send as |

Use either the OAuth trio (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`) or the service-account pair, together with `GOOGLE_CALENDAR_ID`. OAuth is the path that can add the visitor as an attendee and create a Meet link on a normal Google account. None of these values are read by client components.

`DATABASE_URL` format, with a placeholder password:

```text
postgresql://postgres:change-me@localhost:5432/cavli?schema=public
```

## Local setup

Prerequisites: Node.js 20.9 or later, npm, and PostgreSQL listening on `localhost:5432`.

Create the database named in `DATABASE_URL` if it does not exist. Copy the env template and replace the database password before installing, because Prisma Client generation reads `DATABASE_URL`.

```bash
copy .env.example .env
npm install
npx prisma migrate deploy
npm run dev
```

Open the URL Next.js prints. The default is [http://localhost:3000](http://localhost:3000). If that port is already in use, Next.js chooses another port.

Add Google and Resend values to `.env.local`, then restart `npm run dev`. Next.js reads that file only at startup.

Apply the scraper after migrations, when a fresh catalogue import is needed:

```bash
npm run scrape
```

Check the database connection:

```powershell
"SELECT 1;" | npx prisma db execute --stdin
```

## Validation

```bash
npx tsc --noEmit
npx eslint .
npx prisma validate
npx prisma migrate status
```

`npm run lint` runs ESLint as configured in `package.json`. `npx prisma validate` checks the schema without opening a connection. `npx prisma migrate status` reports whether the local database has the migrations in `prisma/migrations/`.

## Assignment requirements

- [x] Hubble landing page with five features
- [x] Product detail routes at `/products/[slug]`, including an unknown-slug page
- [x] Interactive GLB viewer with rotate and zoom controls, a loading state, and an error state
- [x] Live exhibitor data from PostgreSQL in the header, exhibitor section, and footer
- [x] MMI scraper pagination past 20 results, stopping from the API response
- [x] Re-runs upsert on `mmi_customer_id` and do not insert a second exhibitor for the same customer
- [x] Consult Now fields, validation, and no full-page reload
- [x] Weekday slot list, selection, and double-booking protection on `slot_start`
- [x] Google Calendar event, attendee, and Meet URL taken from the Calendar response
- [x] Confirmation email through Resend with name, date, time, optional company, and Meet link
- [x] Booking columns on `consultations`, including event id, Meet URL, and booking status
- [x] Normalized schema, documented in `docs/database-schema.md`
- [ ] Demo video or hosted demo link

## Demo

Add the screen recording or demo URL here before submission:

```text
Demo:
```

## Notes

- Google Calendar, Meet, and Resend run only when the matching variables in `.env.local` are real values for the accounts you control. Placeholder values do not create an event or send mail.
- The Meet URL stored in PostgreSQL is the link Calendar returns. The application does not invent one. If that link is missing, the event is removed and the slot returns to `PENDING`.
- Resend will reject `EMAIL_FROM` until that sender is allowed on the Resend account. A verified domain is required to deliver to an address other than the Resend account email.
- `products` and `product_features` are in the schema. The pages render `lib/data/products.ts`.
- Do not commit `.env` or `.env.local`.
