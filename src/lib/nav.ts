import {
  Analytics01Icon,
  News01Icon,
  PlayCircleIcon,
  Radar02Icon,
  Settings01Icon,
} from "@hugeicons/core-free-icons"

export type NavIconType = typeof Radar02Icon

export type NavLeaf = {
  title: string
  href: string
  icon: NavIconType
  badge?: string
  description?: string
}

export type NavParent = {
  title: string
  icon: NavIconType
  badge?: string
  description?: string
  items: NavLeaf[]
}

export type NavItem = NavLeaf | NavParent

export type NavGroup = {
  label: string
  items: NavItem[]
}

export function isNavParent(item: NavItem): item is NavParent {
  return "items" in item
}

/**
 * 导航的唯一真源：侧栏、移动端导航、命令面板、面包屑都从这里读。
 *
 * 只列真实存在的路由。需要二级菜单时用 NavParent，面包屑与展开态会自动跟上。
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "阅读",
    items: [
      {
        title: "每日情报",
        href: "/today",
        icon: Radar02Icon,
        description: "按日期查看当日全部情报",
      },
      {
        title: "日报",
        href: "/briefs",
        icon: News01Icon,
        description: "当日 AI 整合日报与历史",
      },
    ],
  },
  {
    label: "运营",
    items: [
      {
        title: "运营看板",
        href: "/admin",
        icon: Analytics01Icon,
        description: "采集量、板块分布与运行数据",
      },
      {
        title: "运行记录",
        href: "/runs",
        icon: PlayCircleIcon,
        description: "采集与日报生成的任务流水",
      },
    ],
  },
  {
    label: "系统",
    items: [
      {
        title: "设置",
        href: "/settings",
        icon: Settings01Icon,
        description: "检索词、时间、条数与生成模型",
      },
    ],
  },
]

export const NAV_LEAVES: NavLeaf[] = NAV_GROUPS.flatMap((group) =>
  group.items.flatMap((item) => (isNavParent(item) ? item.items : [item]))
)

export const NAV_ITEMS: NavLeaf[] = NAV_LEAVES

/** 不在导航里、但仍需要标题的路由。 */
const EXTRA_TITLES: Record<string, string> = {
  "/errors/forbidden": "无权访问",
  "/errors/unauthorized": "未登录",
  "/errors/not-found": "页面不存在",
  "/errors/internal-server-error": "服务器错误",
  "/errors/maintenance-error": "系统维护",
}

export const PAGE_TITLES: Record<string, string> = {
  ...EXTRA_TITLES,
  ...Object.fromEntries(NAV_LEAVES.map((item) => [item.href, item.title])),
}

export type NavTrail = {
  group: NavGroup
  parent?: NavParent
  leaf: NavLeaf
}

/** 按路径查找面包屑链路，父级菜单用于二级导航与标题展示。 */
export function getNavTrail(pathname: string): NavTrail | null {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (isNavParent(item)) {
        const leaf = item.items.find(
          (child) => pathname === child.href || pathname.startsWith(`${child.href}/`)
        )
        if (leaf) return { group, parent: item, leaf }
      } else if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
        return { group, leaf: item }
      }
    }
  }
  return null
}

/** 父级菜单下是否有激活的子项。 */
export function isChildActive(pathname: string, item: NavLeaf) {
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

/** 当前路由命中的父级菜单标题，用于默认展开。 */
export function getActiveParentTitles(pathname: string) {
  return NAV_GROUPS.flatMap((group) =>
    group.items
      .filter(
        (item): item is NavParent =>
          isNavParent(item) && item.items.some((child) => isChildActive(pathname, child))
      )
      .map((item) => item.title)
  )
}

/** 命令面板使用的扁平条目，保留上级菜单名便于搜索与分组展示。 */
export const NAV_SEARCH_ITEMS = NAV_GROUPS.flatMap((group) =>
  group.items.flatMap((item) => {
    if (!isNavParent(item)) {
      return [{ ...item, group: group.label, parent: undefined as string | undefined }]
    }
    return item.items.map((child) => ({
      ...child,
      group: group.label,
      parent: item.title,
    }))
  })
)
