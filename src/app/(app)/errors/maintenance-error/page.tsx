import { ErrorScreen } from "@/components/errors/error-screen"

export const metadata = { title: "系统维护" }

export default function MaintenanceErrorPage() {
  return (
    <ErrorScreen
      code="503"
      title="系统正在维护"
      description="当前服务暂时不可用，维护完成后将尽快恢复。"
      actions={[
        { label: "刷新页面", behavior: "reload", variant: "outline" },
        { label: "了解详情", href: "/help" },
      ]}
    />
  )
}
