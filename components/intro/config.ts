export interface ConfigIntro {
  /** Nombre del producto o tenant (ej. 'OnlyFood' o el nombre del restaurante / comercio) */
  producto: string
  /** Área o contexto del servicio (arriba a la izquierda) */
  area: string
  /** Qué hace la plataforma en una frase: subtítulo del nombre */
  bajada: string
}

export const INTRO_DEFAULT: ConfigIntro = {
  producto: 'OnlyFood',
  area: 'NanoLabs · Food & Gastronomy Cloud',
  bajada: 'Gestión gastronómica integral para locales, franquicias y cadenas.',
}
