"use client";

import { useEffect } from "react";

function TicketLogo({ src, appName }: { src: string; appName: string }) {
  return (
    // La imagen nativa permite esperar document.images antes de imprimir.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`Logo de ${appName}`}
      className="mx-auto mb-2 h-auto w-20 object-contain"
      style={{ filter: "grayscale(100%)" }}
      loading="eager"
    />
  );
}

export function PrintTicketClient({ order, config }: { order: any; config: any }) {
  const paperWidth = config?.printerCounterSize === "58mm" ? "58mm" : "80mm";
  const paperWidthMm = paperWidth === "58mm" ? 58 : 80;
  const logoUrl = config?.logoUrl || null;

  useEffect(() => {
    let cancelled = false;

    const waitForImage = (image: HTMLImageElement) => new Promise<void>((resolve) => {
      const hideAndFinish = () => {
        image.hidden = true;
        resolve();
      };

      if (image.complete && image.naturalWidth > 0) {
        resolve();
        return;
      }
      if (image.complete) {
        hideAndFinish();
        return;
      }
      image.addEventListener("load", () => resolve(), { once: true });
      image.addEventListener("error", hideAndFinish, { once: true });
    });

    const prepareAndPrint = async () => {
      if (document.fonts?.ready) await document.fonts.ready;
      await Promise.all(Array.from(document.images).map(waitForImage));
      if (cancelled) return;

      const ticket = document.querySelector<HTMLElement>("[data-print-ticket]");
      if (!ticket) return;

      // Chromium usa 96 px por pulgada. El alto real evita que la impresora
      // complete una hoja larga agregando papel en blanco antes del ticket.
      const heightPx = Math.max(ticket.scrollHeight, ticket.getBoundingClientRect().height);
      const heightMm = Math.max(40, Math.ceil(heightPx / (96 / 25.4)) + 1);
      const pageStyle = document.createElement("style");
      pageStyle.dataset.ticketPageSize = "true";
      pageStyle.textContent = `
        @page ticket { size: ${paperWidthMm}mm ${heightMm}mm; margin: 0; }
        @media print {
          html, body { width: ${paperWidthMm}mm !important; }
          body { page: ticket; }
        }
      `;
      document.head.appendChild(pageStyle);

      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      if (!cancelled) window.print();
    };

    void prepareAndPrint();
    return () => {
      cancelled = true;
      document.querySelector("style[data-ticket-page-size]")?.remove();
    };
  }, [paperWidth, paperWidthMm]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          min-height: 0 !important;
          background: white !important;
        }
        @media print {
          html, body {
            width: ${paperWidth} !important;
            height: auto !important;
            overflow: visible !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
          [data-print-ticket] {
            width: ${paperWidth} !important;
            max-width: ${paperWidth} !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
          .ticket-section { break-inside: avoid; page-break-inside: avoid; }
        }
      ` }} />

      <div
        data-print-ticket
        className="mx-auto bg-white font-mono text-xs leading-tight text-black"
        style={{ width: paperWidth, maxWidth: paperWidth }}
      >
        <section className="ticket-section p-3">
          <div className="mb-4 text-center">
            {logoUrl && <TicketLogo src={logoUrl} appName={config?.appName || "Comercio"} />}
            <h1 className="text-xl font-black">{config?.appName || "NFOOD"}</h1>
            <p className="border-b border-dashed border-black pb-2 text-sm">TICKET COCINA</p>
          </div>

          <div className="mb-5 space-y-1 text-sm leading-snug">
            <p><strong>Orden:</strong> #{order.id.slice(-5).toUpperCase()}</p>
            <p><strong>Fecha:</strong> {new Date(order.createdAt).toLocaleString("es-AR")}</p>
            <p><strong>Cliente:</strong> {order.clientName}</p>
            <p><strong>TIPO:</strong> {order.needsDelivery ? "ENVÍO" : "RETIRO AL MOSTRADOR"}</p>
            <p><strong>Hora Est.:</strong> {order.deliveryTime}</p>
          </div>

          <div className="mb-4 divide-y divide-dashed divide-black border-y border-dashed border-black py-1">
            {order.items.map((item: any, index: number) => (
              <div key={index} className="space-y-1 py-3">
                <div className="flex justify-between text-base font-black leading-snug">
                  <span>{item.quantity}x {item.product.name}</span>
                </div>
                {item.addedExtras?.length > 0 && (
                  <div className="text-xs font-bold leading-snug">+ EXTRA: {item.addedExtras.map((extra: any) => extra.extra.name).join(", ")}</div>
                )}
                {item.removedIngredients?.length > 0 && (
                  <div className="text-sm font-black uppercase leading-snug">- SIN: {item.removedIngredients.map((ingredient: any) => ingredient.ingredient.name).join(", ")}</div>
                )}
                {item.notes && <div className="mt-2 border border-black p-1.5 text-sm font-black uppercase leading-snug">NOTA: {item.notes}</div>}
              </div>
            ))}
          </div>
        </section>

        <div className="mx-3 border-t-2 border-dashed border-black py-2 text-center text-[9px] font-bold">CORTE AQUÍ</div>

        <section className="ticket-section p-3">
          <div className="mb-4 text-center">
            {logoUrl && <TicketLogo src={logoUrl} appName={config?.appName || "Comercio"} />}
            <h1 className="text-xl font-black">{config?.appName || "NFOOD"}</h1>
            <p className="border-b border-dashed border-black pb-2 text-sm">TICKET DE PEDIDO</p>
          </div>

          <div className="mb-4">
            <p><strong>Orden:</strong> #{order.id.slice(-5).toUpperCase()}</p>
            <p><strong>Fecha:</strong> {new Date(order.createdAt).toLocaleString("es-AR")}</p>
            <p><strong>Cliente:</strong> {order.clientName}</p>
            <p><strong>Tel:</strong> {order.clientPhone}</p>
            <p><strong>TIPO:</strong> {order.needsDelivery ? "ENVÍO" : "RETIRO AL MOSTRADOR"}</p>
            {order.needsDelivery && <p><strong>Dirección:</strong> {order.deliveryAddress}</p>}
            <p><strong>Hora Est.:</strong> {order.deliveryTime}</p>
          </div>

          <div className="mb-4 space-y-2 border-y border-dashed border-black py-2">
            {order.items.map((item: any, index: number) => (
              <div key={index} className="mb-2">
                <div className="flex justify-between font-bold">
                  <span>{item.quantity}x {item.product.name}</span>
                  <span>${item.subtotal.toLocaleString("es-AR")}</span>
                </div>
                {item.addedExtras?.length > 0 && (
                  <div className="pl-4 text-[10px]">+ {item.addedExtras.map((extra: any) => extra.extra.name).join(", ")}</div>
                )}
                {item.removedIngredients?.length > 0 && (
                  <div className="pl-4 text-[10px]">- SIN: {item.removedIngredients.map((ingredient: any) => ingredient.ingredient.name).join(", ")}</div>
                )}
              </div>
            ))}
          </div>

          <div className="mb-4 space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Productos:</span>
              <span>${order.items.reduce((sum: number, item: any) => sum + item.subtotal, 0).toLocaleString("es-AR")}</span>
            </div>
            {order.quantityDiscountAmount > 0 && <div className="flex justify-between font-bold"><span>Promo por cantidad:</span><span>-${order.quantityDiscountAmount.toLocaleString("es-AR")}</span></div>}
            <div className="flex justify-between border-t border-black pt-1 text-base font-black">
              <span>TOTAL:</span>
              <span>${order.total.toLocaleString("es-AR")}</span>
            </div>
            <p className="mt-2 border border-black p-1 text-center text-[10px] font-bold">
              {order.paymentMethod === "CASH" ? (order.paymentStatus === "PAID" ? "PAGADO EN EFECTIVO" : "A COBRAR EN EFECTIVO") : order.paymentMethod === "ADMIN" ? "PAGADO EN MOSTRADOR" : "PAGADO VÍA MERCADOPAGO"}
            </p>
          </div>

          <div className="mt-8 flex flex-col items-center text-center">
            <p>¡Muchas gracias por su compra!</p>
            <p>---------------</p>
          </div>
        </section>
      </div>
    </>
  );
}
