import { Text } from '@cloudflare/kumo/components/text'
import { LinkButton } from '@cloudflare/kumo/components/button'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import { PageHeader } from '../../components/common/PageHeader'
import { DISCORD_INVITE, GITHUB_REPOSITORY, QQ_INVITE, TELEGRAM_INVITE } from '../../lib/config'
import { useAppTexts } from '../../content/texts'

export function SupportPage() {
  const texts = useAppTexts()
  return (
    <div>
      <PageHeader title={texts.nav.support} crumbs={[{ label: texts.nav.home, href: '/home' }]} />
      <LayerCard className="p-4">
        <LayerCard.Secondary>{texts.support.community}</LayerCard.Secondary>
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
            <Text DANGEROUS_className="text-kumo-subtle">{texts.support.noLinks}</Text>
          ) : null}
        </div>
      </LayerCard>
    </div>
  )
}
