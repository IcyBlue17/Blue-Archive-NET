import { Text } from '@cloudflare/kumo/components/text'
import { LinkButton } from '@cloudflare/kumo/components/button'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import { PageHeader } from '../../components/common/PageHeader'
import { DISCORD_INVITE, GITHUB_REPOSITORY, QQ_INVITE, TELEGRAM_INVITE } from '../../lib/config'
import { useI18n } from '../../lib/i18n'

export function SupportPage() {
  const { t } = useI18n()
  return (
    <div>
      <PageHeader title={t('support')} crumbs={[{ label: t('home'), href: '/home' }]} />
      <LayerCard className="p-4">
        <LayerCard.Secondary>社区与支持</LayerCard.Secondary>
        <div className="mt-4 flex flex-col gap-3">
          {DISCORD_INVITE ? (
            <LinkButton href={DISCORD_INVITE} target="_blank" rel="noreferrer">
              Discord
            </LinkButton>
          ) : null}
          {TELEGRAM_INVITE ? (
            <LinkButton href={TELEGRAM_INVITE} target="_blank" rel="noreferrer">
              Telegram
            </LinkButton>
          ) : null}
          {QQ_INVITE ? (
            <LinkButton href={QQ_INVITE} target="_blank" rel="noreferrer">
              QQ
            </LinkButton>
          ) : null}
          {GITHUB_REPOSITORY ? (
            <LinkButton href={GITHUB_REPOSITORY} target="_blank" rel="noreferrer">
              GitHub
            </LinkButton>
          ) : null}
          {!DISCORD_INVITE && !TELEGRAM_INVITE && !QQ_INVITE && !GITHUB_REPOSITORY ? (
            <Text DANGEROUS_className="text-kumo-subtle">未配置社区链接（.env）</Text>
          ) : null}
        </div>
      </LayerCard>
    </div>
  )
}
