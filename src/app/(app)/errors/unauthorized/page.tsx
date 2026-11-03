import { ErrorScreen } from "@/components/errors/error-screen"

export const metadata = { title: "未登录" }

export default function UnauthorizedPage() {
  return (
    <ErrorScreen
      code="401"
      title="未登录或身份已失效"
      description="请使用有效账户登录后访问该页面。"
      actions={[
        { label: "返回上一页", behavior: "back", variant: "outline" },
        { label: "去登录", href: "/login" },
      ]}
    />
  )
}
