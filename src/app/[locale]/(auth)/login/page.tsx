import { AuthFlow } from '@/components/auth/AuthFlow'

/**
 * Sign in. Renders the shared flow, which also holds the sign-up form so the
 * switch between them animates in place instead of navigating.
 */
export default function LoginPage() {
  return <AuthFlow initialMode="login" />
}
