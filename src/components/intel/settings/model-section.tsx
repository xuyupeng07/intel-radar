import { AiBrain01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { FieldRow } from "@/components/intel/settings/field-row"
import { InfoTip } from "@/components/intel/settings/info-tip"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { BRAND_CHIP, TONE_CLASS } from "@/lib/tone"
import { cn } from "@/lib/utils"

export function ModelSection({
  chatModel,
  chatReady,
}: {
  chatModel: string
  chatReady: boolean
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-medium">对话模型</h2>
        <InfoTip label="对话模型说明">
          模型负责理解搜索结果、分类去重，并把当天情报写成日报；抓取网页由搜索源完成。
        </InfoTip>
      </div>

      <Card className="gap-4">
        <CardHeader className="gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <HugeiconsIcon
                icon={AiBrain01Icon}
                className="size-4"
                strokeWidth={2}
              />
              生成模型
            </CardTitle>
            <Badge
              variant="outline"
              className={cn(
                "h-5 px-1.5 text-[10px]",
                chatReady ? TONE_CLASS.success : TONE_CLASS.warning
              )}
            >
              {chatReady ? "Key 已配置" : "Key 未配置"}
            </Badge>
            <InfoTip label="生成模型说明">
              分类去重与日报生成共用同一个模型；它不参与网页抓取，也不改变搜索源的条数上限。
            </InfoTip>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <FieldRow
            label="模型名"
            hint="填服务端可用的对话模型标识；分类与日报共用这一个模型"
            htmlFor="chatModel"
          >
            <Input
              id="chatModel"
              name="chatModel"
              defaultValue={chatModel}
              className="max-w-sm font-mono text-xs"
              maxLength={64}
              required
            />
          </FieldRow>


          <div className="flex items-center gap-2 border-t pt-3">
            <Badge
              variant="outline"
              className={cn("h-5 px-1.5 text-[10px]", BRAND_CHIP)}
            >
              作用范围
            </Badge>
            <InfoTip label="作用范围说明">
              结果筛选、摘要重写、板块分类、日报 Markdown。
            </InfoTip>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
