import { Link } from 'react-router-dom'
import { useAppTexts } from '@/content/texts'
import { BuildInfoFooter } from '@/components/layout/buildinfo'
import { Button, Typography } from 'antd'
import { Text } from '@/components/ui/Text'

export function PageNotFound() {
  const texts = useAppTexts()
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <Typography.Title level={2} style={{ margin: 0 }}>404</Typography.Title>
        <Text type="secondary">{texts.notFound.title}</Text>
        <Link to="/home">
          <Button>{texts.notFound.backHome}</Button>
        </Link>
      </main>
      <BuildInfoFooter className="px-6 pb-6" />
    </div>
  )
}
