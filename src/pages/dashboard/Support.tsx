import { PageHeader } from '@/components/ui/PageHeader'
import { DISCORD_INVITE, GITHUB_REPOSITORY, QQ_INVITE, TELEGRAM_INVITE } from '@/lib/config'
import { useAppTexts } from '@/content/texts'
import { Button } from 'antd'
import { SectionCard } from '@/components/ui/SectionCard'
import { Text } from '@/components/ui/Text'

export function SupportPage() {
  const texts = useAppTexts()
  return (
    <div>
      <PageHeader title={texts.nav.support} crumbs={[{ label: texts.nav.home, href: '/home' }]} />
      <SectionCard title={<>{texts.support.community}</>}>
        <div className="mt-4 flex flex-col gap-3">
          {DISCORD_INVITE ? (
            <Button block href={DISCORD_INVITE} target="_blank" rel="noreferrer">
              Discord
            </Button>
          ) : null}
          {TELEGRAM_INVITE ? (
            <Button block href={TELEGRAM_INVITE} target="_blank" rel="noreferrer">
              Telegram
            </Button>
          ) : null}
          {QQ_INVITE ? (
            <Button block href={QQ_INVITE} target="_blank" rel="noreferrer">
              QQ
            </Button>
          ) : null}
          {GITHUB_REPOSITORY ? (
            <Button block href={GITHUB_REPOSITORY} target="_blank" rel="noreferrer">
              GitHub
            </Button>
          ) : null}
          {!DISCORD_INVITE && !TELEGRAM_INVITE && !QQ_INVITE && !GITHUB_REPOSITORY ? (
            <Text className="text-app-subtle">{texts.support.noLinks}</Text>
          ) : null}
        </div>
      </SectionCard>
    </div>
  )
}
