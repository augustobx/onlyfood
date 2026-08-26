# Planes SaaS, Suscripciones y Feature Flags

## 1. Planes Comerciales

| Plan | Sucursales Máx. | Productos Máx. | Funcionalidades Incluidas |
| :--- | :---: | :---: | :--- |
| **STARTER** | 1 | 50 | Pedidos inmediatos y programados, catálogo básico. |
| **PRO** | 3 | 300 | STARTER + Programa de Fidelidad / Puntos, Ruleta de Premios, Impresión PrintNode. |
| **BUSINESS** | 20+ | 2000+ | PRO + WhatsApp Bot Automático, Dominios Personalizados, Múltiples Sucursales, Reportes Avanzados. |

---

## 2. Ciclo de Vida de Suscripción

* `TRIAL`: Período de prueba activo con fecha límite en `trialEndsAt`.
* `ACTIVE`: Suscripción activa y al día.
* `PAST_DUE`: Pago pendiente de regularización.
* `SUSPENDED`: Comercio temporalmente bloqueado por falta de pago o acción administrativa.
* `CANCELED`: Suscripción dada de baja.
