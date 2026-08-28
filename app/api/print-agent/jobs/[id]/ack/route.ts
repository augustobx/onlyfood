import { NextResponse } from "next/server";
import { z } from "zod";
import { acknowledgePrintAgentJob, authenticatePrintAgent } from "@/lib/print-agent";

const schema = z.object({ success: z.boolean(), error: z.string().max(2000).optional() }).strict();

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const device = await authenticatePrintAgent(request);
  if (!device) return NextResponse.json({ error: "Dispositivo no autorizado." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Confirmación inválida." }, { status: 400 });
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Trabajo inválido." }, { status: 400 });
  const result = await acknowledgePrintAgentJob(device, id, parsed.data.success, parsed.data.error);
  if (!result) return NextResponse.json({ error: "El trabajo no pertenece a este dispositivo o ya fue confirmado." }, { status: 409 });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
