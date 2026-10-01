const LIST_QUERY = `
  query getExhibitorListForGroup(
    $where: [WhereExpression!]
    $first: Int
    $after: Int
    $group: String
  ) {
    catalogueQueries {
      exhibitorsWithWishListGroup(
        first: $first
        where: $where
        after: $after
        group: $group
      ) {
        totalCount
        exhibitors {
          customer {
            id
            companyName
            country
            squareLogo
            userId
            showId
            exhibitorDetail {
              exhibitorType
              sponsorship
              boothNo
              hallNo
            }
            show {
              showName
              startDate
              endDate
            }
          }
        }
      }
    }
  }
`;

const DETAIL_QUERY = `
  query catalogueDetailQuery($userId: String, $showId: Int) {
    globalAnonymousQueries {
      customers(userId: $userId, showId: $showId) {
        id
        companyName
        address1
        city
        state
        country
        postalCode
        aCTele
        telephoneNo
        fax
        website
        firstName
        lastName
        designation
        emailAddress
        gSTNo
        tANNumber
        pANNo
        associations
        typeOfExhibitor
        mobileNo
        title
        companyProfile
        exhibitorDetail {
          boothNo
          headquarterAddress
          participatedBy
          participatedCountry
          alternateEmail
          gSTStatus
          boothType
          hallNo
          sQM
          interestedSQM
          showCatalogueName
          shortCompanyProfile
        }
        customerCategories {
          id
          category {
            id
            mainCategory
            subCategory
            categoryName
            categoryType
            productCategoryType
          }
        }
        products {
          productName
        }
      }
    }
  }
`;

export type ListExhibitor = {
  id: number;
  companyName: string;
  country: string | null;
  logoUrl: string | null;
  userId: string;
  showId: number;
  showName: string;
  showStart: string;
  showEnd: string;
  exhibitorType: string | null;
  sponsorship: string | null;
  boothNumber: string | null;
  hallNumber: string | null;
};

export type DetailCategory = {
  junctionId: number;
  categoryId: number;
  mainCategory: string;
  subCategory: string | null;
  categoryName: string | null;
  categoryType: string;
  productCategoryType: string;
};

export type ExhibitorDetail = {
  id: number;
  companyName: string | null;
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  website: string | null;
  companyProfile: string | null;
  shortCompanyProfile: string | null;
  showCatalogueName: string | null;
  typeOfExhibitor: string | null;
  participatedBy: string | null;
  participatedCountry: string | null;
  associations: string | null;
  gstNumber: string | null;
  tanNumber: string | null;
  panNumber: string | null;
  gstStatus: string | null;
  boothNumber: string | null;
  hallNumber: string | null;
  boothType: string | null;
  squareMetres: number | null;
  interestedSquareMetres: number | null;
  headquartersAddress: string | null;
  title: string | null;
  firstName: string | null;
  lastName: string | null;
  designation: string | null;
  email: string | null;
  alternateEmail: string | null;
  mobile: string | null;
  telephone: string | null;
  fax: string | null;
  areaCodeTelephone: string | null;
  categories: DetailCategory[];
  productNames: string[];
};

export type ExhibitorListPage = {
  totalCount: number;
  received: number;
  exhibitors: ListExhibitor[];
};

export class MmiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "MmiRequestError";
  }
}

type GraphQLResponse = {
  data?: unknown;
  errors?: { message?: string }[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function integer(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) {
    return Number(value);
  }

  return null;
}

function quantity(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function graphqlMessages(errors: { message?: string }[] | undefined): string {
  const messages = (errors ?? [])
    .map((error) => error.message?.trim())
    .filter((message): message is string => Boolean(message));

  return messages.length > 0 ? messages.join("; ") : "MMI GraphQL request failed.";
}

async function postGraphQLOnce(
  url: string,
  operationName: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<unknown> {
  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({ operationName, query, variables }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network request failed.";
    throw new MmiRequestError(`MMI request failed: ${message}`, 502);
  }

  const body = (await response.json().catch(() => null)) as GraphQLResponse | null;

  if (!response.ok) {
    throw new MmiRequestError(
      graphqlMessages(body?.errors) || `MMI request returned HTTP ${response.status}.`,
      response.status,
    );
  }

  if (!body || body.errors?.length) {
    throw new MmiRequestError(graphqlMessages(body?.errors), 502);
  }

  return body.data;
}

function retryable(error: MmiRequestError): boolean {
  return error.status === 429 || error.status === 502 || error.status === 503 || error.status === 504;
}

async function postGraphQL(
  url: string,
  operationName: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<unknown> {
  const attempts = 3;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await postGraphQLOnce(url, operationName, query, variables);
    } catch (error) {
      if (!(error instanceof MmiRequestError) || !retryable(error) || attempt === attempts) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }

  throw new MmiRequestError("MMI request failed.", 502);
}

function parseListExhibitor(value: unknown): ListExhibitor | null {
  if (!isRecord(value) || !isRecord(value.customer)) {
    return null;
  }

  const customer = value.customer;
  const detail = isRecord(customer.exhibitorDetail) ? customer.exhibitorDetail : null;
  const show = isRecord(customer.show) ? customer.show : null;
  const id = integer(customer.id);
  const showId = integer(customer.showId);
  const userId = text(customer.userId);
  const companyName = text(customer.companyName);
  const showName = show ? text(show.showName) : null;
  const showStart = show ? text(show.startDate) : null;
  const showEnd = show ? text(show.endDate) : null;

  if (
    id === null ||
    showId === null ||
    userId === null ||
    companyName === null ||
    showName === null ||
    showStart === null ||
    showEnd === null
  ) {
    return null;
  }

  return {
    id,
    companyName,
    country: text(customer.country),
    logoUrl: text(customer.squareLogo),
    userId,
    showId,
    showName,
    showStart,
    showEnd,
    exhibitorType: detail ? text(detail.exhibitorType) : null,
    sponsorship: detail ? text(detail.sponsorship) : null,
    boothNumber: detail ? text(detail.boothNo) : null,
    hallNumber: detail ? text(detail.hallNo) : null,
  };
}

function parseDetailCategory(value: unknown): DetailCategory | null {
  if (!isRecord(value) || !isRecord(value.category)) {
    return null;
  }

  const junctionId = integer(value.id);
  const category = value.category;
  const categoryId = integer(category.id);
  const mainCategory = text(category.mainCategory);
  const categoryType = text(category.categoryType);
  const productCategoryType = text(category.productCategoryType);

  if (
    junctionId === null ||
    categoryId === null ||
    mainCategory === null ||
    categoryType === null ||
    productCategoryType === null
  ) {
    return null;
  }

  return {
    junctionId,
    categoryId,
    mainCategory,
    subCategory: text(category.subCategory),
    categoryName: text(category.categoryName),
    categoryType,
    productCategoryType,
  };
}

function parseDetailCustomer(value: unknown): ExhibitorDetail | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = integer(value.id);

  if (id === null) {
    return null;
  }

  const detail = isRecord(value.exhibitorDetail) ? value.exhibitorDetail : null;
  const categories = Array.isArray(value.customerCategories)
    ? value.customerCategories.flatMap((category) => {
        const parsed = parseDetailCategory(category);
        return parsed ? [parsed] : [];
      })
    : [];
  const productNames = Array.isArray(value.products)
    ? value.products.flatMap((product) => {
        if (!isRecord(product)) {
          return [];
        }

        const name = text(product.productName);
        return name ? [name] : [];
      })
    : [];

  return {
    id,
    companyName: text(value.companyName),
    addressLine1: text(value.address1),
    city: text(value.city),
    state: text(value.state),
    country: text(value.country),
    postalCode: text(value.postalCode),
    website: text(value.website),
    companyProfile: text(value.companyProfile),
    shortCompanyProfile: detail ? text(detail.shortCompanyProfile) : null,
    showCatalogueName: detail ? text(detail.showCatalogueName) : null,
    typeOfExhibitor: text(value.typeOfExhibitor),
    participatedBy: detail ? text(detail.participatedBy) : null,
    participatedCountry: detail ? text(detail.participatedCountry) : null,
    associations: text(value.associations),
    gstNumber: text(value.gSTNo),
    tanNumber: text(value.tANNumber),
    panNumber: text(value.pANNo),
    gstStatus: detail ? text(detail.gSTStatus) : null,
    boothNumber: detail ? text(detail.boothNo) : null,
    hallNumber: detail ? text(detail.hallNo) : null,
    boothType: detail ? text(detail.boothType) : null,
    squareMetres: detail ? quantity(detail.sQM) : null,
    interestedSquareMetres: detail ? quantity(detail.interestedSQM) : null,
    headquartersAddress: detail ? text(detail.headquarterAddress) : null,
    title: text(value.title),
    firstName: text(value.firstName),
    lastName: text(value.lastName),
    designation: text(value.designation),
    email: text(value.emailAddress),
    alternateEmail: detail ? text(detail.alternateEmail) : null,
    mobile: text(value.mobileNo),
    telephone: text(value.telephoneNo),
    fax: text(value.fax),
    areaCodeTelephone: text(value.aCTele),
    categories,
    productNames,
  };
}

function customerRecord(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

export async function fetchExhibitorListPage(
  url: string,
  group: string,
  first: number,
  after: number,
): Promise<ExhibitorListPage> {
  const data = await postGraphQL(url, "getExhibitorListForGroup", LIST_QUERY, {
    where: [],
    first,
    after,
    group,
  });

  if (!isRecord(data) || !isRecord(data.catalogueQueries)) {
    throw new MmiRequestError("MMI list response did not include catalogueQueries.", 502);
  }

  const connection = data.catalogueQueries.exhibitorsWithWishListGroup;

  if (!isRecord(connection) || !Array.isArray(connection.exhibitors)) {
    throw new MmiRequestError("MMI list response did not include exhibitors.", 502);
  }

  const totalCount = integer(connection.totalCount);

  if (totalCount === null || totalCount < 0) {
    throw new MmiRequestError("MMI list response did not include totalCount.", 502);
  }

  return {
    totalCount,
    received: connection.exhibitors.length,
    exhibitors: connection.exhibitors.flatMap((row) => {
      const exhibitor = parseListExhibitor(row);
      return exhibitor ? [exhibitor] : [];
    }),
  };
}

export async function fetchExhibitorDetail(
  url: string,
  userId: string,
  showId: number,
): Promise<ExhibitorDetail | null> {
  const data = await postGraphQL(url, "catalogueDetailQuery", DETAIL_QUERY, {
    userId,
    showId,
  });

  if (!isRecord(data) || !isRecord(data.globalAnonymousQueries)) {
    throw new MmiRequestError("MMI detail response did not include globalAnonymousQueries.", 502);
  }

  return parseDetailCustomer(customerRecord(data.globalAnonymousQueries.customers));
}

export function nextPageOffset(after: number, pageSize: number): number {
  return after + pageSize;
}
