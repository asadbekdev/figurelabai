import { Share2Icon } from "lucide-react"

import { FigureLabShell } from "@/components/product/app-screens"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Button } from "@/components/ui/button"

export default function InvitationPage() {
  return (
    <FigureLabShell
      activeHref="/invitation"
      title="Refer & Earn"
      subtitle="Invite collaborators and share credits"
    >
      <Empty className="border border-dashed bg-surface/60 py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Share2Icon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>Give 300, Get 300</EmptyTitle>
          <EmptyDescription>
            The invite flow will include a link, email entry, and a reward ledger.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button>Copy invite link</Button>
        </EmptyContent>
      </Empty>
    </FigureLabShell>
  )
}
