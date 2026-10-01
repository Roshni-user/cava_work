import { AddressKind } from "@/generated/prisma/client";
import type { ExhibitorPreview } from "@/lib/data/exhibitors";
import { prisma } from "@/lib/prisma";

export async function listExhibitorPreviews(): Promise<ExhibitorPreview[]> {
  const rows = await prisma.exhibitor.findMany({
    orderBy: { companyName: "asc" },
    select: {
      id: true,
      companyName: true,
      hallNumber: true,
      boothNumber: true,
      show: { select: { name: true } },
      addresses: {
        where: { kind: AddressKind.REGISTERED },
        select: { country: true },
        take: 1,
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    companyName: row.companyName,
    showName: row.show.name,
    country: row.addresses[0]?.country ?? null,
    hallNumber: row.hallNumber,
    boothNumber: row.boothNumber,
  }));
}
