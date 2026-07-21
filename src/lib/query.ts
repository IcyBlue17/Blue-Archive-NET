import { QueryClient } from '@tanstack/react-query'
import type { GameName } from './types'

const MINUTE = 60 * 1000

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * MINUTE,
      gcTime: 30 * MINUTE,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
})

export const qk = {
  oauthProviders: ['oauth-providers'] as const,
  oauthLinked: ['oauth-linked'] as const,
  passkeys: ['passkeys'] as const,
  me: ['me'] as const,
  adminStatus: ['admin-status'] as const,
  settings: ['settings'] as const,
  botBinding: ['bot-binding'] as const,
  homeSummary: (username: string) => ['home-summary', username] as const,
  homeChu3Box: (username: string) => ['home-chu3-box', username] as const,
  homeOn9Box: (username: string) => ['home-on9-box', username] as const,
  chu3Rivals: ['chu3-rivals'] as const,
  chu3Team: ['chu3-team'] as const,
  chu3TeamDetailBase: ['chu3-team-detail'] as const,
  chu3TeamDetail: (teamId: number | 'me' = 'me') => ['chu3-team-detail', teamId] as const,
  chu3TeamRanking: (limit: number) => ['chu3-team-ranking', limit] as const,
  chu3TeamRequests: ['chu3-team-requests'] as const,
  cardSummary: (luid: string) => ['card-summary', luid] as const,
  gameDash: (username: string, game: GameName) => ['game-dashboard', username, game] as const,
  gameAllMusic: (game: GameName) => ['game-all-music', game] as const,
  gameLibrary: (username: string, game: GameName) => ['game-library', username, game] as const,
  gamePlaylog: (username: string, game: GameName) => ['game-playlog', username, game] as const,
  collectiblesChu3: ['collectibles', 'chu3'] as const,
  collectiblesOngeki: ['collectibles', 'ongeki'] as const,
  on9Story: ['on9-story'] as const,
  adminOngekiRanking: (type: number) => ['admin-ongeki-ranking', type] as const,
}
