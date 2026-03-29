import { TOKEN_KEY } from '../api/client'

export { AuthProvider, useAuth } from '../components/auth/AuthProvider'

export function readToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}
