import type { Card, CardSummary } from '../lib/types'
import { userPost } from './client'

export async function summary(cardId: string) {
  return userPost('/api/v2/card/summary', { cardId }) as Promise<{
    card: Card
    summary: CardSummary
  }>
}

export async function link(props: { cardId: string; migrate: string }) {
  return userPost('/api/v2/card/link', {
    cardId: props.cardId,
    migrate: props.migrate,
  })
}

export async function unlink(cardId: string) {
  return userPost('/api/v2/card/unlink', { cardId })
}

export async function userGames(username: string) {
  return userPost('/api/v2/card/user-games', { username }) as Promise<CardSummary>
}

export async function defaultGame(game: string) {
  return userPost('/api/v2/card/default-game', { game })
}
