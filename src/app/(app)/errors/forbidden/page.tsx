import { ErrorScreen } from "@/components/errors/error-screen"

export const metadata = { title: "无权访问" }

export default function ForbiddenPage() {
  return (
    <ErrorScreen
      code="403"
      title="无权访问"
      description="当前账户没有访问该页面的权限。"
      actions={[
        { label: "返回上一页", behavior: "back", variant: "outline" },
        { label: "返回首页", href: "/today" },
      ]}
    />
  )
}
