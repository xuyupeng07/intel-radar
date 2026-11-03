import { SettingsForm } from "@/components/intel/settings/settings-form"
import { latestRun } from "@/lib/server/repositories/runs"
import {
  getProviderCredential,
  getProviderStates,
  getSettings,
} from "@/lib/server/repositories/settings"
import { getWebhookStates } from "@/lib/server/repositories/webhooks"
import { getActiveWorkspace } from "@/lib/server/workspace"

export const metadata = { title: "设置" }
export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const workspace = await getActiveWorkspace()
  const [settings, lastIngest, providers] = await Promise.all([
    getSettings(workspace.id),
    latestRun(workspace.id, "每日采集"),
    getProviderStates(workspace.id),
  ])

  const lastIngestLabel = lastIngest
    ? `${lastIngest.date.slice(5)} ${lastIngest.startedAt} · ${lastIngest.status}`
    : null
  const chatReady = Boolean(getProviderCredential(workspace.id, "deepseek"))

  return (
    <SettingsForm
      key={workspace.id}
      settings={settings}
      providers={providers}
      chatReady={chatReady}
      lastIngestLabel={lastIngestLabel}
      webhookStates={getWebhookStates(workspace.id)}
    />
  )
}
