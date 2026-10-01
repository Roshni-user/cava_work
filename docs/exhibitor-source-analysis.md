# Exhibitor Source Analysis

Inspected on 28 September 2026. The current application foundation was not changed.

## Source URL

https://mmiconnect.in/app/catalogue/exhibitors/ep-blr-2026?first=100

The path segment `ep-blr-2026` is the catalogue group. `first=100` is the page size. This group contains two shows:

| Show id | Show name | Exhibitors |
| --- | --- | --- |
| 122 | electronica India - Bangalore | 583 |
| 123 | productronica India - Bangalore | 231 |

Both shows use the same dates in the list response: start `2026-09-16T00:00:00`, end `2026-09-18T23:59:00`.

## How the Data Is Loaded

The first HTML response is an Angular application shell. It contains a splash screen and JavaScript bundles. It does not contain exhibitor records.

The browser then loads the list from GraphQL:

- Endpoint: `POST https://mmiconnect.in/graphql`
- Operation name: `getExhibitorListForGroup`
- Root field: `catalogueQueries.exhibitorsWithWishListGroup`
- Authentication: none was required for this anonymous catalogue query

A separate REST call, `GET https://mmiconnect.in/getshows`, returns show codes such as `ep-blr-2026`. It does not return exhibitor records.

The list card links to a detail route:

`/app/catalogue/exhibitor-detail/{group}/{showId}/{userId}`

Example:

`/app/catalogue/exhibitor-detail/ep-blr-2026/122/89ad4c93-9578-41a8-8b58-71cdd3d5e17d`

That page loads another anonymous GraphQL operation on the same endpoint:

- Operation name: `catalogueDetailQuery`
- Root field: `globalAnonymousQueries.customers(userId, showId)`

The list response does not include address, website, contact, categories, or products. Those fields are on the detail response.

Admin operations whose names end in `Show` are routed to a different path, `/{tenant}/showgraphql`. They were not used for this catalogue and are not part of the anonymous list.

## Exhibitor Fields

Values below come from the live list of 814 exhibitors and from one detail record: customer id `1244989`, Shandong Hongbao Electronics Co., Ltd., show `122`. Contact numbers, email addresses, and tax identifiers were returned for that record but are not copied here.

### List response

Returned by `getExhibitorListForGroup`. Counts are across all 814 records.

| Field | Source location | Example | Notes |
| --- | --- | --- | --- |
| customer.id | list `exhibitors[].customer.id` | 1244989 | Integer. Unique for all 814 records. Same id is returned by the detail query. |
| customer.userId | list `exhibitors[].customer.userId` | 89ad4c93-9578-41a8-8b58-71cdd3d5e17d | UUID used in the detail URL. 807 distinct values, so 7 values repeat. |
| customer.showId | list `exhibitors[].customer.showId` | 122 | 122 or 123 in this group. |
| customer.companyName | list `exhibitors[].customer.companyName` | ` Shandong Hongbao Electronics Co., Ltd.` | Present for every record. Some values have leading or trailing spaces. Trimmed names are not unique. |
| customer.country | list `exhibitors[].customer.country` | China | Present for every record. 17 distinct countries. |
| customer.squareLogo | list `exhibitors[].customer.squareLogo` | `https://mmiconnectstorage.azureedge.net/global-profile/exhibitor-square-logo-1784811296205.png` | Missing for 492 of 814 records. |
| exhibitorDetail.hallNo | list `exhibitors[].customer.exhibitorDetail.hallNo` | 2 | Missing for 6 records. |
| exhibitorDetail.boothNo | list `exhibitors[].customer.exhibitorDetail.boothNo` | H2.D26 | Missing for 6 records. |
| exhibitorDetail.exhibitorType | list `exhibitors[].customer.exhibitorDetail.exhibitorType` | null | Present in the response and null for all 814 records. |
| exhibitorDetail.sponsorship | list `exhibitors[].customer.exhibitorDetail.sponsorship` | null | Present in the response and null for all 814 records. |
| show.showName | list `exhibitors[].customer.show.showName` | electronica India - Bangalore | Repeated for every exhibitor in that show. |
| show.startDate | list `exhibitors[].customer.show.startDate` | 2026-09-16T00:00:00 | Same value for both shows in this group. |
| show.endDate | list `exhibitors[].customer.show.endDate` | 2026-09-18T23:59:00 | Same value for both shows in this group. |
| customerRating.id | list `exhibitors[].customerRating` | null | Null for every anonymous request. It reflects a signed-in wishlist state. |
| appoinment.id | list `exhibitors[].appoinment` | null | Null for every anonymous request. The field name is spelled `appoinment` in the API. It reflects a signed-in meeting request. |
| totalCount | list `exhibitorsWithWishListGroup.totalCount` | 814 | Full catalogue size, repeated on every page. |

The same list request also returns `selectedCustomerCategories` for the category filter. That list is the catalogue vocabulary, not the categories of one exhibitor. The inspected response contained 384 categories: 44 `MAINCATEGORY`, 302 `CATEGORY`, and 38 `SUBCATEGORY`, all with `categoryType` `EXHIBITOR`.

| Field | Source location | Example | Notes |
| --- | --- | --- | --- |
| id | `selectedCustomerCategories[].id` | 21372 | Category id. |
| mainCategory | `selectedCustomerCategories[].mainCategory` | Displays and LEDs | 44 distinct main categories in the filter list. |
| categoryName | `selectedCustomerCategories[].categoryName` | empty string on a main category | Populated for some category rows, empty for main-category rows. |
| categoryType | `selectedCustomerCategories[].categoryType` | EXHIBITOR | |
| productCategoryType | `selectedCustomerCategories[].productCategoryType` | MAINCATEGORY | Also `CATEGORY` and `SUBCATEGORY`. |

### Detail response

Returned by `catalogueDetailQuery` for customer `1244989`. This is one record, so empty fields here are not proven empty for the whole catalogue.

| Field | Source location | Example | Notes |
| --- | --- | --- | --- |
| id | `customers.id` | 1244989 | Matches `customer.id` from the list. |
| companyName | `customers.companyName` | ` Shandong Hongbao Electronics Co., Ltd.` | Same leading space as the list. |
| address1 | `customers.address1` | populated | Street address was returned. Not copied into this document. |
| city | `customers.city` | Jinan | |
| state | `customers.state` | Guangdong Sheng | |
| country | `customers.country` | China | |
| postalCode | `customers.postalCode` | 250000 | |
| website | `customers.website` | http://jnhongbao.com | |
| companyProfile | `customers.companyProfile` | populated | Long text was returned. |
| typeOfExhibitor | `customers.typeOfExhibitor` | Dealer | |
| title | `customers.title` | Ms. | Contact title. |
| firstName | `customers.firstName` | populated | Contact given name. Not copied here. |
| lastName | `customers.lastName` | populated | Contact family name. Not copied here. |
| designation | `customers.designation` | Manager | |
| emailAddress | `customers.emailAddress` | populated | Not copied here. |
| mobileNo | `customers.mobileNo` | populated | Not copied here. |
| telephoneNo | `customers.telephoneNo` | populated | Not copied here. |
| aCTele | `customers.aCTele` | empty | Empty for this record. |
| fax | `customers.fax` | empty | Empty for this record. |
| gSTNo | `customers.gSTNo` | empty | Empty for this record. |
| tANNumber | `customers.tANNumber` | empty | Empty for this record. |
| pANNo | `customers.pANNo` | empty | Empty for this record. |
| associations | `customers.associations` | empty | Empty for this record. |
| exhibitorDetail.boothNo | `customers.exhibitorDetail.boothNo` | H2.D26 | |
| exhibitorDetail.hallNo | `customers.exhibitorDetail.hallNo` | 2 | |
| exhibitorDetail.boothType | `customers.exhibitorDetail.boothType` | Shell Scheme | Not included in the list query. |
| exhibitorDetail.sQM | `customers.exhibitorDetail.sQM` | 12 | |
| exhibitorDetail.interestedSQM | `customers.exhibitorDetail.interestedSQM` | populated | A number was returned. |
| exhibitorDetail.headquarterAddress | `customers.exhibitorDetail.headquarterAddress` | populated | |
| exhibitorDetail.shortCompanyProfile | `customers.exhibitorDetail.shortCompanyProfile` | populated | |
| exhibitorDetail.showCatalogueName | `customers.exhibitorDetail.showCatalogueName` | a person's name | This is not the show name. The show name comes from `show.showName`. |
| exhibitorDetail.participatedBy | `customers.exhibitorDetail.participatedBy` | populated | |
| exhibitorDetail.participatedCountry | `customers.exhibitorDetail.participatedCountry` | empty | Empty for this record. |
| exhibitorDetail.alternateEmail | `customers.exhibitorDetail.alternateEmail` | populated | Not copied here. |
| exhibitorDetail.gSTStatus | `customers.exhibitorDetail.gSTStatus` | empty | Empty for this record. |
| customerCategories | `customers.customerCategories` | 7 rows | See the category table below. |
| products | `customers.products` | empty array | The field exists. This exhibitor had no product names. |

Each `customerCategories` row from this record:

| Field | Source location | Example | Notes |
| --- | --- | --- | --- |
| id | `customerCategories[].id` | 4797854 | Junction id, not the category id. |
| category.id | `customerCategories[].category.id` | 21551 | Shared category id. |
| category.mainCategory | `customerCategories[].category.mainCategory` | Medical | |
| category.subCategory | `customerCategories[].category.subCategory` | null or empty string | Empty on all 7 rows of this record. |
| category.categoryName | `customerCategories[].category.categoryName` | Inductors and accessories | Empty on main-category rows. Populated on the category-level row. |
| category.categoryType | `customerCategories[].category.categoryType` | SECTOR | Also `EXHIBITOR` on other rows of the same record. |
| category.productCategoryType | `customerCategories[].category.productCategoryType` | MAINCATEGORY | Also `CATEGORY`. |

## Pagination

The catalogue reports `totalCount` 814. Each request returns at most 100 exhibitors. Nine requests return every record: eight pages of 100 and a last page of 14.

The UI paginator offers only 100 items per page. If the `first` query parameter is absent, the page code also uses 100. The on-screen label for the first page is `1 – 100 of 814`.

GraphQL variables, not a cursor string, control the page:

- `group`: `ep-blr-2026`
- `first`: page size, an integer
- `after`: an integer offset, not a cursor
- `where`: an array of filters, empty when unfiltered

The page calculates:

`after = pageIndex * pageSize - 1`

`pageIndex` is zero-based.

| Page | pageIndex | GraphQL `after` | Records |
| --- | --- | --- | --- |
| 1 | 0 | -1 | 100 |
| 2 | 1 | 99 | 100 |
| 3 | 2 | 199 | 100 |
| 4 | 3 | 299 | 100 |
| 5 | 4 | 399 | 100 |
| 6 | 5 | 499 | 100 |
| 7 | 6 | 599 | 100 |
| 8 | 7 | 699 | 100 |
| 9 | 8 | 799 | 14 |

The browser URL writes `after` only when that calculated value is greater than 1, so the first page URL has no `after`. Page 2 is requested as `?first=100&after=99`.

Page 1 starts with Shandong Hongbao Electronics Co., Ltd. Page 2 starts with GUANGDONG RUICHI INTELLIGENT EQUIPMENT CO.,LTD. The last page ends with znt-Richter | znt Zentren für Neue Technologien GmbH.

Optional filters seen in the page code, and not required to read the full list:

| URL parameter | GraphQL variable | Comparison |
| --- | --- | --- |
| searchCompany | `where` on `companyName` | `contains` |
| startCompany | `where` on `companyName` | `startsWith` |
| searchKeyword | `keyword` | |
| searchCategory | `categoryIds` | integer category ids |
| searchShow | `where` on `showId` | `in` |

Comparison values used by the client are lowercase: `contains`, `startsWith`, `equal`, and `in`.

To retrieve every exhibitor, call `getExhibitorListForGroup` with `group = "ep-blr-2026"`, `first = 100`, and `after` set to `-1`, then `99`, `199`, and so on while `after + 1 < totalCount`.

## Unique Identifier

`customer.id` is the safe single-column upsert key. It is an integer, it is present on both the list and the detail response, and all 814 values in this catalogue are distinct.

`userId` is not safe alone. Seven user ids appear more than once. The pair `showId` + `userId` is unique for all 814 records, and that pair is what the public detail URL uses. It is a valid alternate key, with `customer.id` as the primary external id.

`companyName` is not unique. After trimming, 9 names repeat. Examples include "messe muenchen india" (4 rows) and "electronics city industries association" (3 rows).

## Relationships / Repeated Data

These source values repeat and should not be copied onto every exhibitor row:

- Show identity and dates. Only two shows exist in this group, and every exhibitor repeats `showId`, `showName`, `startDate`, and `endDate`.
- Categories. The same category id appears in the shared filter vocabulary and on individual exhibitors. An exhibitor has many categories, and a category applies to many exhibitors. The link itself has a separate id (`customerCategories[].id`).
- Category hierarchy. `mainCategory`, `categoryName`, and `productCategoryType` describe the category, not the exhibitor.
- Products. The detail payload has a `products` list. The inspected exhibitor returned an empty list, so no product name was available to quote. The shape is still a one-to-many child of the exhibitor.

These are attributes of one participation, not separate repeating groups in the inspected data:

- Booth and hall. They are strings on the exhibitor detail (`H2.D26`, hall `2`). The source does not provide a separate booth id.
- One contact name, title, designation, email, and phone on the customer. No second contact object was returned.
- Country. It is a repeated string with no extra country attributes in the source.

`customerRating` and `appoinment` depend on the signed-in visitor. They were null for the anonymous catalogue and should not become exhibitor columns.

`exhibitorType` and `sponsorship` are always null in this catalogue's list payload.

## Proposed Database Model

Conceptual only. No Prisma schema is included.

`CatalogueGroup`

- Natural key: group code, such as `ep-blr-2026`.

`Show`

- Source id, such as 122 or 123.
- Belongs to one `CatalogueGroup`.
- Name, start date, and end date.

`Exhibitor`

- One row per participation.
- Unique source key: `customer.id`.
- Alternate unique key: `showId` + `userId`.
- Foreign key to `Show`.
- Company name, country, website, logo URL, address, postal code, profiles, exhibitor type, booth number, hall number, booth type, square metres, and the single contact fields returned on the customer.
- Nullable booth, hall, and logo, because the list contains missing values.

`Category`

- Source category id.
- Main category, subcategory, category name, category type, and product category type.

`ExhibitorCategory`

- Source junction id from `customerCategories[].id`.
- Foreign keys to `Exhibitor` and `Category`.
- Unique on the exhibitor and category pair.

`Product`

- Belongs to one `Exhibitor`.
- Product name from `customers.products`.
- Keep this table only if detail requests show product names. The one inspected detail response had none.

Country stays as text on `Exhibitor`. A country table would not remove a transitive dependency because the source has no other country attributes.

## Scraper Implementation Notes

The scraper should post JSON to `https://mmiconnect.in/graphql`. It should not parse the initial HTML for records.

1. Request `getExhibitorListForGroup` for group `ep-blr-2026` with `first` 100 and `after` starting at -1.
2. Read `totalCount` and store the page. Request the next page with `after` increased by 100. The tested sequence is -1, 99, 199, 299, 399, 499, 599, 699, 799.
3. Stop when the number of stored list rows equals `totalCount`.
4. Upsert each list row by `customer.id`.
5. For each exhibitor, request `catalogueDetailQuery` with that row's `userId` and `showId`.
6. Upsert the show from the repeated show fields, and upsert categories through the junction ids returned on the detail.
7. Trim company names before display. Preserve the source id even when the name repeats.
8. Treat missing logo, booth, and hall as null.
9. Ignore `customerRating` and `appoinment` for anonymous imports.
10. Do not call the admin `*Show` operations on `showgraphql`.

The detail step is 814 additional requests. Only one detail record was inspected during this analysis, so contact, tax, and product fields still need to be treated as optional until the scraper sees the full set.
