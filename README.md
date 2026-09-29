# Cavli Wireless

Full-stack Hubble assignment for Cavli Wireless. The application has two parts:

1. A Hubble landing page that presents connectivity features, links each feature to its own page, shows live MMI exhibitors, and accepts a Consult Now request.
2. An MMI Connect exhibitor scraper that reads the public catalogue over GraphQL, pages through the full result set, and upserts exhibitors into PostgreSQL.

## Demo

🎥 [Watch the Demo Video](https://drive.google.com/file/d/1xpR5TswBQ5F2o7UoKb-H2YdJ0inZwlhb/view?usp=drive_link)

## Tech stack

- Next.js 16 (App Router) and React 19
- TypeScript
- Tailwind CSS 4
- PostgreSQL
- Prisma 7, with the `pg` driver through `@prisma/adapter-pg`
- ESLint
- `tsx` runs the scraper script
- `dotenv` loads `.env` for the Prisma CLI and the scraper script

PostgreSQL runs as a local server. Docker is not required and is not used. Docker Compose is an optional way to run PostgreSQL; this project connects to a local installation through `DATABASE_URL`.

## Landing page

`/` is the Hubble landing page. It includes a header, hero, introduction, feature section, exhibitor section, Consult Now form, and footer.

Five features are defined in `lib/data/products.ts` and rendered on the page:

- Cellular connectivity — `/products/cellular-connectivity`
- GNSS positioning — `/products/gnss-positioning`
- Edge processing — `/products/edge-processing`
- Device management — `/products/device-management`
- Secure connectivity — `/products/secure-connectivity`

`/products/[slug]` is one dynamic route. It reads the same feature list, sets the page title from the feature name, and calls `notFound()` for an unknown slug. These pages are not loaded from the `products` table.

The header, exhibitor section, and footer share one client fetch of `GET /api/exhibitors`. That route reads exhibitors from PostgreSQL. The header shows the catalogue count. The exhibitor section lists each company with its show, country, hall, and booth. The footer lists up to six company names. Each surface has loading, empty, and error states. The page does not ship placeholder companies.

Layout and navigation use Tailwind responsive styles, including a collapsible header menu on a narrow viewport.

## Consult Now

The form is on the landing page. It posts JSON to `POST /api/consult` with `fetch` and `preventDefault()`, so the browser does not reload the page.

| Field | Required | Notes |
| --- | --- | --- |
| Name | Yes | Trimmed. Maximum 200 characters. |
| Email | Yes | Trimmed. Maximum 320 characters. Must match an email shape. |
| Phone | Yes | Trimmed. Maximum 40 characters. |
| Company | No | Trimmed. Maximum 200 characters. A blank value is stored as null. |
| Message | Yes | Trimmed. Maximum 5000 characters. |

The browser checks the same required fields and email shape before the request. The API repeats those checks. Invalid input returns HTTP 400 with a field error map. A valid request inserts one row in `consultations` and returns HTTP 201 with `{ "success": true, "message": "Consultation request received." }`. The form does not send a Hubble product id, so `product_id` stays null.

While the request is in flight, the fields and the submit button are disabled and the button label is “Sending…”. After a 201 response, the form clears and shows “Your consultation request was received.” A validation error, HTTP error, or network failure stays on the page, keeps the entered values, and shows an inline error. Database and connection details are not shown to the visitor.

## Exhibitor scraper

The source is the public MMI Connect catalogue at `https://mmiconnect.in/graphql`. No MMI credentials are used.

The list query is `getExhibitorListForGroup` for the group in `MMI_CATALOGUE_GROUP` (default `ep-blr-2026`). Each exhibitor’s extra fields come from `catalogueDetailQuery`, called with that exhibitor’s `userId` and `showId`.

`customer.id` from MMI is stored as `exhibitors.mmi_customer_id`. That column is unique and is the upsert key. `userId` is not unique on its own. Company name is not unique.

Run the scraper after PostgreSQL is up and the migration has been applied:

```bash
npm run scrape
```

The same import is available while the Next.js server is running:

```bash
curl -X POST http://localhost:3000/api/scrape/exhibitors
```

Both paths return the counts from that run: pages processed, processed, created, updated, skipped, and failed. A second request while a scrape is already running returns HTTP 409.

`MMI_PAGE_SIZE` defaults to 100. `MMI_DETAIL_CONCURRENCY` defaults to 4.

## Pagination

The list query is paged. The scraper does not stop after 20 rows and does not hardcode a catalogue size.

`MMI_PAGE_SIZE` sets `first` (100 unless `.env` changes it). The first request uses `after = -1`. Each following request sets `after` to the previous offset plus the page size, so the offsets are `-1`, then `99`, `199`, `299`, and so on when the page size is 100.

Each response includes `totalCount` and the exhibitors on that page. The loop requests another page until one of these is true:

- the page contains no exhibitors, or `totalCount` is 0
- the page adds no new `customer.id` values
- the number of distinct customer ids already seen is at least `totalCount`
- the page is shorter than the page size
- the number of pages exceeds `ceil(totalCount / pageSize) + 1`

A catalogue larger than 20 exhibitors is therefore read in full, one page at a time, using the count and page length returned by MMI.

## Upsert

Re-running the scraper does not insert a second exhibitor for the same MMI customer.

For each list row, the scraper looks up `exhibitors` by `mmi_customer_id`. Prisma then upserts on that unique column: a missing row is created, and an existing row is updated with the latest company, booth, hall, and profile fields. The run summary counts that outcome as `created` or `updated`.

Related rows are upserted on their own unique keys and stale children are removed:

- `catalogue_groups.code`
- `shows.mmi_show_id`
- `addresses` on `(exhibitor_id, kind)`
- `contacts.exhibitor_id`
- `contact_points` on `(contact_id, kind)`
- `categories.mmi_category_id`
- `exhibitor_categories.mmi_customer_category_id` and `(exhibitor_id, category_id)`
- `exhibitor_products` on `(exhibitor_id, name)`

A second successful run of the same catalogue should report `created` as 0 and `updated` for the exhibitors already stored. The exhibitor count should stay one row per `mmi_customer_id`.

## Database design

The schema is `prisma/schema.prisma`. The applied SQL is `prisma/migrations/20260928090000_init/migration.sql`. A longer explanation is in `docs/database-schema.md`.

Internal primary keys are UUIDs. MMI identifiers are stored in separate unique columns. `customerRating`, `appoinment`, and `totalCount` are not stored.

The `products` and `product_features` tables are part of the schema. The current landing page and product routes read `lib/data/products.ts` and do not query those tables.

PostgreSQL enums:

- `address_kind`: `REGISTERED`, `HEADQUARTERS`
- `contact_point_kind`: `EMAIL`, `ALTERNATE_EMAIL`, `MOBILE`, `TELEPHONE`, `FAX`, `AREA_CODE_TELEPHONE`

### catalogue_groups

One row per MMI catalogue group, such as `ep-blr-2026`.

| Column | Type | Nullable | Constraints |
| --- | --- | --- | --- |
| id | uuid | no | Primary key |
| code | text | no | Unique |
| created_at | timestamp(3) | no | Default now |
| updated_at | timestamp(3) | no | |

Relationships: one catalogue group has many `shows`.

### shows

One row per MMI show. Show name and dates live here, not on each exhibitor.

| Column | Type | Nullable | Constraints |
| --- | --- | --- | --- |
| id | uuid | no | Primary key |
| mmi_show_id | integer | no | Unique. Source `showId` |
| catalogue_group_id | uuid | no | Foreign key to `catalogue_groups.id`. Delete restricted |
| name | text | no | |
| start_date | timestamp(3) | no | |
| end_date | timestamp(3) | no | |
| created_at | timestamp(3) | no | Default now |
| updated_at | timestamp(3) | no | |

Index: `catalogue_group_id`.

Relationships: many shows belong to one catalogue group. One show has many exhibitors.

### exhibitors

One row per MMI participation. This is the upsert target.

| Column | Type | Nullable | Constraints |
| --- | --- | --- | --- |
| id | uuid | no | Primary key |
| mmi_customer_id | integer | no | Unique. Source `customer.id`. Upsert key |
| user_id | uuid | no | Source `customer.userId` |
| show_id | uuid | no | Foreign key to `shows.id`. Delete restricted |
| company_name | text | no | Not unique |
| website | text | yes | |
| logo_url | text | yes | |
| company_profile | text | yes | |
| short_company_profile | text | yes | |
| show_catalogue_name | text | yes | Catalogue display name, not the show name |
| type_of_exhibitor | text | yes | |
| participated_by | text | yes | |
| participated_country | text | yes | |
| associations | text | yes | |
| gst_number | text | yes | |
| tan_number | text | yes | |
| pan_number | text | yes | |
| gst_status | text | yes | |
| exhibitor_type | text | yes | |
| sponsorship | text | yes | |
| booth_number | text | yes | |
| hall_number | text | yes | |
| booth_type | text | yes | |
| square_metres | decimal(10,2) | yes | |
| interested_square_metres | decimal(10,2) | yes | |
| created_at | timestamp(3) | no | Default now |
| updated_at | timestamp(3) | no | |

Unique: `(show_id, user_id)`. Index: `company_name`.

Relationships: many exhibitors belong to one show. One exhibitor has many addresses, at most one contact, many category links, and many catalogue products.

### addresses

| Column | Type | Nullable | Constraints |
| --- | --- | --- | --- |
| id | uuid | no | Primary key |
| exhibitor_id | uuid | no | Foreign key to `exhibitors.id`. Delete cascades |
| kind | address_kind | no | `REGISTERED` or `HEADQUARTERS` |
| line1 | text | yes | |
| city | text | yes | |
| state | text | yes | |
| country | text | yes | Country is text on the registered address |
| postal_code | text | yes | |
| created_at | timestamp(3) | no | Default now |
| updated_at | timestamp(3) | no | |

Unique: `(exhibitor_id, kind)`.

Relationships: many addresses belong to one exhibitor. At most one row of each kind.

### contacts

| Column | Type | Nullable | Constraints |
| --- | --- | --- | --- |
| id | uuid | no | Primary key |
| exhibitor_id | uuid | no | Unique. Foreign key to `exhibitors.id`. Delete cascades |
| title | text | yes | |
| first_name | text | yes | |
| last_name | text | yes | |
| designation | text | yes | |
| created_at | timestamp(3) | no | Default now |
| updated_at | timestamp(3) | no | |

Relationships: one exhibitor has zero or one contact. One contact has many contact points.

### contact_points

| Column | Type | Nullable | Constraints |
| --- | --- | --- | --- |
| id | uuid | no | Primary key |
| contact_id | uuid | no | Foreign key to `contacts.id`. Delete cascades |
| kind | contact_point_kind | no | One channel type |
| value | text | no | |
| created_at | timestamp(3) | no | Default now |
| updated_at | timestamp(3) | no | |

Unique: `(contact_id, kind)`.

Relationships: many contact points belong to one contact.

### categories

| Column | Type | Nullable | Constraints |
| --- | --- | --- | --- |
| id | uuid | no | Primary key |
| mmi_category_id | integer | no | Unique. Source category id |
| main_category | text | no | |
| sub_category | text | yes | |
| category_name | text | yes | |
| category_type | text | no | |
| product_category_type | text | no | |
| created_at | timestamp(3) | no | Default now |
| updated_at | timestamp(3) | no | |

Index: `(category_type, product_category_type)`.

Relationships: one category is linked to many exhibitors through `exhibitor_categories`.

### exhibitor_categories

| Column | Type | Nullable | Constraints |
| --- | --- | --- | --- |
| id | uuid | no | Primary key |
| mmi_customer_category_id | integer | no | Unique. Source junction id |
| exhibitor_id | uuid | no | Foreign key to `exhibitors.id`. Delete cascades |
| category_id | uuid | no | Foreign key to `categories.id`. Delete restricted |
| created_at | timestamp(3) | no | Default now |
| updated_at | timestamp(3) | no | |

Unique: `(exhibitor_id, category_id)`. Index: `category_id`.

Relationships: many-to-many between exhibitors and categories.

### exhibitor_products

Catalogue product names from MMI. These are not the Hubble feature pages.

| Column | Type | Nullable | Constraints |
| --- | --- | --- | --- |
| id | uuid | no | Primary key |
| exhibitor_id | uuid | no | Foreign key to `exhibitors.id`. Delete cascades |
| name | text | no | |
| created_at | timestamp(3) | no | Default now |
| updated_at | timestamp(3) | no | |

Unique: `(exhibitor_id, name)`.

Relationships: many catalogue products belong to one exhibitor.

### products

Hubble product table. Present in the schema. The current UI does not read or write it.

| Column | Type | Nullable | Constraints |
| --- | --- | --- | --- |
| id | uuid | no | Primary key |
| slug | text | no | Unique |
| name | text | no | |
| summary | text | yes | |
| description | text | yes | |
| created_at | timestamp(3) | no | Default now |
| updated_at | timestamp(3) | no | |

Relationships: one product has many `product_features` and many `consultations`.

### product_features

| Column | Type | Nullable | Constraints |
| --- | --- | --- | --- |
| id | uuid | no | Primary key |
| product_id | uuid | no | Foreign key to `products.id`. Delete cascades |
| title | text | no | |
| description | text | yes | |
| sort_order | integer | no | |
| created_at | timestamp(3) | no | Default now |
| updated_at | timestamp(3) | no | |

Unique: `(product_id, sort_order)`.

Relationships: many features belong to one product.

### consultations

Rows written by `POST /api/consult`. These are form submissions, not MMI contacts.

| Column | Type | Nullable | Constraints |
| --- | --- | --- | --- |
| id | uuid | no | Primary key |
| name | text | no | |
| email | text | no | |
| phone | text | yes | The API requires a value. The column remains nullable. |
| company_name | text | yes | |
| message | text | no | |
| product_id | uuid | yes | Foreign key to `products.id`. Set null if that product is deleted |
| created_at | timestamp(3) | no | Default now |

Indexes: `email`, `product_id`, `created_at`.

Relationships: many consultations may optionally reference one product. The current form leaves `product_id` null.

## 3NF

The design keeps each fact on the entity that owns it.

First normal form: categories, contact channels, addresses, and catalogue product names are rows. They are not stored as comma-separated lists or repeated column groups on `exhibitors`.

Second normal form: each table uses a single-column primary key. Where another unique key is composite, the descriptive columns still depend on the whole key. Exhibitor company and booth depend on `mmi_customer_id`, and also on the pair `(show_id, user_id)`. They do not depend on `user_id` alone. A contact point value depends on `(contact_id, kind)`. Category names live on `categories`, not on the exhibitor-category pair.

Third normal form: non-key columns depend on the key, not on another non-key column.

- Show name and dates are columns of `shows`. An exhibitor stores `show_id` only.
- Category labels are columns of `categories`, keyed by `mmi_category_id`. `exhibitor_categories` stores the two foreign keys and the source junction id.
- Email, phone, and fax are rows in `contact_points`, not a widening set of columns on `contacts`.
- Country is a column of the registered address. It does not determine another stored fact, so there is no country table.
- Booth and hall are columns of the exhibitor participation. The source has no separate booth entity.
- A consultation stores `product_id` when a product is chosen. It does not copy the product name. The current API does not set `product_id`.

## API endpoints

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/exhibitors` | Return exhibitor previews from PostgreSQL for the header, exhibitor section, and footer. |
| POST | `/api/consult` | Validate a Consult Now submission and insert a `consultations` row. |
| POST | `/api/scrape/exhibitors` | Run the MMI scraper and return that run’s summary. |

`GET /api/exhibitors` returns `{ "exhibitors": [...] }` or HTTP 500 with `{ "message": "Exhibitor catalogue is unavailable." }`.

## Setup

Prerequisites:

- Node.js 20.9 or later
- npm
- PostgreSQL listening on `localhost:5432`

Docker is not used. Install and start PostgreSQL locally, then create the database named in `DATABASE_URL` if it does not exist.

Copy the environment template and replace the placeholder password before `npm install`. Prisma Client generation reads `DATABASE_URL`.

```bash
copy .env.example .env
```

`DATABASE_URL` format, with a placeholder password:

```text
postgresql://postgres:change-me@localhost:5432/cavli?schema=public
```

Other variables in `.env.example`:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string used by Prisma and the app |
| `MMI_GRAPHQL_URL` | Public MMI GraphQL endpoint |
| `MMI_CATALOGUE_GROUP` | Catalogue group, `ep-blr-2026` |
| `MMI_PAGE_SIZE` | List page size, default 100 |
| `MMI_DETAIL_CONCURRENCY` | Parallel detail requests, default 4 |

Install dependencies. `postinstall` runs `prisma generate`.

```bash
npm install
```

Apply the existing migration:

```bash
npx prisma migrate deploy
```

Start the application:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Check that Prisma can reach PostgreSQL:

```powershell
"SELECT 1;" | npx prisma db execute --stdin
```

`npx prisma validate` checks the schema without opening a connection. After a schema change, run `npx prisma generate`.

## Scraper usage

PostgreSQL must be running and the migration applied.

```bash
npm run scrape
```

Or, with the dev server already running:

```bash
curl -X POST http://localhost:3000/api/scrape/exhibitors
```

The JSON summary reports `pagesProcessed`, `processed`, `created`, `updated`, `skipped`, and `failed` for that run.

## Verification

- Landing page: open [http://localhost:3000](http://localhost:3000) and confirm the header, feature cards, exhibitor section, and Consult Now form.
- Product pages: open each `/products/[slug]` link from a feature card. Open `/products/not-a-feature` and confirm the not-found page.
- Live exhibitors: `GET /api/exhibitors` returns company names from PostgreSQL, and the header count matches that list. An empty table shows the empty state. A database error shows the unavailable state.
- Consult persistence: submit the form, confirm the inline success message, and query `consultations` for the new row. Submit with a missing name or an invalid email and confirm the page stays in place and shows an inline error.
- Pagination: run `npm run scrape` and confirm the log prints more than one page when `total` is greater than the page size, and that it stops from `totalCount` and page length rather than after 20 rows.
- Upsert: run `npm run scrape` a second time. `created` should be 0 for exhibitors already stored, `updated` should count those rows, and `SELECT COUNT(*) FROM exhibitors` should still equal the number of distinct `mmi_customer_id` values.

## Project structure

```text
app/
  page.tsx                         Hubble landing page
  layout.tsx                       Header, footer, exhibitor catalogue provider
  products/[slug]/page.tsx         Feature detail route
  products/[slug]/not-found.tsx    Unknown feature
  api/consult/route.ts             POST /api/consult
  api/exhibitors/route.ts          GET /api/exhibitors
  api/scrape/exhibitors/route.ts   POST /api/scrape/exhibitors
components/                        Header, footer, landing sections, consult form
lib/
  data/products.ts                 Hubble feature copy used by the pages
  prisma.ts                        Shared Prisma Client
  consultations.ts                 Consult validation and insert
  exhibitor-catalogue.ts           Exhibitor preview query
  scraper/mmi.ts                   GraphQL list and detail client
  scraper/exhibitors.ts            Pagination, upsert, and scrape summary
prisma/schema.prisma               PostgreSQL schema
prisma/migrations/                 Applied SQL migration
prisma7.config.ts                  Prisma CLI database URL
scripts/scrape-exhibitors.ts       npm run scrape
docs/database-schema.md            Schema and 3NF notes
docs/exhibitor-source-analysis.md  MMI GraphQL source notes
```

## Assignment checklist

- [x] Hubble landing page
- [x] Product links and `/products/[slug]` routes
- [x] Header and footer read live exhibitor data from PostgreSQL
- [x] Consult Now form with validation, `POST /api/consult`, and no full-page reload
- [x] Consultation rows persist in `consultations`
- [x] Scraper pagination continues past 20 results until the MMI response is exhausted
- [x] Re-runs upsert on `mmi_customer_id` and do not duplicate exhibitors
- [x] Schema is normalized to 3NF, with shows, categories, addresses, contacts, and catalogue products separated from exhibitors
- [x] README documents the tables, relationships, and 3NF design

## Demo

Add the screen recording or hosted demo URL here before submission:

```text
Demo:
```

## Security

Do not commit `.env`. It is gitignored. Database passwords and `DATABASE_URL` stay in `.env` on each machine. Commit `.env.example` only, and keep its password as the placeholder `change-me`. The scraper calls the public MMI endpoint and does not put MMI or database secrets in the browser.
