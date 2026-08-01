import { useCallback, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as gameApi from '../api/game'
import { qk } from '../lib/query'
import type { Chu3FavoriteBox, Chu3FavoriteKind } from '../lib/types'

export const CHU3_FAV_MUSIC: Chu3FavoriteKind = 1
export const CHU3_FAV_CHARACTER: Chu3FavoriteKind = 3

const EMPTY: Chu3FavoriteBox = { music: [], musicMax: 0, character: [], characterMax: 0 }

/**
 * 中二「喜爱」清单的共享状态。乐曲列表页和收藏品页都会读它，所以放在一个 query key 下，
 * 任一处改动另一处立刻同步。
 */
export function useChu3Favorites(enabled = true) {
  const qc = useQueryClient()
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const query = useQuery<Chu3FavoriteBox>({
    queryKey: qk.chu3Favorites,
    enabled,
    placeholderData: (old) => old,
    queryFn: async () => gameApi.chu3FavoriteList(),
  })

  const box = query.data ?? EMPTY
  const musicSet = useMemo(() => new Set(box.music), [box.music])
  const charaSet = useMemo(() => new Set(box.character), [box.character])

  const has = useCallback(
    (kind: Chu3FavoriteKind, id: number) => (kind === CHU3_FAV_MUSIC ? musicSet : charaSet).has(id),
    [charaSet, musicSet],
  )

  const isBusy = useCallback((kind: Chu3FavoriteKind, id: number) => busyKey === `${kind}:${id}`, [busyKey])

  /**
   * 切换收藏；返回切换后是否已收藏，另一次请求还在跑时返回 null（调用方据此跳过提示）。
   * 失败时抛错，由调用方决定怎么提示。
   */
  const toggle = useCallback(
    async (kind: Chu3FavoriteKind, id: number): Promise<boolean | null> => {
      if (busyKey != null) return null
      const isAdd = !has(kind, id)
      setBusyKey(`${kind}:${id}`)
      try {
        const next = isAdd ? await gameApi.chu3FavoriteAdd(kind, id) : await gameApi.chu3FavoriteRemove(kind, id)
        qc.setQueryData(qk.chu3Favorites, next)
        return isAdd
      } finally {
        setBusyKey(null)
      }
    },
    [busyKey, has, qc],
  )

  return {
    box,
    musicSet,
    charaSet,
    has,
    isBusy,
    toggle,
    busy: busyKey != null,
    loading: query.isPending && !query.data,
    error: query.error instanceof Error ? query.error.message : query.error ? 'failed' : null,
  }
}
