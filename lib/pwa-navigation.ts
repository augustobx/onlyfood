/** Evita un CTA flotante encima del formulario, del carrito o del seguimiento. */
export function shouldShowActiveOrderShortcut(path: string): boolean {
  return path === "/" || path === "/favorites";
}
