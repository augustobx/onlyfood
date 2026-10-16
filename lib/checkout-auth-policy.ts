/** Política de pago tenant-scoped. Los pedidos administrativos nunca requieren sesión de cliente. */
export function requiresClientLogin(
  enabledForTenant: boolean,
  isClientAuthenticated: boolean,
  isAdministrativeOrder: boolean,
): boolean {
  return enabledForTenant && !isClientAuthenticated && !isAdministrativeOrder;
}
