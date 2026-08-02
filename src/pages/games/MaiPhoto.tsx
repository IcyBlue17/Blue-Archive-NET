import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import * as gameApi from '@/api/game'
import { apiUrl } from '@/lib/config'
import { imgCross, imgUrl } from '@/lib/imgSign'
import { readToken } from '@/hooks/useAuth'
import { useAppTexts } from '@/content/texts'
import { SectionCard } from '@/components/ui/SectionCard'
import { Text } from '@/components/ui/Text'

export function MaiPhotoPage() {
  const texts = useAppTexts()
  const [photos, setPhotos] = useState<string[]>([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    void gameApi
      .photos()
      .then(setPhotos)
      .catch((e) => setErr(e instanceof Error ? e.message : texts.maiPhoto.error))
  }, [texts.maiPhoto.error])

  const token = readToken()

  return (
    <div>
      <PageHeader title={texts.nav.pictures} crumbs={[{ label: texts.nav.home, href: '/home' }]} />
      {err ? <Text className="text-app-danger">{err}</Text> : null}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {photos.map((p) => {
          const u = apiUrl(`/api/v2/game/mai2/my-photo/${encodeURIComponent(p)}`)
          if (token) u.searchParams.set('token', token)
          const src = imgUrl(u.toString())
          return (
            <SectionCard key={p} className="overflow-hidden">
              <img src={src} crossOrigin={imgCross(src)} alt="" className="h-auto w-full object-cover" />
            </SectionCard>
          )
        })}
      </div>
    </div>
  )
}
