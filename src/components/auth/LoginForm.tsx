'use client'

import React from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Info, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FormNotice, PasswordInput } from './fields'
import { login as apiLogin } from '@/lib/api'
import { toast } from 'sonner'
import { Link, useRouter } from '@/i18n/navigation'

export function LoginForm() {
  const router = useRouter()
  const t = useTranslations('auth')
  const searchParams = useSearchParams()
  // Set by the 401 interceptor so an expired session explains itself here
  // rather than looking like a random logout.
  const sessionExpired = searchParams.get('session') === 'expired'
  const from = searchParams.get('from')

  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(t('enterValidEmail'))
      if (!password) throw new Error(t('enterPassword'))
      const res = await apiLogin({ email, password })
      const hasOrg = !!res.user.organizationId
      toast.success(t('signedIn'))
      // Send them back where the expired session interrupted them.
      if (hasOrg && from && from.startsWith('/')) router.replace(from)
      else router.replace(hasOrg ? '/dashboard' : '/organization')
    } catch (err: any) {
      const raw = err?.response?.data?.message || err?.message || t('loginFailed')
      const msg = Array.isArray(raw) ? raw[0] : raw
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {sessionExpired && !error && (
        <FormNotice tone="warning" icon={Info} role="status">
          {t('sessionExpired')}
        </FormNotice>
      )}
      {error && <FormNotice>{error}</FormNotice>}

      <Field id="login-email" label={t('email')}>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          placeholder={t('emailPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </Field>

      <Field
        id="login-password"
        label={t('password')}
        trailing={
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            {t('forgotPassword')}
          </Link>
        }
      >
        <PasswordInput
          id="login-password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          visible={showPassword}
          onToggleVisible={() => setShowPassword((s) => !s)}
          showLabel={t('showPassword')}
          hideLabel={t('hidePassword')}
        />
      </Field>

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            {t('signingIn')}
          </>
        ) : (
          t('signIn')
        )}
      </Button>
    </form>
  )
}
