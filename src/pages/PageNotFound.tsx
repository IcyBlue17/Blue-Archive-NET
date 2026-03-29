import { Link } from 'react-router-dom'
import { Text } from '@cloudflare/kumo/components/text'
import { Button } from '@cloudflare/kumo/components/button'

export function PageNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <Text variant="heading1">404</Text>
      <Text variant="secondary">页面不存在</Text>
      <Link to="/home">
        <Button variant="secondary">回首页</Button>
      </Link>
    </div>
  )
}
