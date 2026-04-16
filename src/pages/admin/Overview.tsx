import { Text } from '@cloudflare/kumo/components/text'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import { useAppTexts } from '../../content/texts'
import { useAdmin } from '../../hooks/useAdmin'

export function AdminOverviewPage() {
  const texts = useAppTexts()
  const { username } = useAdmin()

  return (
    <LayerCard className="p-6">
      <LayerCard.Primary>{texts.admin.overviewTitle}</LayerCard.Primary>
      <Text DANGEROUS_className="text-kumo-subtle mt-2">{texts.admin.loggedInAs(username ?? '')}</Text>
      <Text DANGEROUS_className="text-kumo-subtle mt-4 text-sm">
        {texts.admin.overviewHint}
      </Text>
    </LayerCard>
  )
}
