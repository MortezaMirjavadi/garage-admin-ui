import { Database } from 'lucide-react'
import { Link } from 'react-router-dom'

import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <div>
      <PageHeader title="Not found" description="That page does not exist." />
      <EmptyState
        icon={Database}
        title="404"
        description="The page you are looking for has moved or never existed."
        action={
          <Button asChild size="sm">
            <Link to="/">Back to dashboard</Link>
          </Button>
        }
      />
    </div>
  )
}