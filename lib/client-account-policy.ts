/**
 * Las cuentas legadas sin correo conservan temporalmente su activación
 * histórica por teléfono. Al cargarles un correo, NO se permite definir
 * una clave solo conociendo el número: primero deben verificar ese buzón.
 */
export function pendingClientNeedsVerifiedEmailActivation(clients: Array<{
  passwordSetupRequired: boolean;
  email: string | null;
}>): boolean {
  return clients.length > 0
    && clients.every(client => client.passwordSetupRequired)
    && clients.some(client => Boolean(client.email));
}

export function canRecoverByEmail(client: {
  email: string | null;
  emailVerifiedAt: Date | null;
}): boolean {
  return Boolean(client.email && client.emailVerifiedAt);
}
