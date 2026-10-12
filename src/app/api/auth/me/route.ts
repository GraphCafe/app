import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/require-user";

export async function GET() {
  const user = await getRequestUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({ user });
}
