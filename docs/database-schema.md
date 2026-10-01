# Database Schema

PostgreSQL schema for the Cavli Wireless application. It is defined in `prisma/schema.prisma`. The MMI scraper loads exhibitor rows into the local PostgreSQL database. Hubble product rows and consultation rows are not seeded.

The migration file `prisma/migrations/20260928090000_init/migration.sql` was generated from that schema and is applied to local PostgreSQL with `npx prisma migrate deploy`.

MMI fields come from `docs/exhibitor-source-analysis.md`. `customerRating` and `appoinment` are signed-in visitor state and are not stored. `totalCount` is a page-level count, not an exhibitor attribute.

`products` and `consultations` are application tables for the later Hubble pages. They are not MMI catalogue fields, and they contain no seed data.

## Tables

Internal primary keys are UUIDs. MMI identifiers are stored in separate unique columns so a re-run can upsert without treating the source id as this database's primary key.

### catalogue_groups

One row per MMI catalogue group, such as `ep-blr-2026`.

| Column | Data type | Nullable | Constraints |
| --- | --- | --- | --- |
| id | uuid | not null | Primary key |
| code | text | not null | Unique |
| created_at | timestamp(3) | not null | Default `CURRENT_TIMESTAMP` |
| updated_at | timestamp(3) | not null | |

### shows

One row per MMI show. Show name and dates are stored once here instead of on every exhibitor.

| Column | Data type | Nullable | Constraints |
| --- | --- | --- | --- |
| id | uuid | not null | Primary key |
| mmi_show_id | integer | not null | Unique. Source `showId`, such as 122 or 123 |
| catalogue_group_id | uuid | not null | Foreign key to `catalogue_groups.id`. Delete is restricted |
| name | text | not null | Source `show.showName` |
| start_date | timestamp(3) | not null | Source `show.startDate` |
| end_date | timestamp(3) | not null | Source `show.endDate` |
| created_at | timestamp(3) | not null | Default `CURRENT_TIMESTAMP` |
| updated_at | timestamp(3) | not null | |

Index: `shows_catalogue_group_id_idx` on `catalogue_group_id`.

### exhibitors

One row per MMI participation. Booth and hall stay here because the source has no separate booth id.

| Column | Data type | Nullable | Constraints |
| --- | --- | --- | --- |
| id | uuid | not null | Primary key |
| mmi_customer_id | integer | not null | Unique. Source `customer.id`. Upsert key |
| user_id | uuid | not null | Source `customer.userId` |
| show_id | uuid | not null | Foreign key to `shows.id`. Delete is restricted |
| company_name | text | not null | Source `companyName`. Not unique |
| website | text | null | Detail `website` |
| logo_url | text | null | List `squareLogo`. Missing for 492 of 814 records |
| company_profile | text | null | Detail `companyProfile` |
| short_company_profile | text | null | Detail `shortCompanyProfile` |
| show_catalogue_name | text | null | Detail `showCatalogueName`. A catalogue display name, not the show name |
| type_of_exhibitor | text | null | Detail `typeOfExhibitor` |
| participated_by | text | null | Detail `participatedBy` |
| participated_country | text | null | Detail `participatedCountry` |
| associations | text | null | Detail `associations` |
| gst_number | text | null | Detail `gSTNo` |
| tan_number | text | null | Detail `tANNumber` |
| pan_number | text | null | Detail `pANNo` |
| gst_status | text | null | Detail `gSTStatus` |
| exhibitor_type | text | null | List `exhibitorType`. Null for all 814 inspected list rows |
| sponsorship | text | null | List `sponsorship`. Null for all 814 inspected list rows |
| booth_number | text | null | `boothNo`. Missing for 6 list rows |
| hall_number | text | null | `hallNo`. Missing for 6 list rows |
| booth_type | text | null | Detail `boothType` |
| square_metres | decimal(10,2) | null | Detail `sQM` |
| interested_square_metres | decimal(10,2) | null | Detail `interestedSQM` |
| created_at | timestamp(3) | not null | Default `CURRENT_TIMESTAMP` |
| updated_at | timestamp(3) | not null | |

Unique: `(show_id, user_id)`. This matches the public detail URL and is unique for all 814 inspected rows. `user_id` alone is not unique.

Index: `exhibitors_company_name_idx` on `company_name`.

### addresses

The registered address and the headquarters address are separate rows. Country stays text on the address. The source has no other country attributes, so there is no country table.

`REGISTERED` stores detail `address1`, `city`, `state`, `country`, and `postalCode`. The list also supplies `country` before the detail request, so that value belongs on this row.

`HEADQUARTERS` stores detail `headquarterAddress` in `line1`. The source does not split that value into city, state, country, or postal code, so those columns stay null for this kind.

| Column | Data type | Nullable | Constraints |
| --- | --- | --- | --- |
| id | uuid | not null | Primary key |
| exhibitor_id | uuid | not null | Foreign key to `exhibitors.id`. Delete cascades |
| kind | address_kind | not null | `REGISTERED` or `HEADQUARTERS` |
| line1 | text | null | `address1` or `headquarterAddress` |
| city | text | null | Registered address only |
| state | text | null | Registered address only |
| country | text | null | Registered address. Source country string |
| postal_code | text | null | Registered address only |
| created_at | timestamp(3) | not null | Default `CURRENT_TIMESTAMP` |
| updated_at | timestamp(3) | not null | |

Unique: `(exhibitor_id, kind)`. One registered address and one headquarters address per exhibitor.

### contacts

The detail payload has one person: `title`, `firstName`, `lastName`, and `designation`. There is no second contact object, so an exhibitor has at most one contact row.

| Column | Data type | Nullable | Constraints |
| --- | --- | --- | --- |
| id | uuid | not null | Primary key |
| exhibitor_id | uuid | not null | Unique. Foreign key to `exhibitors.id`. Delete cascades |
| title | text | null | |
| first_name | text | null | |
| last_name | text | null | |
| designation | text | null | |
| created_at | timestamp(3) | not null | Default `CURRENT_TIMESTAMP` |
| updated_at | timestamp(3) | not null | |

### contact_points

The same person can have several contact values. Each source field is one kind:

| Kind | Source field |
| --- | --- |
| EMAIL | `emailAddress` |
| ALTERNATE_EMAIL | `alternateEmail` |
| MOBILE | `mobileNo` |
| TELEPHONE | `telephoneNo` |
| FAX | `fax` |
| AREA_CODE_TELEPHONE | `aCTele` |

| Column | Data type | Nullable | Constraints |
| --- | --- | --- | --- |
| id | uuid | not null | Primary key |
| contact_id | uuid | not null | Foreign key to `contacts.id`. Delete cascades |
| kind | contact_point_kind | not null | One of the kinds above |
| value | text | not null | Store only when the source value is present |
| created_at | timestamp(3) | not null | Default `CURRENT_TIMESTAMP` |
| updated_at | timestamp(3) | not null | |

Unique: `(contact_id, kind)`.

### categories

Shared MMI category vocabulary. The same category id appears in the catalogue filter and on many exhibitors.

| Column | Data type | Nullable | Constraints |
| --- | --- | --- | --- |
| id | uuid | not null | Primary key |
| mmi_category_id | integer | not null | Unique. Source `category.id` |
| main_category | text | not null | |
| sub_category | text | null | Empty source strings should be stored as null |
| category_name | text | null | Empty source strings should be stored as null |
| category_type | text | not null | Observed values include `EXHIBITOR` and `SECTOR` |
| product_category_type | text | not null | Observed values are `MAINCATEGORY`, `CATEGORY`, and `SUBCATEGORY` |
| created_at | timestamp(3) | not null | Default `CURRENT_TIMESTAMP` |
| updated_at | timestamp(3) | not null | |

Index: `categories_category_type_product_category_type_idx` on `(category_type, product_category_type)`.

`category_type` and `product_category_type` stay text because the source list is not a closed set owned by this application.

### exhibitor_categories

Links an exhibitor to a category. The source junction id is `customerCategories[].id`.

| Column | Data type | Nullable | Constraints |
| --- | --- | --- | --- |
| id | uuid | not null | Primary key |
| mmi_customer_category_id | integer | not null | Unique. Source junction id |
| exhibitor_id | uuid | not null | Foreign key to `exhibitors.id`. Delete cascades |
| category_id | uuid | not null | Foreign key to `categories.id`. Delete is restricted |
| created_at | timestamp(3) | not null | Default `CURRENT_TIMESTAMP` |
| updated_at | timestamp(3) | not null | |

Unique: `(exhibitor_id, category_id)`.

Index: `exhibitor_categories_category_id_idx` on `category_id`.

### exhibitor_products

Product names from the MMI detail field `products[].productName`. These are catalogue products, not Hubble site pages.

The inspected detail record returned an empty product list, and the source does not provide a product id. The re-run key is therefore the exhibitor plus the product name.

| Column | Data type | Nullable | Constraints |
| --- | --- | --- | --- |
| id | uuid | not null | Primary key |
| exhibitor_id | uuid | not null | Foreign key to `exhibitors.id`. Delete cascades |
| name | text | not null | Source `productName` |
| created_at | timestamp(3) | not null | Default `CURRENT_TIMESTAMP` |
| updated_at | timestamp(3) | not null | |

Unique: `(exhibitor_id, name)`.

### products

Hubble products for later `/products/[slug]` pages. This table is not filled from MMI. No product rows are included.

| Column | Data type | Nullable | Constraints |
| --- | --- | --- | --- |
| id | uuid | not null | Primary key |
| slug | text | not null | Unique. URL segment |
| name | text | not null | |
| summary | text | null | |
| description | text | null | |
| created_at | timestamp(3) | not null | Default `CURRENT_TIMESTAMP` |
| updated_at | timestamp(3) | not null | |

### product_features

Features that belong to one Hubble product. No feature rows are included.

| Column | Data type | Nullable | Constraints |
| --- | --- | --- | --- |
| id | uuid | not null | Primary key |
| product_id | uuid | not null | Foreign key to `products.id`. Delete cascades |
| title | text | not null | |
| description | text | null | |
| sort_order | integer | not null | Display order within the product |
| created_at | timestamp(3) | not null | Default `CURRENT_TIMESTAMP` |
| updated_at | timestamp(3) | not null | |

Unique: `(product_id, sort_order)`.

### consultations

Submissions from the Hubble consultation form. These are not MMI contacts. A row starts as `PENDING`. Confirming a slot stores the booking on the same row.

| Column | Data type | Nullable | Constraints |
| --- | --- | --- | --- |
| id | uuid | not null | Primary key |
| name | text | not null | Person submitting the form |
| email | text | not null | |
| phone | text | null | |
| company_name | text | null | Company typed on the form, not an MMI exhibitor |
| message | text | not null | |
| product_id | uuid | null | Foreign key to `products.id`. Set null if that product is deleted |
| slot_start | timestamp(3) | null | Unique. Null until a slot is claimed |
| slot_end | timestamp(3) | null | |
| google_event_id | text | null | Unique. Google Calendar event id |
| meet_url | text | null | Google Meet URL returned for that event |
| booking_status | booking_status | not null | `PENDING` or `BOOKED`. Default `PENDING` |
| booked_at | timestamp(3) | null | |
| created_at | timestamp(3) | not null | Default `CURRENT_TIMESTAMP` |

Indexes: `consultations_email_idx`, `consultations_product_id_idx`, `consultations_created_at_idx`, and `consultations_booking_status_idx`.

## Relationships

`CatalogueGroup` 1 — * `Show`. A group such as `ep-blr-2026` owns its shows.

`Show` 1 — * `Exhibitor`. Each participation belongs to one show. Deleting a show is restricted while exhibitors reference it.

`Exhibitor` 1 — * `Address`. At most one `REGISTERED` row and one `HEADQUARTERS` row.

`Exhibitor` 1 — 0..1 `Contact`. The contact person is deleted with the exhibitor.

`Contact` 1 — * `ContactPoint`. Each kind is stored once per contact.

`Exhibitor` * — * `Category` through `ExhibitorCategory`. Deleting an exhibitor removes its links. Deleting a category is restricted while links remain.

`Exhibitor` 1 — * `ExhibitorProduct`.

`Product` 1 — * `ProductFeature`. Deleting a Hubble product removes its features.

`Product` 1 — * `Consultation`. The consultation's product reference becomes null if the product is deleted. A consultation does not have to name a product.

## 3NF Explanation

### 1NF

Every column holds one value. Categories, contact channels, addresses, and catalogue product names are rows, not comma-separated lists or arrays. The two address shapes are two rows distinguished by `kind`, not a repeating set of columns such as `address1` and `address2` on the exhibitor.

### 2NF

Each table uses a single-column primary key, so non-key columns cannot depend on only part of that key.

Where a second candidate key exists, the other columns still depend on the whole candidate key:

- An exhibitor's company and booth depend on `mmi_customer_id`, and also on the full pair `(show_id, user_id)`. They do not depend on `user_id` alone.
- A contact point's `value` depends on the full pair `(contact_id, kind)`.
- An exhibitor-category link has no extra descriptive columns. The category's name lives on `categories`, so it does not depend on only the exhibitor half of the pair.
- A Hubble feature's title depends on the feature row, not on only `product_id`.

### 3NF

Non-key columns depend on the key, not on another non-key column.

- Show name and dates depend on the show, so they are not copied onto each exhibitor. The exhibitor stores `show_id` only.
- Category labels depend on `mmi_category_id`. The exhibitor link stores the two foreign keys and the source junction id.
- A contact channel depends on the contact and the channel kind. It is not repeated as email, phone, and fax columns that would have to be widened for every new channel.
- Country is an attribute of the registered address. It does not determine any other stored fact, so it is not a separate country table.
- Booth number and hall number are attributes of the participation. The source provides no booth entity with its own attributes.
- A consultation's message depends on that submission. The optional `product_id` is a reference, not a copy of the product name.

### Repeating groups removed

- Many exhibitors share two shows.
- Many exhibitors share categories.
- One exhibitor can have a registered address and a headquarters address.
- One contact can have email, an alternate email, a mobile number, a telephone number, a fax number, and an area-code telephone.
- One exhibitor can have many catalogue product names.
- One Hubble product can have many features.

### Partial dependencies removed

`user_id` repeats across shows, so exhibitor attributes are not keyed by `user_id` alone. Category text is not stored on the exhibitor-category pair, where it would depend on `category_id` but not on `exhibitor_id`.

### Transitive dependencies removed

An exhibitor does not store `show_name` through `show_id`. A category link does not store `main_category` through `category_id`. A consultation does not store the Hubble product name through `product_id`.

## Fields left out on purpose

| Source field | Reason |
| --- | --- |
| customerRating | Signed-in wishlist state. Null for the anonymous catalogue |
| appoinment | Signed-in meeting state. Null for the anonymous catalogue |
| totalCount | Page metadata, not a property of an exhibitor |

`exhibitor_type` and `sponsorship` are kept as nullable columns because the list payload includes them, even though both were null for all 814 inspected rows.
