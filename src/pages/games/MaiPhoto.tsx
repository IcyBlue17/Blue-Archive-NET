import { useEffect, useState } from 'react'
import { Text } from '@cloudflare/kumo/components/text'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import { PageHeader } from '../../components/common/PageHeader'
import * as gameApi from '../../api/game'
import { apiUrl } from '../../lib/config'
import { imgCross1, imgUrl1 } from '../../lib/imgSign'
import { readToken } from '../../hooks/useAuth'
import { useAppTexts } from '../../content/texts'

export function MaiPhotoPage() {
  const texts = useAppTexts()
  const [photos, setPhotos] = useState<string[]>([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    void gameApi
      .photos()
      .then(setPhotos)
      .catch((e) => setErr(e instanceof Error ? e.message : texts.maiPhoto.error))
  }, [])

  const token = readToken()

  return (
    <div>
      <PageHeader title={texts.nav.pictures} crumbs={[{ label: texts.nav.home, href: '/home' }]} />
      {err ? <Text DANGEROUS_className="text-kumo-danger">{err}</Text> : null}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {photos.map((p) => {
          const u = apiUrl(`/api/v2/game/mai2/my-photo/${encodeURIComponent(p)}`)
          if (token) u.searchParams.set('token', token)
          const src1 = imgUrl1(u.toString())
          return (
            <LayerCard key={p} className="overflow-hidden p-0">
              <img src={src1} crossOrigin={imgCross1(src1)} alt="" className="h-auto w-full object-cover" />
            </LayerCard>
          )
        })}
      </div>
    </div>
  )
}
