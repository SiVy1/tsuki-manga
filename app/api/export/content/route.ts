import { NextResponse } from "next/server";

import { RolePreset } from "@/generated/prisma/client";

import { auth } from "@/app/_lib/auth";
import { buildContentExportPayload } from "@/app/_lib/export/content";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (session.user.rolePreset !== RolePreset.ADMIN) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const payload = await buildContentExportPayload();
  const dateStamp = payload.exportedAt.slice(0, 10);

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="tsuki-manga-export-${dateStamp}.json"`,
      "cache-control": "no-store",
    },
  });
}
