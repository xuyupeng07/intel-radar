import { ErrorScreen } from "@/components/errors/error-screen"

export const metadata = { title: "服务器错误" }

export default function InternalServerErrorPage() {
  return (
    <ErrorScreen
      code="500"
      title="系统发生错误"
      description="很抱歉给你带来不便，请稍后重试。"
      actions={[
        { label: "返回上一页", behavior: "back", variant: "outline" },
        { label: "返回首页", href: "/today" },
      ]}
    />
  )
}
