import type { AllNetClient, TrCheckGood, TrStreamMessage } from '../lib/types'
import { userPost, userPostStream } from './client'

export async function check(client: AllNetClient) {
  return userPost('/api/v2/transfer/check', {}, { json: client }) as Promise<TrCheckGood>
}

export async function pull(client: AllNetClient, onChunk: (data: TrStreamMessage) => void) {
  return userPostStream('/api/v2/transfer/pull', {}, (d) => onChunk(d as TrStreamMessage), {
    json: client,
  })
}

export async function push(client: AllNetClient, data: string) {
  return userPost('/api/v2/transfer/push', {}, { json: { client, data } })
}
