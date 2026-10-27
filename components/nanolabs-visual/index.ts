// NanoLabs Visual System: componentes internos para SaaS y portales multi-tenant.
export { LayoutNanoLabs } from './LayoutNanoLabs';
export type { LayoutNanoLabsProps } from './LayoutNanoLabs';
export { PaletteSelector } from './PaletteSelector';
export { ERPThemeProvider, useERPTheme } from './ThemeContext';
export { PALETTES, getPalette, applyPaletteToDOM } from './palettes';

export {
  NanoLabsButton,
  BhButton,
  NanoLabsChip,
  BhChip,
  NanoLabsAlert,
  BhAlert,
  NanoLabsModal,
  BhModal,
  NanoLabsTabs,
  BhTabs,
  Encabezado,
  Indicador,
  Volver,
  Cargando,
  Vacio,
  ToastProvider,
  useToast,
  useTema,
} from './NanoLabsComponents';

export type {
  NanoLabsButtonProps,
  NanoLabsChipProps,
  NanoLabsAlertProps,
  NanoLabsModalProps,
  NanoLabsTabsProps,
  NanoLabsTab,
  IconoNanoLabs,
  Tono,
  TipoToast,
} from './NanoLabsComponents';
