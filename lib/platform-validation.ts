import { z } from "zod";

// Los registros creados actualmente usan UUID. Las primeras instalaciones
// conservaron identificadores estables como `legacy-default-plan` y
// `legacy-default-tenant`, que siguen siendo referencias válidas.
export const platformEntityIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/);
