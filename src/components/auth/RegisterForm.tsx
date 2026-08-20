'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FormNotice, PasswordInput } from './fields'
import { PasswordStrength } from './PasswordStrength'
import { register as apiRegister } from '@/lib/api'
import { toast } from 'sonner'
import { Link, useRouter } from '@/i18n/navigation'

export function RegisterForm() {
  const router = useRouter()
  const t = useTranslations('auth')
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const mismatch = confirmPassword.length > 0 && password !== confirmPassword

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      if (!name.trim()) throw new Error(t('nameRequired'))
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(t('enterValidEmail'))
      // 8 is the floor; the meter nudges toward better.
      if (!password || password.length < 8) throw new Error(t('passwordMin'))
      if (password !== confirmPassword) throw new Error(t('passwordsNoMatch'))
      await apiRegister({ name, email, password })
      toast.success(t('accountCreated'))
      router.replace('/organization')
    } catch (err: any) {
      const raw = err?.response?.data?.message || err?.message || t('registrationFailed')
      const msg = Array.isArray(raw) ? raw[0] : raw
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {error && <FormNotice>{error}</FormNotice>}

      <Field id="register-name" label={t('fullName')}>
        <Input
          id="register-name"
          autoComplete="name"
          placeholder={t('namePlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </Field>

      <Field id="register-email" label={t('workEmail')}>
        <Input
          id="register-email"
          type="email"
          autoComplete="email"
          placeholder={t('emailPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </Field>

      <Field
        id="register-password"
        label={t('password')}
        hint={
          <div id="register-password-strength">
            <PasswordStrength password={password} />
          </div>
        }
      >
        <PasswordInput
          id="register-password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          visible={showPassword}
          onToggleVisible={() => setShowPassword((s) => !s)}
          showLabel={t('showPassword')}
          hideLabel={t('hidePassword')}
          describedBy="register-password-strength"
        />
      </Field>

      <Field
        id="register-confirm"
        label={t('confirmPassword')}
        hint={mismatch ? <p className="text-xs text-danger" role="alert">{t('passwordsNoMatch')}</p> : undefined}
      >
        <PasswordInput
          id="register-confirm"
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
          visible={showPassword}
          onToggleVisible={() => setShowPassword((s) => !s)}
          showLabel={t('showPassword')}
          hideLabel={t('hidePassword')}
          invalid={mismatch}
        />
      </Field>

      {/* Only disabled while submitting. A submit disabled on an empty form
          just looks broken — onSubmit validates and says what is wrong. */}
      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            {t('creatingAccount')}
          </>
        ) : (
          t('createAccount')
        )}
      </Button>

      {/* Consent, as any sellable SaaS needs. */}
      <p className="text-center text-xs leading-relaxed text-subtle-foreground">
        {t('consentPre')}{' '}
        <Link href="/terms" className="text-primary underline-offset-4 hover:underline">
          {t('termsOfService')}
        </Link>{' '}
        {t('and')}{' '}
        <Link href="/privacy" className="text-primary underline-offset-4 hover:underline">
          {t('privacyPolicy')}
        </Link>
        .
      </p>
    </form>
  )
}
