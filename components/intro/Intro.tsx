'use client'

import React, { useEffect, useState } from 'react'
import './base.css'
import './login.css'
import { Login } from './Login'
import type { PropsIngreso } from './tipos'
import type { ConfigIntro } from './config'

const MINIMO_MS = 1400
const SALIDA_MS = 700
const montada = typeof performance !== 'undefined' ? performance.now() : Date.now()

export function Intro({
  estado,
  ingreso,
  config,
}: {
  estado: 'verificando' | 'ingreso' | 'adentro'
  ingreso?: PropsIngreso
  config?: Partial<ConfigIntro>
}) {
  const [salida, setSalida] = useState<'no' | 'saliendo' | 'fuera'>('no')
  const [splashListo, setSplashListo] = useState(false)

  useEffect(() => {
    const ahora = typeof performance !== 'undefined' ? performance.now() : Date.now()
    const t = setTimeout(() => setSplashListo(true), Math.max(0, MINIMO_MS - (ahora - montada)))
    return () => clearTimeout(t)
  }, [])

  const adentro = estado === 'adentro'
  useEffect(() => {
    if (!adentro || !splashListo) return
    setSalida('saliendo')
    const t = setTimeout(() => setSalida('fuera'), SALIDA_MS)
    return () => clearTimeout(t)
  }, [adentro, splashListo])

  if (adentro && salida === 'fuera') return null

  const modo = adentro
    ? splashListo
      ? 'saliendo'
      : 'verificando'
    : estado === 'ingreso' && splashListo
      ? 'ingreso'
      : 'verificando'

  return (
    <div className={adentro ? 'bh2-capa' : undefined}>
      <Login modo={modo} ingreso={ingreso} config={config} />
    </div>
  )
}
