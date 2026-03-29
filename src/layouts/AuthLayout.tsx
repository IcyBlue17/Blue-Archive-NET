import { Outlet } from 'react-router-dom'
import { BlueArchiveLogo } from '../components/common/BlueArchiveLogo'

export function AuthLayout() {
  return (
    <div className="bg-kumo-background min-h-dvh">
      <main className="flex min-h-dvh items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center text-zinc-900 dark:text-zinc-200">
            <BlueArchiveLogo className="h-auto w-full max-w-[420px]" />
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
