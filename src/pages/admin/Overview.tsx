import { useEffect, useState } from 'react'
import { Text } from '@cloudflare/kumo/components/text'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import { getAdminStatus } from '../../api/admin/status'

export function AdminOverviewPage() {
  const [u, setU] = useState<string>('')

  useEffect(() => {
    void getAdminStatus().then((s) => setU(s.username))
  }, [])

  return (
    <LayerCard className="p-6">
      <LayerCard.Primary>管理员控制台</LayerCard.Primary>
      <Text DANGEROUS_className="text-kumo-subtle mt-2">已以管理员身份登录：{u}</Text>
      <Text DANGEROUS_className="text-kumo-subtle mt-4 text-sm">
        使用顶部标签管理用户、CHUNITHM 登录奖励、解锁挑战与 ALL.Net DownloadOrder 配置。
      </Text>
    </LayerCard>
  )
}
