import { AddressKind, ContactPointKind, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  fetchExhibitorDetail,
  fetchExhibitorListPage,
  MmiRequestError,
  nextPageOffset,
  type ExhibitorDetail,
  type ListExhibitor,
} from "@/lib/scraper/mmi";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ScrapeFailure = {
  mmiCustomerId: number | null;
  message: string;
};

export type ScrapeSummary = {
  pagesProcessed: number;
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  failures: ScrapeFailure[];
};

type AddressInput = {
  line1: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
};

type ContactPointInput = {
  kind: ContactPointKind;
  value: string;
};

type Transaction = Prisma.TransactionClient;

const FAILURE_SAMPLE_LIMIT = 20;

export class ScrapeInProgressError extends Error {
  readonly status = 409;

  constructor() {
    super("A scrape is already running.");
    this.name = "ScrapeInProgressError";
  }
}

function sourceDate(value: string): Date {
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value);
  return new Date(hasZone ? value : `${value}Z`);
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not set.`);
  }

  return value;
}

function positiveInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();

  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}

export function publicScrapeError(error: unknown): string {
  if (error instanceof ScrapeInProgressError || error instanceof MmiRequestError) {
    return error.message;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return `Database write failed (${error.code}).`;
  }

  if (
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientValidationError
  ) {
    return "Database request failed.";
  }

  if (error instanceof Error && error.message.endsWith("is not set.")) {
    return error.message;
  }

  if (error instanceof Error && error.message.endsWith("must be a positive integer.")) {
    return error.message;
  }

  return "Exhibitor scraping failed.";
}

function redact(message: string): string {
  return message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted]");
}

function decimal(value: number | null): Prisma.Decimal | null {
  if (value === null) {
    return null;
  }

  return new Prisma.Decimal(value.toFixed(2));
}

function hasAddress(address: AddressInput): boolean {
  return Boolean(
    address.line1 || address.city || address.state || address.country || address.postalCode,
  );
}

function contactPoints(detail: ExhibitorDetail): ContactPointInput[] {
  const points: ContactPointInput[] = [];
  const add = (kind: ContactPointKind, value: string | null) => {
    if (value) {
      points.push({ kind, value });
    }
  };

  add(ContactPointKind.EMAIL, detail.email);
  add(ContactPointKind.ALTERNATE_EMAIL, detail.alternateEmail);
  add(ContactPointKind.MOBILE, detail.mobile);
  add(ContactPointKind.TELEPHONE, detail.telephone);
  add(ContactPointKind.FAX, detail.fax);
  add(ContactPointKind.AREA_CODE_TELEPHONE, detail.areaCodeTelephone);

  return points;
}

async function catalogueGroupId(code: string): Promise<string> {
  const group = await prisma.catalogueGroup.upsert({
    where: { code },
    create: { code },
    update: {},
    select: { id: true },
  });

  return group.id;
}

async function showId(
  groupId: string,
  exhibitor: ListExhibitor,
  cache: Map<number, string>,
): Promise<string> {
  const cached = cache.get(exhibitor.showId);

  if (cached) {
    return cached;
  }

  const startDate = sourceDate(exhibitor.showStart);
  const endDate = sourceDate(exhibitor.showEnd);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new Error(`Show ${exhibitor.showId} has an invalid date.`);
  }

  const show = await prisma.show.upsert({
    where: { mmiShowId: exhibitor.showId },
    create: {
      mmiShowId: exhibitor.showId,
      catalogueGroupId: groupId,
      name: exhibitor.showName,
      startDate,
      endDate,
    },
    update: {
      catalogueGroupId: groupId,
      name: exhibitor.showName,
      startDate,
      endDate,
    },
    select: { id: true },
  });

  cache.set(exhibitor.showId, show.id);
  return show.id;
}

async function syncAddress(
  tx: Transaction,
  exhibitorId: string,
  kind: AddressKind,
  address: AddressInput,
): Promise<void> {
  if (!hasAddress(address)) {
    await tx.address.deleteMany({ where: { exhibitorId, kind } });
    return;
  }

  await tx.address.upsert({
    where: { exhibitorId_kind: { exhibitorId, kind } },
    create: { exhibitorId, kind, ...address },
    update: address,
  });
}

async function syncContact(
  tx: Transaction,
  exhibitorId: string,
  detail: ExhibitorDetail,
): Promise<void> {
  const points = contactPoints(detail);
  const hasPerson = Boolean(
    detail.title || detail.firstName || detail.lastName || detail.designation,
  );

  if (!hasPerson && points.length === 0) {
    await tx.contact.deleteMany({ where: { exhibitorId } });
    return;
  }

  const contact = await tx.contact.upsert({
    where: { exhibitorId },
    create: {
      exhibitorId,
      title: detail.title,
      firstName: detail.firstName,
      lastName: detail.lastName,
      designation: detail.designation,
    },
    update: {
      title: detail.title,
      firstName: detail.firstName,
      lastName: detail.lastName,
      designation: detail.designation,
    },
    select: { id: true },
  });

  const kinds = points.map((point) => point.kind);

  await tx.contactPoint.deleteMany({
    where:
      kinds.length === 0
        ? { contactId: contact.id }
        : { contactId: contact.id, kind: { notIn: kinds } },
  });

  for (const point of points) {
    await tx.contactPoint.upsert({
      where: { contactId_kind: { contactId: contact.id, kind: point.kind } },
      create: { contactId: contact.id, kind: point.kind, value: point.value },
      update: { value: point.value },
    });
  }
}

async function syncCategories(
  tx: Transaction,
  exhibitorId: string,
  categories: ExhibitorDetail["categories"],
): Promise<void> {
  const unique = new Map<number, ExhibitorDetail["categories"][number]>();

  for (const category of categories) {
    if (!unique.has(category.categoryId)) {
      unique.set(category.categoryId, category);
    }
  }

  const selected = [...unique.values()];
  const junctionIds = selected.map((category) => category.junctionId);

  await tx.exhibitorCategory.deleteMany({
    where:
      junctionIds.length === 0
        ? { exhibitorId }
        : { exhibitorId, mmiCustomerCategoryId: { notIn: junctionIds } },
  });

  for (const category of selected) {
    const saved = await tx.category.upsert({
      where: { mmiCategoryId: category.categoryId },
      create: {
        mmiCategoryId: category.categoryId,
        mainCategory: category.mainCategory,
        subCategory: category.subCategory,
        categoryName: category.categoryName,
        categoryType: category.categoryType,
        productCategoryType: category.productCategoryType,
      },
      update: {
        mainCategory: category.mainCategory,
        subCategory: category.subCategory,
        categoryName: category.categoryName,
        categoryType: category.categoryType,
        productCategoryType: category.productCategoryType,
      },
      select: { id: true },
    });

    await tx.exhibitorCategory.upsert({
      where: { mmiCustomerCategoryId: category.junctionId },
      create: {
        mmiCustomerCategoryId: category.junctionId,
        exhibitorId,
        categoryId: saved.id,
      },
      update: {
        exhibitorId,
        categoryId: saved.id,
      },
    });
  }
}

async function syncProducts(
  tx: Transaction,
  exhibitorId: string,
  names: string[],
): Promise<void> {
  const uniqueNames = [...new Set(names)];

  await tx.exhibitorProduct.deleteMany({
    where:
      uniqueNames.length === 0
        ? { exhibitorId }
        : { exhibitorId, name: { notIn: uniqueNames } },
  });

  for (const name of uniqueNames) {
    await tx.exhibitorProduct.upsert({
      where: { exhibitorId_name: { exhibitorId, name } },
      create: { exhibitorId, name },
      update: {},
    });
  }
}

async function persistExhibitor(
  groupId: string,
  listItem: ListExhibitor,
  detail: ExhibitorDetail,
  shows: Map<number, string>,
): Promise<"created" | "updated"> {
  const parentShowId = await showId(groupId, listItem, shows);

  return prisma.$transaction(
    async (tx) => {
      const existing = await tx.exhibitor.findUnique({
        where: { mmiCustomerId: listItem.id },
        select: { id: true },
      });

      const data = {
        userId: listItem.userId,
        showId: parentShowId,
        companyName: detail.companyName ?? listItem.companyName,
        website: detail.website,
        logoUrl: listItem.logoUrl,
        companyProfile: detail.companyProfile,
        shortCompanyProfile: detail.shortCompanyProfile,
        showCatalogueName: detail.showCatalogueName,
        typeOfExhibitor: detail.typeOfExhibitor,
        participatedBy: detail.participatedBy,
        participatedCountry: detail.participatedCountry,
        associations: detail.associations,
        gstNumber: detail.gstNumber,
        tanNumber: detail.tanNumber,
        panNumber: detail.panNumber,
        gstStatus: detail.gstStatus,
        exhibitorType: listItem.exhibitorType,
        sponsorship: listItem.sponsorship,
        boothNumber: detail.boothNumber ?? listItem.boothNumber,
        hallNumber: detail.hallNumber ?? listItem.hallNumber,
        boothType: detail.boothType,
        squareMetres: decimal(detail.squareMetres),
        interestedSquareMetres: decimal(detail.interestedSquareMetres),
      };

      const exhibitor = await tx.exhibitor.upsert({
        where: { mmiCustomerId: listItem.id },
        create: { mmiCustomerId: listItem.id, ...data },
        update: data,
        select: { id: true },
      });

      await syncAddress(tx, exhibitor.id, AddressKind.REGISTERED, {
        line1: detail.addressLine1,
        city: detail.city,
        state: detail.state,
        country: detail.country ?? listItem.country,
        postalCode: detail.postalCode,
      });
      await syncAddress(tx, exhibitor.id, AddressKind.HEADQUARTERS, {
        line1: detail.headquartersAddress,
        city: null,
        state: null,
        country: null,
        postalCode: null,
      });
      await syncContact(tx, exhibitor.id, detail);
      await syncCategories(tx, exhibitor.id, detail.categories);
      await syncProducts(tx, exhibitor.id, detail.productNames);

      return existing ? "updated" : "created";
    },
    { timeout: 20_000 },
  );
}

async function mapPool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function run(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index]);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => run());
  await Promise.all(workers);
  return results;
}

let scrapeInProgress = false;

export async function scrapeExhibitors(): Promise<ScrapeSummary> {
  if (scrapeInProgress) {
    throw new ScrapeInProgressError();
  }

  const graphqlUrl = requiredEnv("MMI_GRAPHQL_URL");
  const group = requiredEnv("MMI_CATALOGUE_GROUP");
  const pageSize = positiveInt("MMI_PAGE_SIZE", 100);
  const detailConcurrency = positiveInt("MMI_DETAIL_CONCURRENCY", 4);
  const summary: ScrapeSummary = {
    pagesProcessed: 0,
    processed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    failures: [],
  };

  const recordFailure = (mmiCustomerId: number | null, error: unknown) => {
    summary.failed += 1;
    const message = typeof error === "string" ? error : publicScrapeError(error);

    if (error instanceof Error) {
      const raw = redact(error.message);

      if (raw !== message) {
        console.error(`[scrape] detail: ${raw}`);
      }
    }

    console.error(`[scrape] failed ${mmiCustomerId ?? "unknown"}: ${message}`);

    if (summary.failures.length < FAILURE_SAMPLE_LIMIT) {
      summary.failures.push({ mmiCustomerId, message });
    }
  };

  scrapeInProgress = true;

  try {
    const groupId = await catalogueGroupId(group);
    const shows = new Map<number, string>();
    const seen = new Set<number>();
    let after = -1;

    while (true) {
      const page = await fetchExhibitorListPage(graphqlUrl, group, pageSize, after);
      summary.pagesProcessed += 1;
      console.info(
        `[scrape] page ${summary.pagesProcessed} after=${after} received=${page.received} total=${page.totalCount}`,
      );

      const malformed = page.received - page.exhibitors.length;
      summary.processed += malformed;
      summary.skipped += malformed;

      if (page.received === 0 || page.totalCount === 0) {
        break;
      }

      const fresh = page.exhibitors.filter((exhibitor) => {
        if (seen.has(exhibitor.id)) {
          return false;
        }

        seen.add(exhibitor.id);
        return true;
      });

      if (fresh.length === 0) {
        break;
      }

      const details = await mapPool(fresh, detailConcurrency, async (exhibitor) => {
        if (!UUID_PATTERN.test(exhibitor.userId)) {
          return { exhibitor, detail: null, error: "userId is not a UUID." };
        }

        try {
          const detail = await fetchExhibitorDetail(
            graphqlUrl,
            exhibitor.userId,
            exhibitor.showId,
          );

          if (!detail || detail.id !== exhibitor.id) {
            return {
              exhibitor,
              detail: null,
              error: "Detail response did not match the list exhibitor.",
            };
          }

          return { exhibitor, detail, error: null };
        } catch (error) {
          if (error instanceof Error) {
            console.error(`[scrape] detail ${exhibitor.id}: ${redact(error.message)}`);
          }

          return { exhibitor, detail: null, error: publicScrapeError(error) };
        }
      });

      for (const item of details) {
        summary.processed += 1;

        if (item.error || !item.detail) {
          if (item.error === "userId is not a UUID.") {
            summary.skipped += 1;
            console.warn(`[scrape] skipped ${item.exhibitor.id}: ${item.error}`);
          } else {
            recordFailure(item.exhibitor.id, item.error ?? "Detail was empty.");
          }
          continue;
        }

        try {
          const outcome = await persistExhibitor(groupId, item.exhibitor, item.detail, shows);
          summary[outcome] += 1;
          console.info(
            `[scrape] ${summary.processed} ${outcome} ${item.exhibitor.id} ${item.exhibitor.companyName}`,
          );
        } catch (error) {
          recordFailure(item.exhibitor.id, error);
        }
      }

      const pageLimit = Math.ceil(page.totalCount / pageSize) + 1;

      if (
        seen.size >= page.totalCount ||
        page.received < pageSize ||
        summary.pagesProcessed > pageLimit
      ) {
        break;
      }

      const nextAfter = nextPageOffset(after, pageSize);

      if (nextAfter <= after) {
        break;
      }

      after = nextAfter;
    }

    console.info(
      `[scrape] finished pages=${summary.pagesProcessed} processed=${summary.processed} created=${summary.created} updated=${summary.updated} skipped=${summary.skipped} failed=${summary.failed}`,
    );

    return summary;
  } finally {
    scrapeInProgress = false;
  }
}
