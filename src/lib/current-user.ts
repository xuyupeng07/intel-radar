/**
 * 当前登录用户（内部单租户，展示的是产品主体 FastGPT）。
 * 侧边栏、移动端抽屉与设置页共用同一份，避免头像/名称在多处走样。
 */
export const CURRENT_USER = {
  name: "FastGPT",
  email: "fastgpt.cn",
  avatar: "/avatars/fastgpt.svg",
  fallback: "F",
  plan: "管理员",
} as const
