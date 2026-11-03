import { ErrorScreen } from "@/components/errors/error-screen"

export const metadata = { title: "页面不存在" }

export default function NotFoundPage() {
  return (
    <ErrorScreen
      code="404"
      title="抱歉，页面不存在"
      description="您要查找的页面似乎不存在，或已被删除。"
      actions={[
        { label: "返回上一页", behavior: "back", variant: "outline" },
        { label: "返回首页", href: "/today" },
      ]}
    />
  )
}
