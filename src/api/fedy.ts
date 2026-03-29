import { userPost } from './client'

export async function status() {
  return userPost('/api/v2/fedy/status', {})
}

export async function link(nonce: string) {
  return userPost('/api/v2/fedy/link', { nonce })
}

export async function unlink() {
  return userPost('/api/v2/fedy/unlink', {})
}
