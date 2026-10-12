import { NextResponse } from "next/server";
import { z } from "zod";
import { datasetRequestSchema } from "@/lib/connections/schemas";
import {
  isAuthError,
  requireRequestUser,
} from "@/lib/auth/require-user";
import { getDataset, listDatasets, updateDataset } from "@/lib/connections/persistence";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  request: datasetRequestSchema.partial().optional(),
});

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireRequestUser();
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const dataset = await getDataset(id, auth.id);
  if (!dataset) {
    return NextResponse.json({ error: "Dataset not found." }, { status: 404 });
  }
  const connectionDatasets = (await listDatasets(auth.id)).filter(
    (d) => d.connectionId === dataset.connectionId,
  );
  return NextResponse.json({ dataset, siblings: connectionDatasets });
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireRequestUser();
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const existing = await getDataset(id, auth.id);
  if (!existing) {
    return NextResponse.json({ error: "Dataset not found." }, { status: 404 });
  }
  const dataset = await updateDataset(id, {
    name: parsed.data.name ?? existing.name,
    request: {
      ...existing.request,
      ...(parsed.data.request ?? {}),
    },
  });
  return NextResponse.json({ dataset });
}
