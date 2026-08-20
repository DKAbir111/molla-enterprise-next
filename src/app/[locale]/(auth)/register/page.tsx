import { AuthFlow } from '@/components/auth/AuthFlow'

/**
 * Sign up. The same flow as /login, opened on the other pane — deep links and
 * refreshes land here directly rather than on sign-in.
 */
export default function RegisterPage() {
  return <AuthFlow initialMode="register" />
}
