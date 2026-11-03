import { HugeiconsIcon } from "@hugeicons/react"

import { AiChatNavIcon } from "@/components/icons/ai-chat-nav-icon"
import type { NavIconType } from "@/lib/nav"

type NavIconProps = {
  item: { href?: string; icon: NavIconType }
  className?: string
  strokeWidth?: number
}

export function NavIcon({ item, className, strokeWidth }: NavIconProps) {
  if (item.href === "/chat") {
    return <AiChatNavIcon className={className} />
  }

  return (
    <HugeiconsIcon
      icon={item.icon}
      className={className}
      strokeWidth={strokeWidth}
    />
  )
}
