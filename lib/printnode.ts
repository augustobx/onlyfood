import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";

export type PrintKind = "KITCHEN" | "COUNTER";

type TextBlock = {
  type?: "text";
  text: string;
  size?: number;
  bold?: boolean;
  align?: "left" | "center" | "right";
  before?: number;
  after?: number;
  verbatim?: boolean;
} | {
  type: "separator";
  text?: never;
  before?: number;
  after?: number;
};

const ESC = 0x1b;
const GS = 0x1d;

const orderInclude = {
  items: {
    include: {
      product: true,
      addedExtras: { include: { extra: true } },
      removedIngredients: { include: { ingredient: true } },
      comboItems: {
        include: {
          product: true,
          removedIngredients: { include: { ingredient: true } },
        },
      },
    },
  },
} as const;

async function loadPrintableOrder(orderId: string) {
  return prisma.order.findUnique({ where: { id: orderId }, include: orderInclude });
}

type PrintableOrder = NonNullable<Awaited<ReturnType<typeof loadPrintableOrder>>>;

function money(value: number) {
  return `$${value.toLocaleString("es-AR")}`;
}

function orderCode(order: PrintableOrder) {
  return order.id.slice(-5).toUpperCase();
}

function kitchenBlocks(order: PrintableOrder): TextBlock[] {
  const blocks: TextBlock[] = [
    { text: "COCINA", size: 14, bold: true, align: "center" },
    { text: `#${orderCode(order)}`, size: 14, bold: true, align: "center" },
    { text: order.deliveryTime || "HORARIO NO INFORMADO", size: 14, bold: true, align: "center", after: 1 },
    { text: `CLIENTE: ${order.clientName.toUpperCase()}`, size: 10, bold: true, align: "center", after: 1 },
    { text: order.needsDelivery ? "ENVIO" : "RETIRO", size: 10, bold: true, align: "center", after: 1 },
    { type: "separator", after: 1 },
  ];
  order.items.forEach((item, itemIndex) => {
    if (itemIndex > 0) blocks.push({ type: "separator", before: 1, after: 1 });
    blocks.push({ text: `${item.quantity}x ${item.product.name.toUpperCase()}`, size: 10, bold: true, after: 1 });
    if (item.addedExtras.length) blocks.push({ text: `+ EXTRA: ${item.addedExtras.map((extra) => extra.extra.name).join(", ")}`, bold: true, after: 1 });
    if (item.removedIngredients.length) blocks.push({ text: `- SIN: ${item.removedIngredients.map((entry) => entry.ingredient.name).join(", ")}`, size: 10, bold: true, after: 1 });
    for (const comboItem of item.comboItems) {
      blocks.push({ text: `${comboItem.quantity}x ${comboItem.product.name.toUpperCase()}`, bold: true, before: 1, after: 1 });
      if (comboItem.removedIngredients.length) {
        blocks.push({ text: `- SIN: ${comboItem.removedIngredients.map((entry) => entry.ingredient.name).join(", ")}`, bold: true, after: 1 });
      }
    }
    if (item.notes) blocks.push({ text: `NOTA: ${item.notes.toUpperCase()}`, size: 10, bold: true, before: 1, after: 1 });
  });
  blocks.push({ type: "separator", before: 1 }, { text: `PEDIDO #${orderCode(order)}`, bold: true, align: "center" });
  return blocks;
}

function receiptRow(label: string, value: string, columns: number) {
  const cleanLabel = ascii(label);
  const cleanValue = ascii(value);
  if (cleanLabel.length + cleanValue.length + 1 > columns) return `${cleanLabel}\n${cleanValue.padStart(columns)}`;
  return `${cleanLabel}${" ".repeat(columns - cleanLabel.length - cleanValue.length)}${cleanValue}`;
}

function counterBlocks(order: PrintableOrder, columns: number): TextBlock[] {
  const blocks: TextBlock[] = [
    { text: `PEDIDO #${orderCode(order)}`, size: 14, bold: true, align: "center", after: 1 },
    { text: new Date(order.createdAt).toLocaleString("es-AR"), align: "center" },
    { type: "separator" },
    { text: order.needsDelivery ? "ENVIO A DOMICILIO" : "RETIRO EN EL LOCAL", size: 10, bold: true, align: "center", after: 1 },
    { text: `Cliente: ${order.clientName}`, bold: true },
    { text: `Telefono: ${order.clientPhone}` },
    ...(order.needsDelivery && order.deliveryAddress ? [{ text: `Direccion: ${order.deliveryAddress}`, bold: true } satisfies TextBlock] : []),
    { text: `Horario: ${order.deliveryTime || "Horario no informado"}`, bold: true },
    { type: "separator", before: 1 },
    { text: "DETALLE", bold: true, align: "center" },
  ];
  for (const item of order.items) {
    blocks.push({ text: receiptRow(`${item.quantity}x ${item.product.name}`, money(item.subtotal), columns), bold: true, before: 1, verbatim: true });
    if (item.addedExtras.length) blocks.push({ text: `  + ${item.addedExtras.map((extra) => extra.extra.name).join(", ")}` });
    if (item.removedIngredients.length) blocks.push({ text: `  Sin: ${item.removedIngredients.map((entry) => entry.ingredient.name).join(", ")}` });
    if (item.notes) blocks.push({ text: `  Nota: ${item.notes}` });
  }
  blocks.push(
    { type: "separator", before: 1 },
    { text: receiptRow("TOTAL", money(order.total), Math.floor(columns / 2)), size: 14, bold: true, verbatim: true, after: 1 },
    { text: order.paymentMethod === "CASH" ? "PAGO: EFECTIVO AL RETIRAR/RECIBIR" : order.paymentMethod === "ADMIN" ? "PAGO: ACREDITADO EN MOSTRADOR" : "PAGO: MERCADO PAGO ACREDITADO", bold: true, align: "center" },
    { type: "separator", before: 1 },
    { text: "GRACIAS POR ELEGIRNOS!", bold: true, align: "center", before: 1 },
  );
  return blocks;
}

async function localLogoBuffer(logoUrl: string | null) {
  if (!logoUrl) return null;
  const publicDirectory = path.resolve(process.cwd(), "public");
  if (logoUrl.startsWith("/") && !logoUrl.startsWith("//")) {
    const candidate = path.resolve(publicDirectory, `.${decodeURIComponent(logoUrl)}`);
    if (candidate.startsWith(`${publicDirectory}${path.sep}`)) {
      try {
        return await fs.readFile(candidate);
      } catch {
        return null;
      }
    }
  }
  return null;
}

function ascii(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿¡]/g, "")
    .replace(/[^\x20-\x7E\n]/g, "?");
}

function wrapText(value: string, width: number) {
  const output: string[] = [];
  for (const paragraph of ascii(value).split("\n")) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      if (word.length > width) {
        if (line) output.push(line);
        for (let index = 0; index < word.length; index += width) output.push(word.slice(index, index + width));
        line = "";
      } else if (!line) {
        line = word;
      } else if (`${line} ${word}`.length <= width) {
        line += ` ${word}`;
      } else {
        output.push(line);
        line = word;
      }
    }
    if (line) output.push(line);
  }
  return output.length ? output : [""];
}

async function rasterLogo(logoUrl: string | null, rollSize: string | null) {
  const targetWidth = rollSize === "58mm" ? 176 : 240;
  const input = await localLogoBuffer(logoUrl);
  if (!input) return null;
  const { data, info } = await sharp(input)
    .resize({ width: targetWidth, height: targetWidth, fit: "inside", withoutEnlargement: false })
    .flatten({ background: "white" })
    .greyscale()
    .threshold(105)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const widthBytes = Math.ceil(info.width / 8);
  const pixels = Buffer.alloc(widthBytes * info.height, 0);
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[y * info.width + x] < 128) pixels[y * widthBytes + Math.floor(x / 8)] |= 0x80 >> (x % 8);
    }
  }
  return Buffer.concat([
    Buffer.from([GS, 0x76, 0x30, 0x00, widthBytes & 0xff, (widthBytes >> 8) & 0xff, info.height & 0xff, (info.height >> 8) & 0xff]),
    pixels,
    Buffer.from("\n"),
  ]);
}

async function createTicketRaw(order: PrintableOrder, kind: PrintKind, rollSize: string | null, logoUrl: string | null) {
  const normalColumns = rollSize === "58mm" ? 32 : 42;
  const blocks = kind === "KITCHEN" ? kitchenBlocks(order) : counterBlocks(order, normalColumns);
  const chunks: Buffer[] = [
    Buffer.from([ESC, 0x40]), // Inicializar impresora.
    Buffer.from([ESC, 0x32]), // Interlineado normal.
  ];
  if (kind === "COUNTER") {
    chunks.push(Buffer.from([ESC, 0x61, 0x01]));
    try {
      const logo = await rasterLogo(logoUrl, rollSize);
      if (logo) chunks.push(logo);
    } catch (error) {
      console.error("No se pudo rasterizar el logo del ticket", error);
    }
  }

  for (const block of blocks) {
    if (block.before) chunks.push(Buffer.from("\n".repeat(block.before)));
    if (block.type === "separator") {
      chunks.push(Buffer.from([ESC, 0x61, 0x00]), Buffer.from(`${"-".repeat(normalColumns)}\n`));
      if (block.after) chunks.push(Buffer.from("\n".repeat(block.after)));
      continue;
    }
    const doubleSize = (block.size || 0) >= 14;
    const doubleHeight = !doubleSize && (block.size || 0) >= 10;
    const sizeCommand = doubleSize ? 0x11 : doubleHeight ? 0x01 : 0x00;
    const columns = doubleSize ? Math.floor(normalColumns / 2) : normalColumns;
    const align = block.align === "center" ? 1 : block.align === "right" ? 2 : 0;
    chunks.push(
      Buffer.from([ESC, 0x61, align]),
      Buffer.from([ESC, 0x45, block.bold ? 1 : 0]),
      Buffer.from([GS, 0x21, sizeCommand]),
    );
    const lines = block.verbatim ? ascii(block.text).split("\n") : wrapText(block.text, columns);
    for (const line of lines) chunks.push(Buffer.from(`${line}\n`, "ascii"));
    chunks.push(Buffer.from([GS, 0x21, 0x00]), Buffer.from([ESC, 0x45, 0x00]));
    if (block.after) chunks.push(Buffer.from("\n".repeat(block.after)));
  }

  chunks.push(
    Buffer.from([ESC, 0x61, 0x00]),
    Buffer.from("\n\n"),
    Buffer.from([GS, 0x56, 0x41, 0x00]), // Corte y avance minimo.
  );
  return Buffer.concat(chunks);
}

async function createTestRaw(kind: PrintKind, rollSize: string | null, logoUrl: string | null) {
  const fakeOrder = {
    id: `printnode-test-${kind.toLowerCase()}`,
    clientName: "Prueba PrintNode",
    clientPhone: "0000000000",
    needsDelivery: false,
    deliveryAddress: null,
    deliveryTime: "Ahora",
    paymentMethod: "CASH",
    total: 18500,
    createdAt: new Date(),
    items: [
      {
        quantity: 2,
        subtotal: 15000,
        notes: "Una bien cocida",
        product: { name: "Hamburguesa Raptor" },
        addedExtras: [{ extra: { name: "Cheddar extra" } }],
        removedIngredients: [{ ingredient: { name: "Cebolla" } }],
        comboItems: [],
      },
      {
        quantity: 1,
        subtotal: 3500,
        notes: null,
        product: { name: "Papas fritas" },
        addedExtras: [],
        removedIngredients: [],
        comboItems: [],
      },
    ],
  } as unknown as PrintableOrder;
  return createTicketRaw(fakeOrder, kind, rollSize, logoUrl);
}

async function submitPrintNodeJob(printerId: number, title: string, rawTicket: Buffer, idempotencyKey: string, customApiKey?: string) {
  const apiKey = customApiKey?.trim() || process.env.PRINTNODE_API_KEY?.trim();
  if (!apiKey) throw new Error("Falta configurar PRINTNODE_API_KEY.");
  const response = await fetch("https://api.printnode.com/printjobs", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      printerId,
      title,
      contentType: "raw_base64",
      content: rawTicket.toString("base64"),
      source: "onlyfood-escpos",
      expireAfter: 600,
      options: { copies: 1 },
    }),
    signal: AbortSignal.timeout(12_000),
  });
  if (response.status === 409) return null;
  if (!response.ok) {
    const message = (await response.text()).slice(0, 500);
    throw new Error(`PrintNode respondio ${response.status}: ${message}`);
  }
  const jobId = Number(await response.json());
  if (!Number.isInteger(jobId)) throw new Error("PrintNode no devolvio un ID de trabajo valido.");
  return jobId;
}

export async function dispatchOrderPrint(orderId: string, options: { force?: boolean; tenantId?: string } = {}) {
  const order = await loadPrintableOrder(orderId);
  if (!order || order.status === "CANCELLED") return { success: false, skipped: true, jobs: [], error: "Pedido no disponible." };

  if (options.tenantId && order.tenantId !== options.tenantId) {
    return { success: false, skipped: true, jobs: [], error: "Pedido no disponible para este comercio." };
  }

  const tenantId = options.tenantId || order.tenantId;
  if (!tenantId) return { success: false, skipped: true, jobs: [], error: "Pedido sin comercio asociado." };
  const config: any = await prisma.systemConfig.findUnique({ where: { tenantId } });
  if (!config || config.printingMode === "BROWSER" || (!config.autoPrintTickets && !options.force)) {
    return { success: true, skipped: true, jobs: [] as Array<{ kind: PrintKind; success: boolean; error?: string }> };
  }

  if (config.printingMode === "NANOLABS_AGENT") {
    const { enqueuePrintAgentJob } = await import("@/lib/print-agent");
    const targets = [
      { kind: "KITCHEN" as const, rollSize: config.printerKitchenSize },
      { kind: "COUNTER" as const, rollSize: config.printerCounterSize },
    ];
    const jobs: Array<{ kind: PrintKind; success: boolean; jobId?: string; error?: string }> = [];
    for (const target of targets) {
      const existing = await prisma.printDispatch.findUnique({ where: { orderId_kind: { orderId, kind: target.kind } } });
      if (existing?.status === "SENT" && !options.force) {
        jobs.push({ kind: target.kind, success: true });
        continue;
      }
      const attempt = (existing?.attempts || 0) + 1;
      await prisma.printDispatch.upsert({
        where: { orderId_kind: { orderId, kind: target.kind } },
        create: { orderId, kind: target.kind, status: "PENDING", attempts: 1, tenantId },
        update: { status: "PENDING", attempts: { increment: 1 }, error: null },
      });
      try {
        const rawTicket = await createTicketRaw(order, target.kind, target.rollSize, config.logoUrl);
        const idempotencyKey = options.force ? `onlyfood-agent-${orderId}-${target.kind}-manual-${attempt}` : `onlyfood-agent-${orderId}-${target.kind}-auto`;
        const queued = await enqueuePrintAgentJob({ tenantId, orderId, destination: target.kind, title: `${config.appName} #${orderCode(order)} ${target.kind}`, payload: rawTicket, widthMm: target.rollSize === "58mm" ? 58 : 80, idempotencyKey });
        jobs.push({ kind: target.kind, success: true, jobId: queued.id });
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo encolar la impresión.";
        await prisma.printDispatch.update({ where: { orderId_kind: { orderId, kind: target.kind } }, data: { status: "FAILED", error: message } });
        jobs.push({ kind: target.kind, success: false, error: message });
      }
    }
    return { success: jobs.every((job) => job.success), skipped: false, jobs };
  }

  const { hasTenantFeature } = await import("@/lib/features");
  if (!(await hasTenantFeature(tenantId, "printNode"))) {
    return { success: true, skipped: true, jobs: [] as Array<{ kind: PrintKind; success: boolean; error?: string }> };
  }
  let customApiKey: string | undefined;

  if (tenantId) {
    const { getTenantIntegration } = await import("@/lib/tenant-integrations");
    const creds = await getTenantIntegration<any>(tenantId, "PRINTNODE");
    if (creds?.apiKey) customApiKey = creds.apiKey;
  }

  if (config.printingMode !== "PRINTNODE") {
    return { success: true, skipped: true, jobs: [] as Array<{ kind: PrintKind; success: boolean; error?: string }> };
  }

  const targets = [
    { kind: "KITCHEN" as const, printerId: config.printNodeKitchenPrinterId, rollSize: config.printerKitchenSize },
    { kind: "COUNTER" as const, printerId: config.printNodeCounterPrinterId, rollSize: config.printerCounterSize },
  ];
  const jobs: Array<{ kind: PrintKind; success: boolean; jobId?: number | null; error?: string }> = [];

  for (const target of targets) {
    if (!target.printerId) {
      jobs.push({ kind: target.kind, success: false, error: `Falta el ID de impresora de ${target.kind === "KITCHEN" ? "cocina" : "mostrador"}.` });
      continue;
    }
    const existing = await prisma.printDispatch.findUnique({ where: { orderId_kind: { orderId, kind: target.kind } } });
    if (existing?.status === "SENT" && !options.force) {
      jobs.push({ kind: target.kind, success: true, jobId: existing.printNodeJobId });
      continue;
    }
    const attempt = (existing?.attempts || 0) + 1;
    await prisma.printDispatch.upsert({
      where: { orderId_kind: { orderId, kind: target.kind } },
      create: { orderId, kind: target.kind, status: "PROCESSING", attempts: 1, tenantId },
      update: { status: "PROCESSING", attempts: { increment: 1 }, error: null },
    });
    try {
      const rawTicket = await createTicketRaw(order, target.kind, target.rollSize, config.logoUrl);
      const key = options.force ? `onlyfood-raw-${orderId}-${target.kind}-manual-${attempt}` : `onlyfood-raw-${orderId}-${target.kind}-auto`;
      const jobId = await submitPrintNodeJob(target.printerId, `${config.appName} #${orderCode(order)} ${target.kind}`, rawTicket, key, customApiKey);
      await prisma.printDispatch.update({
        where: { orderId_kind: { orderId, kind: target.kind } },
        data: { status: "SENT", printNodeJobId: jobId, error: null },
      });
      jobs.push({ kind: target.kind, success: true, jobId });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido de impresion.";
      await prisma.printDispatch.update({
        where: { orderId_kind: { orderId, kind: target.kind } },
        data: { status: "FAILED", error: message },
      });
      console.error("PrintNode dispatch failed", { orderId, kind: target.kind, error: message });
      jobs.push({ kind: target.kind, success: false, error: message });
    }
  }
  return { success: jobs.every((job) => job.success), skipped: false, jobs };
}

export async function testPrintNode(kind: PrintKind, requestedPrinterId?: number, requestedRollSize?: "58mm" | "80mm", tenantId?: string) {
  if (!tenantId) return { success: false, error: "Comercio requerido." };
  let config: any = null;
  let customApiKey: string | undefined;

  if (tenantId) {
    const { getTenantIntegration } = await import("@/lib/tenant-integrations");
    const creds = await getTenantIntegration<any>(tenantId, "PRINTNODE");
    if (creds?.apiKey) customApiKey = creds.apiKey;
    config = await prisma.systemConfig.findUnique({ where: { tenantId } });
  }

  if (!config) return { success: false, error: "No existe configuracion del comercio." };
  const printerId = requestedPrinterId || (kind === "KITCHEN" ? config.printNodeKitchenPrinterId : config.printNodeCounterPrinterId);
  const rollSize = requestedRollSize || (kind === "KITCHEN" ? config.printerKitchenSize : config.printerCounterSize);
  if (!printerId) return { success: false, error: "Guarda primero el ID de esta impresora." };
  try {
    const rawTicket = await createTestRaw(kind, rollSize, config.logoUrl);
    const jobId = await submitPrintNodeJob(printerId, `${config.appName} - Prueba ${kind}`, rawTicket, `onlyfood-raw-test-${kind}-${Date.now()}`, customApiKey);
    return { success: true, jobId };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "No se pudo enviar la prueba." };
  }
}
