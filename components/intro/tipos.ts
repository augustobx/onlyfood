import type { FormEvent } from 'react'

export interface PropsIngreso {
  ambiente?: string | null
  error?: string | null
  aviso?: string | null
  email: string
  setEmail: (val: string) => void
  password: string
  setPassword: (val: string) => void
  loading: boolean
  onSubmit: (e: FormEvent) => void
  logoUrl?: string | null
}
