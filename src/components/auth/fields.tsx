'use client'

import React from 'react'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/**
 * The field vocabulary shared by the sign-in and sign-up forms.
 *
 * Both forms previously repeated the same label/input/eye-toggle markup, and
 * the toggle button's positioning classes had already drifted apart between
 * them by a pixel.
 */

/** Label + input, with the optional trailing link the password row uses. */
export function Field({
  id,
  label,
  trailing,
  children,
  hint,
}: {
  id: string
  label: string
  /** Rendered on the label's baseline, right-aligned — e.g. "Forgot?". */
  trailing?: React.ReactNode
  children: React.ReactNode
  hint?: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        {trailing}
      </div>
      {children}
      {hint}
    </div>
  )
}

/** Password input with a show/hide control that does not overlap the text. */
export function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  visible,
  onToggleVisible,
  showLabel,
  hideLabel,
  invalid,
  describedBy,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  autoComplete: string
  visible: boolean
  onToggleVisible: () => void
  showLabel: string
  hideLabel: string
  invalid?: boolean
  describedBy?: string
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        className="pr-11"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        required
      />
      <button
        type="button"
        onClick={onToggleVisible}
        aria-label={visible ? hideLabel : showLabel}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-subtle-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

/** Inline error / notice strip above a form. */
export function FormNotice({
  tone = 'danger',
  icon: Icon = AlertCircle,
  children,
  role = 'alert',
}: {
  tone?: 'danger' | 'warning'
  icon?: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  role?: 'alert' | 'status'
}) {
  return (
    <div
      role={role}
      className={cn(
        'flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm text-foreground',
        tone === 'danger' ? 'border-danger bg-danger-subtle' : 'border-warning bg-warning-subtle'
      )}
    >
      <Icon
        className={cn('mt-0.5 h-4 w-4 shrink-0', tone === 'danger' ? 'text-danger' : 'text-warning')}
      />
      <span>{children}</span>
    </div>
  )
}
