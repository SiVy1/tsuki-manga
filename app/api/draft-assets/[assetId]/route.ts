import { NextResponse } from "next/server";

import { auth } from "@/app/_lib/auth";
import { canAccessDashboard } from "@/app/_lib/permissions/bits";
import { prisma } from "@/app/_lib/db/client";
import { storageDriver } from "@/app/_lib/storage";
import { AssetScope } from "@/generated/prisma/client";

type RouteContext = {
  params: Promise<{
    assetId: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (!canAccessDashboard(session.user.permissionBits)) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const { assetId } = await context.params;

  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: {
      id: true,
      storageKey: true,
      mimeType: true,
      sizeBytes: true,
      scope: true,
    },
  });

  if (!asset || asset.scope !== AssetScope.DRAFT) {
    return NextResponse.json({ message: "Draft asset not found." }, { status: 404 });
  }

  const object = await storageDriver.getDraftObject(asset.storageKey);

  if (!object) {
    return NextResponse.json({ message: "Draft asset file not found." }, { status: 404 });
  }

  return new NextResponse(object.body, {
    headers: {
      "content-type": asset.mimeType,
      "content-length": asset.sizeBytes.toString(),
      "cache-control": "private, no-store",
    },
  });
}
