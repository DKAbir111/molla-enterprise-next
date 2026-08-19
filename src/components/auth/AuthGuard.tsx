'use client'

import React from 'react'
import { useLocale } from 'next-intl'
import { getAuthToken } from '@/lib/api'
import { useRouter } from '@/i18n/navigation'

export function AuthGuard() {
  const router = useRouter()
  const locale = useLocale()

  React.useEffect(() => {
    const token = getAuthToken()
    if (!token) router.replace('/login')
  }, [router, locale])

  return null
}

