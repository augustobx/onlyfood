import { NextResponse } from "next/server";
import { z } from "zod";
import { pairPrintAgent } from "@/lib/print-agent";
import { consumeRateLimit, getRequestIp } from "@/lib/request-security";

const schema = z.object({
  code: z.string().min(8).max(12),
  name: z.string().trim().min(1).max(80),
  platform: z.string().trim().min(2).max(40),
  version: z.string().trim().min(1).max(30),
}).strict();

export async function POST(request: Request) {
  const ip = await getRequestIp();
  if (!(await consumeRateLimit("print-agent-pair", ip, 15, 15 * 60 * 1000))) return NextResponse.json({ error: "Demasiados intentos de vinculación." }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Los datos de vinculación no son válidos." }, { status: 400 });
  const result = await pairPrintAgent(parsed.data);
  if (!result) return NextResponse.json({ error: "El código venció, ya fue utilizado o no existe." }, { status: 401 });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
