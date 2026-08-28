import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authenticatePrintAgent, leaseNextPrintAgentJob } from "@/lib/print-agent";

const schema = z.object({
  version: z.string().trim().min(1).max(30),
  platform: z.string().trim().min(2).max(40),
  printers: z.record(z.string(), z.string().max(300)).default({}),
}).strict();

export async function POST(request: Request) {
  const device = await authenticatePrintAgent(request);
  if (!device) return NextResponse.json({ error: "Dispositivo no autorizado." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Estado del agente inválido." }, { status: 400 });
  const destinations = Object.entries(parsed.data.printers).filter(([, printer]) => Boolean(printer)).map(([destination]) => destination);
  if (parsed.data.printers.DEFAULT) destinations.push("KITCHEN", "COUNTER", "LABEL");
  await prisma.printAgentDevice.update({
    where: { id: device.id },
    data: { version: parsed.data.version, platform: parsed.data.platform, printers: parsed.data.printers, lastSeenAt: new Date() },
  });
  const job = await leaseNextPrintAgentJob(device, destinations);
  return NextResponse.json({ job }, { headers: { "Cache-Control": "no-store" } });
}
