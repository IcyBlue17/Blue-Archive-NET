import { useAppTexts } from '@/content/texts'
import { useAdmin } from '@/hooks/useAdmin'
import { SectionCard } from '@/components/ui/SectionCard'
import { Text } from '@/components/ui/Text'

export function AdminOverviewPage() {
  const texts = useAppTexts()
  const { username } = useAdmin()

  return (
    <SectionCard title={<>{texts.admin.overviewTitle}</>}>
      <Text className="text-app-subtle mt-2">{texts.admin.loggedInAs(username ?? '')}</Text>
    </SectionCard>
  )
}
