import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import { Text } from '@cloudflare/kumo/components/text'

export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <LayerCard className="p-4">
      <Text variant="secondary" size="sm">
        {label}
      </Text>
      <Text variant="heading3">{value}</Text>
    </LayerCard>
  )
}
