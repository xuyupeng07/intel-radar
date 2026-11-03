import { News01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { FieldRow } from "@/components/intel/settings/field-row"
import { InfoTip } from "@/components/intel/settings/info-tip"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

export function BriefSection({
  briefSystemPrompt,
  briefUserPrompt,
  providerName,
}: {
  briefSystemPrompt: string
  briefUserPrompt: string
  providerName: string
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-medium">日报生成</h2>
        <InfoTip label="日报生成说明">
          日报由模型直接产出 Markdown，生成即发布；这里控制引用条数与两段提示词。
        </InfoTip>
      </div>

      <Card className="gap-4">
        <CardHeader className="gap-1">
          <CardTitle className="flex items-center gap-2 text-sm">
            <HugeiconsIcon icon={News01Icon} className="size-4" strokeWidth={2} />
            引用与提示词
            <InfoTip label="引用与提示词说明">
              占位符在每次采集时替换成当天数据；当前启用：{providerName}。
            </InfoTip>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="border-t pt-5">
            <FieldRow
              label="System Prompt"
              hint="设定角色与硬约束；不需要占位符"
              htmlFor="briefSystemPrompt"
            >
              <Textarea
                id="briefSystemPrompt"
                name="briefSystemPrompt"
                defaultValue={briefSystemPrompt}
                rows={5}
                className="text-xs leading-relaxed"
                required
              />
            </FieldRow>
          </div>

          <div className="border-t pt-5">
            <FieldRow
              label="User Prompt"
              hint="必须包含 {{items}}；{{count}} 情报条数、{{window}} 时间窗口、{{date}} 日期，均可选。"
              htmlFor="briefUserPrompt"
            >
              <Textarea
                id="briefUserPrompt"
                name="briefUserPrompt"
                defaultValue={briefUserPrompt}
                rows={18}
                className="font-mono text-[11px] leading-relaxed"
                required
              />
            </FieldRow>
          </div>

        </CardContent>
      </Card>
    </div>
  )
}
