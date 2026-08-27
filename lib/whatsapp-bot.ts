import { prisma } from "@/lib/prisma";
import { createTenantDb } from "@/lib/tenant-db";
import { getTenantIntegration, type WhatsAppCredentials, type MercadoPagoCredentials } from "@/lib/tenant-integrations";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { after } from "next/server";
import { calculateOrderRequirements, formatInventoryIssue, getInventoryIssues, type InventoryIssue, type InventoryRequirement } from "@/lib/inventory";
import { dispatchOrderPrint } from "@/lib/printnode";
import { createOrderTrackingToken } from "@/lib/order-tracking";
import { hasTenantFeature } from "@/lib/features";
import { calculateBestQuantityDiscount } from "@/lib/quantity-discounts";

export class WhatsAppBot {
  private config: any;

  constructor(config: any) {
    this.config = config;
  }

  // Enviar mensaje de texto simple
  async sendText(to: string, text: string) {
    return this.sendRequest({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body: text }
    });
  }

  // Enviar botones (Quick Replies, max 3)
  async sendButtons(to: string, text: string, buttons: { id: string; title: string }[]) {
    return this.sendRequest({
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text },
        action: {
          buttons: buttons.map(b => ({
            type: "reply",
            reply: { id: b.id, title: b.title.substring(0, 20) }
          }))
        }
      }
    });
  }

  // Enviar lista (max 10 opciones por sección)
  async sendList(to: string, text: string, buttonText: string, title: string, rows: { id: string; title: string; description?: string }[]) {
    return this.sendRequest({
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "list",
        header: { type: "text", text: title.substring(0, 60) },
        body: { text: text.substring(0, 1024) },
        action: {
          button: buttonText.substring(0, 20),
          sections: [
            {
              rows: rows.map(r => ({
                id: r.id,
                title: r.title.substring(0, 24),
                description: r.description ? r.description.substring(0, 72) : undefined
              }))
            }
          ]
        }
      }
    });
  }

  private async sendRequest(payload: any) {
    const apiToken = this.config.metaApiToken || this.config.apiToken;
    const phoneNumberId = this.config.metaPhoneNumberId || this.config.phoneNumberId;
    if (!apiToken || !phoneNumberId) return;

    try {
      const response = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) {
        console.error("WhatsApp API Error:", data);
      }
      return data;
    } catch (error) {
      console.error("Fetch error to WhatsApp API:", error);
    }
  }
}

// State machine
export async function handleIncomingMessage(phone: string, message: any, tenantIdHint?: string) {
  let resolvedTenantId = tenantIdHint;

  // Internal callers may resume a session. Public webhooks always pass the
  // tenant resolved from Meta's phone_number_id.
  if (!resolvedTenantId) {
    const existingSession = await prisma.whatsAppSession.findFirst({ where: { phone } });
    resolvedTenantId = existingSession?.tenantId || undefined;
  }

  if (!resolvedTenantId) return;
  if (!(await hasTenantFeature(resolvedTenantId, "whatsapp"))) return;
  const quantityDiscountsEnabled = await hasTenantFeature(resolvedTenantId, "quantityDiscounts");

  const db = createTenantDb(resolvedTenantId);
  const waCreds = await getTenantIntegration<WhatsAppCredentials>(resolvedTenantId, "WHATSAPP");
  const config = await db.systemConfig.findFirst();

  if (!config) return;
  const isBotActive = config.whatsappBotEnabled || !!waCreds?.apiToken;
  if (!isBotActive) return;

  const mergedConfig = {
    ...config,
    metaApiToken: waCreds?.apiToken || config.metaApiToken,
    metaPhoneNumberId: waCreds?.phoneNumberId || config.metaPhoneNumberId,
  };

  const bot = new WhatsAppBot(mergedConfig);
  if (!config.isStoreOpen) {
    await bot.sendText(phone, config.closedMessage || "El local está cerrado en este momento.");
    return;
  }
  
  // Extraer el texto o ID del botón/lista
  let incomingText = "";
  let payloadId = "";

  if (message.type === "text") {
    incomingText = message.text.body;
  } else if (message.type === "interactive") {
    if (message.interactive.type === "button_reply") {
      payloadId = message.interactive.button_reply.id;
      incomingText = message.interactive.button_reply.title;
    } else if (message.interactive.type === "list_reply") {
      payloadId = message.interactive.list_reply.id;
      incomingText = message.interactive.list_reply.title;
    }
  }

  if (!incomingText && !payloadId) return;

  // Cargar sesión aislada por tenant
  let session = await db.whatsAppSession.findFirst({ where: { phone } });
  
  if (!session || incomingText.toLowerCase() === "hola" || incomingText.toLowerCase() === "menu") {
    if (session) {
      session = await db.whatsAppSession.update({
        where: { id: session.id },
        data: { state: "GREETING", cart: [], tempData: {} }
      });
    } else {
      session = await db.whatsAppSession.create({
        data: { phone, state: "GREETING", cart: [], tempData: {} }
      });
    }
  }

  // Helper para actualizar sesión
  const updateSession = async (state: string, tempData?: any, cart?: any) => {
    await db.whatsAppSession.update({
      where: { id: session!.id },
      data: {
        state,
        tempData: tempData !== undefined ? tempData : session!.tempData,
        cart: cart !== undefined ? cart : session!.cart
      }
    });
  };

  const state = session.state;
  const cart: any[] = (session.cart as any[]) || [];
  const tempData: any = session.tempData || {};

  try {
    switch (state) {
      case "GREETING":
        const categories = await db.category.findMany({ where: { isActive: true }, orderBy: { sequence: 'asc' } });
        if (categories.length === 0) {
          await bot.sendText(phone, "Lo sentimos, el menú no está disponible en este momento.");
          return;
        }
        
        await bot.sendList(
          phone,
          "¡Hola! Bienvenido a " + (config.appName || "nuestro local") + ". Por favor elige una categoría:",
          "Ver Categorías",
          "Menú",
          categories.slice(0, 10).map(c => ({ id: `cat_${c.id}`, title: c.name }))
        );
        await updateSession("BROWSING_CATEGORY");
        break;

      case "BROWSING_CATEGORY":
        if (!payloadId.startsWith("cat_")) {
          await bot.sendText(phone, "Por favor, elige una categoría usando el menú.");
          return;
        }
        const catId = payloadId.replace("cat_", "");
        const products = await db.product.findMany({
          where: { categoryId: catId, isActive: true },
          orderBy: { sequence: 'asc' }
        });

        if (products.length === 0) {
          await bot.sendText(phone, "No hay productos disponibles en esta categoría por ahora.");
          return;
        }

        await bot.sendList(
          phone,
          "Elige un producto:",
          "Ver Productos",
          "Productos",
          products.slice(0, 10).map(p => ({
            id: `prod_${p.id}`,
            title: `${p.name.substring(0, 18)} - $${p.basePrice}`,
            description: p.description || undefined
          }))
        );
        await updateSession("BROWSING_PRODUCT");
        break;

      case "BROWSING_PRODUCT":
        if (!payloadId.startsWith("prod_")) {
          await bot.sendText(phone, "Por favor, elige un producto de la lista.");
          return;
        }
        const prodId = payloadId.replace("prod_", "");
        const product = await db.product.findFirst({
          where: { id: prodId, isActive: true },
          include: { ingredients: { include: { ingredient: true } } }
        });

        if (!product) {
          await bot.sendText(phone, "Producto no encontrado.");
          return;
        }

        await bot.sendButtons(
          phone,
          `*${product.name}*\n${product.description || ""}\nPrecio: $${product.basePrice}\n\n¿Deseas agregarlo a tu pedido?`,
          [
            { id: `add_${product.id}_1`, title: "Agregar 1" },
            { id: `add_${product.id}_2`, title: "Agregar 2" },
            { id: `cancel_add`, title: "Ver otro" }
          ]
        );
        await updateSession("CONFIRMING_PRODUCT");
        break;

      case "CONFIRMING_PRODUCT":
        if (payloadId === "cancel_add") {
          const cats = await db.category.findMany({ where: { isActive: true }, orderBy: { sequence: 'asc' } });
          await bot.sendList(
            phone,
            "Elige otra categoría:",
            "Ver Categorías",
            "Menú",
            cats.slice(0, 10).map(c => ({ id: `cat_${c.id}`, title: c.name }))
          );
          await updateSession("BROWSING_CATEGORY");
          return;
        }

        if (payloadId.startsWith("add_")) {
          const parts = payloadId.split("_");
          const selectedProdId = parts[1];
          const qty = parseInt(parts[2], 10) || 1;

          const existingIdx = cart.findIndex(item => item.productId === selectedProdId);
          if (existingIdx >= 0) {
            cart[existingIdx].quantity += qty;
          } else {
            cart.push({ productId: selectedProdId, quantity: qty });
          }

          await bot.sendButtons(
            phone,
            `¡Listo! Agregado a tu pedido.\n\n¿Qué deseas hacer ahora?`,
            [
              { id: "action_more", title: "Agregar más" },
              { id: "action_cart", title: "Ver Pedido" },
              { id: "action_checkout", title: "Finalizar Pedido" }
            ]
          );
          await updateSession("MANAGING_CART", tempData, cart);
        }
        break;

      case "MANAGING_CART":
        if (payloadId === "action_more") {
          const cats = await db.category.findMany({ where: { isActive: true }, orderBy: { sequence: 'asc' } });
          await bot.sendList(
            phone,
            "Elige una categoría:",
            "Ver Categorías",
            "Menú",
            cats.slice(0, 10).map(c => ({ id: `cat_${c.id}`, title: c.name }))
          );
          await updateSession("BROWSING_CATEGORY");
        } else if (payloadId === "action_cart") {
          if (cart.length === 0) {
            await bot.sendText(phone, "Tu pedido está vacío. Escribe 'menu' para empezar.");
            return;
          }
          const prods = await db.product.findMany({ where: { id: { in: cart.map(i => i.productId) } } });
          let summary = "Tu pedido actual:\n";
          let total = 0;
          cart.forEach(item => {
            const p = prods.find(x => x.id === item.productId);
            if (p) {
              const sub = p.basePrice * item.quantity;
              total += sub;
              summary += `• ${item.quantity}x ${p.name} ($${sub})\n`;
            }
          });
          summary += `\nTotal: $${total}`;

          await bot.sendButtons(
            phone,
            summary,
            [
              { id: "action_more", title: "Agregar más" },
              { id: "action_clear", title: "Vaciar Carrito" },
              { id: "action_checkout", title: "Continuar" }
            ]
          );
        } else if (payloadId === "action_clear") {
          await updateSession("GREETING", {}, []);
          await bot.sendText(phone, "Carrito vaciado. Escribe 'menu' para empezar de nuevo.");
        } else if (payloadId === "action_checkout") {
          if (cart.length === 0) {
            await bot.sendText(phone, "Tu pedido está vacío.");
            return;
          }
          await bot.sendButtons(
            phone,
            "¿Cómo deseas recibir tu pedido?",
            [
              { id: "deliv_yes", title: "Envío a domicilio" },
              { id: "deliv_no", title: "Retiro en local" }
            ]
          );
          await updateSession("AWAITING_DELIVERY_TYPE");
        }
        break;

      case "AWAITING_DELIVERY_TYPE":
        if (payloadId === "deliv_yes") {
          await bot.sendText(phone, "Por favor escribe tu dirección de entrega completa (Calle, Número, Depto):");
          await updateSession("AWAITING_ADDRESS", { ...tempData, needsDelivery: true });
        } else if (payloadId === "deliv_no") {
          const slots = await db.deliveryTimeSlot.findMany({ where: { isActive: true, available: { gt: 0 } }, orderBy: { sequence: "asc" }, take: 10 });
          if (!slots.length) return bot.sendText(phone, "No quedan horarios disponibles por el momento.");
          await bot.sendList(phone, "Elegí un horario para retirar:", "Ver horarios", "Horarios", slots.map(slot => ({ id: `slot_${slot.id}`, title: `${slot.time} hs`, description: `${slot.available} lugares` })));
          await updateSession("AWAITING_TIME_SLOT", { ...tempData, needsDelivery: false, address: "Retiro en local" });
        }
        break;

      case "AWAITING_ADDRESS":
        const address = incomingText.trim();
        if (address.length < 5) {
          await bot.sendText(phone, "Por favor ingresa una dirección válida y detallada:");
          return;
        }
        
        const slots = await db.deliveryTimeSlot.findMany({ where: { isActive: true, available: { gt: 0 } }, orderBy: { sequence: "asc" }, take: 10 });
        if (!slots.length) return bot.sendText(phone, "No quedan horarios disponibles por el momento.");
        await bot.sendList(phone, `Dirección guardada: ${address}\n\nElegí un horario:`, "Ver horarios", "Horarios", slots.map(slot => ({ id: `slot_${slot.id}`, title: `${slot.time} hs`, description: `${slot.available} lugares` })));
        await updateSession("AWAITING_TIME_SLOT", { ...tempData, address });
        break;

      case "AWAITING_TIME_SLOT":
        if (!payloadId.startsWith("slot_")) return bot.sendText(phone, "Elegí un horario de la lista.");
        const deliverySlotId = payloadId.replace("slot_", "");
        const selectedSlot = await db.deliveryTimeSlot.findFirst({ where: { id: deliverySlotId, isActive: true, available: { gt: 0 } } });
        if (!selectedSlot) return bot.sendText(phone, "Ese horario ya no está disponible. Escribí 'menu' para comenzar nuevamente.");
        const paymentButtons = [];
        if (config.paymentCash) paymentButtons.push({ id: "pay_cash", title: "Efectivo" });
        const mpKey = (await getTenantIntegration<MercadoPagoCredentials>(resolvedTenantId, "MERCADO_PAGO"))?.accessToken;
        if (config.paymentMp && mpKey) paymentButtons.push({ id: "pay_mp", title: "MercadoPago" });
        if (!paymentButtons.length) return bot.sendText(phone, "No hay medios de pago disponibles.");
        await bot.sendButtons(phone, `Horario: ${selectedSlot.time} hs. ¿Cómo vas a pagar?`, paymentButtons);
        await updateSession("AWAITING_PAYMENT_METHOD", { ...tempData, deliverySlotId, deliveryTime: selectedSlot.time });
        break;

      case "AWAITING_PAYMENT_METHOD":
        if (payloadId !== "pay_cash" && payloadId !== "pay_mp") {
          await bot.sendText(phone, "Usa los botones para elegir un método de pago.");
          return;
        }

        const resolvedMpKey = (await getTenantIntegration<MercadoPagoCredentials>(resolvedTenantId, "MERCADO_PAGO"))?.accessToken;
        if ((payloadId === "pay_cash" && !config.paymentCash) || (payloadId === "pay_mp" && (!config.paymentMp || !resolvedMpKey))) {
          return bot.sendText(phone, "Ese medio de pago ya no está disponible.");
        }
        const paymentMethod = payloadId === "pay_cash" ? "CASH" : "MP";
        const now = new Date();
        const [currentProducts, activeQuantityDiscounts, primaryLocation] = await Promise.all([
          db.product.findMany({
            where: { id: { in: cart.map(item => item.productId) }, isActive: true },
            select: {
              id: true,
              basePrice: true,
              isCombo: true,
              ingredients: { include: { ingredient: true } },
              comboItemsConfig: { include: { product: { include: { ingredients: { include: { ingredient: true } } } } } },
            },
          }),
          quantityDiscountsEnabled ? db.quantityDiscount.findMany({
            where: { isActive: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] },
            include: { products: { select: { productId: true } } },
            orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
          }) : Promise.resolve([]),
          db.location.findFirst({ where: { isActive: true }, orderBy: [{ isMain: "desc" }, { createdAt: "asc" }], select: { id: true } }),
        ]);
        const priceMap = new Map(currentProducts.map(product => [product.id, product.basePrice]));
        if (priceMap.size !== new Set(cart.map(item => item.productId)).size) return bot.sendText(phone, "Uno de los productos ya no está disponible. Escribí 'menu' para comenzar nuevamente.");
        const productMap = new Map(currentProducts.map(product => [product.id, product]));
        const stockMap = new Map<string, InventoryRequirement>();
        const addStock = (usage: any, amount: number) => {
          const current = stockMap.get(usage.ingredientId);
          stockMap.set(usage.ingredientId, {
            ingredientId: usage.ingredientId,
            name: usage.ingredient.name,
            required: (current?.required ?? 0) + amount,
            available: usage.ingredient.stock,
          });
        };
        for (const cartItem of cart) {
          const product = productMap.get(cartItem.productId)!;
          if (product.isCombo) {
            for (const comboItem of product.comboItemsConfig) {
              for (const usage of comboItem.product.ingredients) addStock(usage, usage.quantity * comboItem.quantity * cartItem.quantity);
            }
          } else {
            for (const usage of product.ingredients) addStock(usage, usage.quantity * cartItem.quantity);
          }
        }
        const stockRequirements = [...stockMap.values()];
        const subtotal = cart.reduce((acc, item) => acc + (priceMap.get(item.productId) || 0) * item.quantity, 0);
        const quantityDiscount = calculateBestQuantityDiscount(
          cart.map((item) => ({ productId: item.productId, quantity: item.quantity, unitPrice: priceMap.get(item.productId) || 0 })),
          activeQuantityDiscounts.map((rule) => ({ id: rule.id, name: rule.name, minQuantity: rule.minQuantity, type: rule.type, value: rule.value, priority: rule.priority, productIds: rule.products.map((product) => product.productId) })),
        );
        const discounted = (subtotal - (quantityDiscount?.amount || 0)) * (1 - Math.min(100, Math.max(0, config.globalDiscount)) / 100);
        const totalAmount = Math.round((discounted + (tempData.needsDelivery ? Math.max(0, config.deliveryCost) : 0)) * 100) / 100;

        // CREATE ORDER IN DB (Aislada en tenantDb)
        const tracking = createOrderTrackingToken();
        const order = await db.$transaction(async (tx) => {
          const reserved = await tx.deliveryTimeSlot.updateMany({ where: { id: tempData.deliverySlotId, isActive: true, available: { gt: 0 } }, data: { available: { decrement: 1 } } });
          if (reserved.count !== 1) throw new Error("SLOT_UNAVAILABLE");
          const legacyPendingOrders = await tx.order.findMany({
            where: { status: "NEW", stockCommitted: false },
            include: {
              items: {
                include: {
                  removedIngredients: true,
                  product: { include: { ingredients: { include: { ingredient: true } } } },
                  secondHalfProduct: { include: { ingredients: { include: { ingredient: true } } } },
                  comboItems: { include: { removedIngredients: true, product: { include: { ingredients: { include: { ingredient: true } } } } } },
                },
              },
            },
          });
          const legacyDemand = new Map<string, number>();
          for (const pendingOrder of legacyPendingOrders) {
            for (const requirement of calculateOrderRequirements(pendingOrder.items)) {
              legacyDemand.set(requirement.ingredientId, (legacyDemand.get(requirement.ingredientId) ?? 0) + requirement.required);
            }
          }
          const effectiveRequirements = stockRequirements.map((requirement) => ({
            ...requirement,
            available: Math.max(0, requirement.available - (legacyDemand.get(requirement.ingredientId) ?? 0)),
          }));
          const stockIssues = getInventoryIssues(effectiveRequirements);
          if (stockIssues.length) throw new Error(`STOCK_SHORTAGE:${encodeURIComponent(JSON.stringify(stockIssues))}`);
          for (const requirement of stockRequirements) {
            const stockReserved = await tx.ingredient.updateMany({
              where: { id: requirement.ingredientId, stock: { gte: requirement.required } },
              data: { stock: { decrement: requirement.required } },
            });
            if (stockReserved.count !== 1) {
              const issue: InventoryIssue = { ...requirement, missing: requirement.required };
              throw new Error(`STOCK_SHORTAGE:${encodeURIComponent(JSON.stringify([issue]))}`);
            }
          }
          return tx.order.create({ data: {
            trackingTokenHash: tracking.tokenHash,
            clientName: "Cliente WhatsApp",
            clientPhone: phone,
            needsDelivery: tempData.needsDelivery,
            deliveryAddress: tempData.address,
            deliverySlotId: tempData.deliverySlotId,
            deliveryTime: tempData.deliveryTime,
            paymentMethod,
            total: totalAmount,
            quantityDiscountAmount: quantityDiscount?.amount || 0,
            discountDetails: quantityDiscount || undefined,
            status: "NEW",
            paymentStatus: "PENDING",
            stockCommitted: true,
            tenantId: resolvedTenantId,
            locationId: primaryLocation?.id || null,
            items: {
              create: cart.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: priceMap.get(item.productId) || 0,
                subtotal: (priceMap.get(item.productId) || 0) * item.quantity,
                isHalfAndHalf: false
              }))
            },
            history: {
              create: { status: "NEW" }
            }
          }});
        });

        await updateSession("FINISHED", {}, []);

        if (paymentMethod === "CASH") {
          after(() => dispatchOrderPrint(order.id, { tenantId: resolvedTenantId }).catch((error) => console.error("WhatsApp automatic print failed", { orderId: order.id, error })));
          await bot.sendText(phone, `¡Gracias por tu pedido!\nEl número de tu orden es: ${order.id.slice(-6).toUpperCase()}.\nEl total a pagar es $${totalAmount}.\nTe avisaremos cuando esté listo.`);
        } else {
          // If MercadoPago, try to generate link
          let mpInitPoint = "";
          if (resolvedMpKey) {
            try {
              const primaryDomain = await prisma.tenantDomain.findFirst({
                where: { tenantId: resolvedTenantId, isPrimary: true, OR: [{ isCustom: false }, { verifiedAt: { not: null } }] },
                select: { hostname: true },
              });
              const customerBaseUrl = primaryDomain ? `https://${primaryDomain.hostname}` : process.env.BASE_URL;
              const mpClient = new MercadoPagoConfig({ accessToken: resolvedMpKey });
              const preference = new Preference(mpClient);
              const result = await preference.create({
                body: {
                  items: [
                    { id: order.id, title: `Pedido ${config.appName || "OnlyFood"}`, quantity: 1, unit_price: Number(totalAmount) }
                  ],
                  external_reference: order.id,
                  notification_url: process.env.BASE_URL ? `${process.env.BASE_URL}/api/webhooks/mercadopago?tenant=${encodeURIComponent(resolvedTenantId)}` : undefined,
                  back_urls: customerBaseUrl ? {
                    success: `${customerBaseUrl}/track/${order.id}?status=approved&token=${tracking.token}`,
                    failure: `${customerBaseUrl}/track/${order.id}?status=failure&token=${tracking.token}`,
                    pending: `${customerBaseUrl}/track/${order.id}?status=pending&token=${tracking.token}`,
                  } : undefined,
                  auto_return: customerBaseUrl ? "approved" : undefined
                }
              });
              if (result.init_point) {
                 mpInitPoint = result.init_point;
                 await db.order.update({ where: { id: order.id }, data: { mpPreferenceId: result.id } });
              }
            } catch (error) {
              console.error("WhatsApp Mercado Pago preference error:", error);
            }
          }
          
          if (mpInitPoint) {
            await bot.sendText(phone, `¡Gracias por tu pedido!\n\nPor favor, realiza el pago ingresando aquí:\n${mpInitPoint}\n\nTu número de orden es: ${order.id.slice(-6).toUpperCase()}.`);
          } else {
            await db.$transaction(async (tx) => {
              await tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED", stockCommitted: false, history: { create: { status: "CANCELLED" } } } });
              await tx.deliveryTimeSlot.update({ where: { id: tempData.deliverySlotId }, data: { available: { increment: 1 } } });
              for (const requirement of stockRequirements) {
                await tx.ingredient.update({ where: { id: requirement.ingredientId }, data: { stock: { increment: requirement.required } } });
              }
            });
            await bot.sendText(phone, "No pudimos generar el link de pago y el pedido fue cancelado sin cargo. Escribí 'menu' para intentarlo nuevamente.");
          }
        }
        break;

      case "FINISHED":
        await bot.sendText(phone, "Tu pedido ya fue registrado. Si deseas hacer uno nuevo, escribe 'menu'.");
        break;

      default:
        await bot.sendText(phone, "Escribe 'hola' o 'menu' para comenzar.");
        break;
    }
  } catch (error) {
    console.error("Error procesando mensaje de bot:", error);
    const code = error instanceof Error ? error.message : "";
    if (code.startsWith("STOCK_SHORTAGE:")) {
      try {
        const issues = JSON.parse(decodeURIComponent(code.slice("STOCK_SHORTAGE:".length))) as InventoryIssue[];
        await bot.sendText(phone, `No queda stock suficiente para completar el pedido. ${issues.map(formatInventoryIssue).join(". ")} Elegí menos unidades o escribí 'menu' para volver a empezar.`);
      } catch {
        await bot.sendText(phone, "Uno de los productos se quedó sin stock. Escribí 'menu' para volver a empezar.");
      }
    }
  }
}
