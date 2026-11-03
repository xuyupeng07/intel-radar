"use client"

import * as React from "react"
import {
  AiBrain01Icon,
  Calendar03Icon,
  CheckmarkCircle02Icon,
  News01Icon,
  Search01Icon,
  WebhookIcon,
  SlidersHorizontalIcon,
  Wifi01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { BriefSection } from "@/components/intel/settings/brief-section"
import { ModelSection } from "@/components/intel/settings/model-section"
import { RetrievalSection } from "@/components/intel/settings/retrieval-section"
import { RunConfigSection } from "@/components/intel/settings/run-config-section"
import { SourcesSection } from "@/components/intel/settings/sources-section"
import { StatusSection } from "@/components/intel/settings/status-section"
import { WebhookSection } from "@/components/intel/settings/webhook-section"
import { PageContainer, PageHeader } from "@/components/page-header"
import {
  SettingsNav,
  type SettingsNavItem,
} from "@/components/settings-nav"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import {
  maxResultsForProviders,
  searchProviderNames,
  type SearchProviderId,
  type SearchProviderState,
} from "@/lib/search-providers"
import type { AppSettings, SearchLang } from "@/lib/settings"
import type { WebhookEndpointState } from "@/lib/webhooks"
import {
  saveSettingsAction,
  type SettingsActionState,
} from "@/lib/server/actions/settings"

const INITIAL_STATE: SettingsActionState = { ok: false }

const NAV_ITEMS: SettingsNavItem[] = [
  { value: "sources", label: "搜索源", icon: Search01Icon },
  { value: "run", label: "运行配置", icon: Calendar03Icon },
  { value: "retrieval", label: "检索参数", icon: SlidersHorizontalIcon },
  { value: "model", label: "对话模型", icon: AiBrain01Icon },
  { value: "brief", label: "日报生成", icon: News01Icon },
  { value: "webhook", label: "消息推送", icon: WebhookIcon },
  { value: "status", label: "运行状态", icon: Wifi01Icon },
]

export function SettingsForm({
  settings,
  providers,
  chatReady,
  lastIngestLabel,
  webhookStates,
}: {
  settings: AppSettings
  providers: SearchProviderState[]
  chatReady: boolean
  lastIngestLabel: string | null
  webhookStates: WebhookEndpointState[]
}) {
  const [state, formAction, pending] = React.useActionState(
    saveSettingsAction,
    INITIAL_STATE
  )
  const [enabledProviders, setEnabledProviders] = React.useState<SearchProviderId[]>(
    settings.searchProviders
  )
  const [lang, setLang] = React.useState<SearchLang>(settings.searchLang)
  const [searchCount, setSearchCount] = React.useState(() =>
    Math.min(
      settings.searchCount,
      maxResultsForProviders(settings.searchProviders)
    )
  )

  function handleProvidersChange(next: SearchProviderId[]) {
    setEnabledProviders(next)
    setSearchCount((current) =>
      Math.min(current, maxResultsForProviders(next))
    )
  }

  return (
    <PageContainer>
      <PageHeader title="设置">
        {state.ok ? (
          <span
            aria-live="polite"
            className="inline-flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400"
          >
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              className="size-3.5"
              strokeWidth={2}
            />
            已保存{state.savedAt ? ` · ${state.savedAt}` : ""}
          </span>
        ) : state.error ? (
          <span
            aria-live="polite"
            className="max-w-xs text-[11px] text-rose-600 dark:text-rose-400"
          >
            {state.error}
          </span>
        ) : null}
        <Button type="submit" form="settings-form" size="sm" disabled={pending}>
          {pending ? <Spinner className="size-3.5" /> : null}
          {pending ? "保存中…" : "保存设置"}
        </Button>
      </PageHeader>

      <form
        id="settings-form"
        action={formAction}
        noValidate
        className="flex flex-col gap-4"
      >
        <Tabs
          orientation="vertical"
          defaultValue="sources"
          className="flex-col gap-6 lg:flex-row lg:items-start"
        >
          <div className="lg:sticky lg:top-6 lg:w-52 lg:shrink-0">
            <SettingsNav items={NAV_ITEMS} />
          </div>

          <div className="min-w-0 flex-1">
            <TabsContent
              value="sources"
              keepMounted
              className="flex flex-col gap-4 outline-none"
            >
              <SourcesSection
                providers={providers}
                value={enabledProviders}
                onValueChange={handleProvidersChange}
                resetToken={state.savedToken ?? ""}
              />
            </TabsContent>

            <TabsContent
              value="run"
              keepMounted
              className="flex flex-col gap-4 outline-none"
            >
              <RunConfigSection
                scheduleEnabled={settings.scheduleEnabled}
                scheduleTime={settings.scheduleTime}
                scheduleDays={settings.scheduleDays}
                scheduleCatchUp={settings.scheduleCatchUp}
                lookbackDays={settings.lookbackDays}
                searchCount={searchCount}
                itemLimit={settings.itemLimit}
                briefItemLimit={settings.briefItemLimit}
                maxResults={maxResultsForProviders(enabledProviders)}
                onSearchCountChange={setSearchCount}
              />
            </TabsContent>

            <TabsContent
              value="retrieval"
              keepMounted
              className="flex flex-col gap-4 outline-none"
            >
              <RetrievalSection
                providerIds={enabledProviders}
                queries={settings.queries}
                lang={lang}
                lookbackDays={settings.lookbackDays}
                syntax={settings.deepseekSyntax}
                onLangChange={setLang}
              />
            </TabsContent>

            <TabsContent
              value="model"
              keepMounted
              className="flex flex-col gap-4 outline-none"
            >
              <ModelSection
                chatModel={settings.chatModel}
                chatReady={chatReady}
              />
            </TabsContent>

            <TabsContent
              value="brief"
              keepMounted
              className="flex flex-col gap-4 outline-none"
            >
              <BriefSection
                briefSystemPrompt={settings.briefSystemPrompt}
                briefUserPrompt={settings.briefUserPrompt}
                providerName={
                  searchProviderNames(settings.searchProviders).join(" / ") ||
                  "未启用搜索源"
                }
              />
            </TabsContent>

            <TabsContent
              value="webhook"
              keepMounted
              className="flex flex-col gap-4 outline-none"
            >
              <WebhookSection
                states={webhookStates}
                resetToken={state.savedToken ?? ""}
              />
            </TabsContent>

            <TabsContent
              value="status"
              keepMounted
              className="flex flex-col gap-4 outline-none"
            >
              <StatusSection
                settings={settings}
                providerStates={providers}
                chatReady={chatReady}
                lastIngestLabel={lastIngestLabel}
              />
            </TabsContent>
          </div>
        </Tabs>
      </form>
    </PageContainer>
  )
}
