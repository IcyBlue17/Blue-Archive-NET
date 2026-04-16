import { useEffect, useState } from 'react'
import { Text } from '@cloudflare/kumo/components/text'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import { getAdminStatus } from '../../api/admin/status'
import { useAppTexts } from '../../content/texts'

export function AdminOverviewPage() {
  const texts = useAppTexts()
  const [u, setU] = useState<string>('')

  useEffect(() => {
    void getAdminStatus().then((s) => setU(s.username))
  }, [])

  return (
    <LayerCard className="p-6">
      <LayerCard.Primary>{texts.admin.overviewTitle}</LayerCard.Primary>
      <Text DANGEROUS_className="text-kumo-subtle mt-2">{texts.admin.loggedInAs(u)}</Text>
      <Text DANGEROUS_className="text-kumo-subtle mt-4 text-sm">
        {texts.admin.overviewHint}
      </Text>
    </LayerCard>
  )
}
