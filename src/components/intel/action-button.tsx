"use client"

import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

type ActionButtonProps = React.ComponentProps<typeof Button> & {
  /** 骨架阶段统一提示；传空字符串可关闭提示。 */
  message?: string
}

/**
 * 骨架阶段的占位按钮。
 *
 * 页面还没有接后端，但点下去必须有反馈——否则评审时无法区分
 * 「没实现」和「点了没反应」。统一走这里，接功能时逐个替换成真实入口。
 */
export function ActionButton({ message, ...props }: ActionButtonProps) {
  return (
    <Button
      {...props}
      onClick={(event) => {
        props.onClick?.(event)
        if (message !== "") {
          toast.info(message ?? "骨架阶段：该操作尚未接入")
        }
      }}
    />
  )
}
