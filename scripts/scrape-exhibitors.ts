import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { publicScrapeError, scrapeExhibitors } from "@/lib/scraper/exhibitors";

async function main() {
  const summary = await scrapeExhibitors();
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error: unknown) => {
    console.error(publicScrapeError(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
