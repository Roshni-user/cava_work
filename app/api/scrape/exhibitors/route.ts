import { NextResponse } from "next/server";
import {
  publicScrapeError,
  ScrapeInProgressError,
  scrapeExhibitors,
} from "@/lib/scraper/exhibitors";
import { MmiRequestError } from "@/lib/scraper/mmi";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const summary = await scrapeExhibitors();

    return NextResponse.json({
      success: true,
      message: "Exhibitor scraping completed",
      summary,
    });
  } catch (error) {
    const status =
      error instanceof MmiRequestError || error instanceof ScrapeInProgressError
        ? error.status
        : 500;

    return NextResponse.json(
      {
        success: false,
        message: publicScrapeError(error),
      },
      { status },
    );
  }
}
