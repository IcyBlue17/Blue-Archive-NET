import { Link } from 'react-router-dom'
import { Text } from '@cloudflare/kumo/components/text'
import { Button } from '@cloudflare/kumo/components/button'
import { useAppTexts } from '../content/texts'
import { BuildInfoFooter } from '../components/layout/buildinfo'

export function PageNotFound() {
  const texts = useAppTexts()
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <Text variant="heading1">404</Text>
        <Text variant="secondary">{texts.notFound.title}</Text>
        <Link to="/home">
          <Button variant="secondary">{texts.notFound.backHome}</Button>
        </Link>
      </main>
      <BuildInfoFooter className="px-6 pb-6" />
    </div>
  )
}
