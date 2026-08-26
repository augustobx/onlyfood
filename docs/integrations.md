# Integraciones por Comercio (Mercado Pago, WhatsApp, PrintNode)

## 1. Mercado Pago

Cada comercio configura sus propias credenciales de Mercado Pago:
* `accessToken`: Token de producción del comercio.
* `publicKey`: Clave pública para Checkout Pro y Bricks.
* `webhookSecret`: Clave para validar firmas de webhooks entrantes.

Los fondos van **100% directos a la cuenta de Mercado Pago del comercio**.

```ts
import { getTenantIntegration, type MercadoPagoCredentials } from "@/lib/tenant-integrations";

const creds = await getTenantIntegration<MercadoPagoCredentials>(tenantId, "MERCADO_PAGO");
// Usar creds.accessToken para inicializar la SDK de Mercado Pago
```

---

## 2. WhatsApp Meta Cloud API

* Cada comercio conecta su `phoneNumberId` y `apiToken` de Meta Graph API.
* El bot procesa pedidos de forma aislada mediante `WhatsAppSession` con clave compuesta `(tenantId, phone)`.

---

## 3. PrintNode (Impresión Térmica)

* Despacho automático de comandas y tickets a impresoras de cocina y mostrador (58mm y 80mm).
* Identificadores de impresora (`printNodeCounterPrinterId`, `printNodeKitchenPrinterId`) configurados por comercio y sucursal.
