'use client'

import {
  BellIcon,
  BellSlashIcon,
  CheckCircleIcon,
  DevicePhoneMobileIcon,
  PaperAirplaneIcon,
  TrashIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import { useCallback, useEffect, useState } from 'react'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { inputClassName } from '../constants'

type Subscription = {
  id: string
  endpoint: string
  created_at: string
}

type SendResult = { sent: number; stale: number } | null

function endpointLabel(endpoint: string): string {
  try {
    const url = new URL(endpoint)
    return url.hostname
  } catch {
    return endpoint.slice(0, 40) + '…'
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function PushNotificationPanel() {
  const { isSupported, isStandalone, permission, isSubscribed, isPending, error, enable, disable } =
    usePushNotifications()

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const [title, setTitle] = useState('PayReport')
  const [body, setBody] = useState("Don't forget to clock in today!")
  const [url, setUrl] = useState('/dashboard')
  const [tag, setTag] = useState('payreport-test')
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<SendResult>(null)
  const [sendError, setSendError] = useState<string | null>(null)

  const loadSubscriptions = useCallback(async () => {
    setLoadingSubscriptions(true)
    try {
      const res = await fetch('/api/push/subscriptions')
      if (res.ok) {
        const json = await res.json()
        setSubscriptions(json.subscriptions ?? [])
      }
    } finally {
      setLoadingSubscriptions(false)
    }
  }, [])

  useEffect(() => {
    void loadSubscriptions()
  }, [loadSubscriptions, isSubscribed])

  async function handleRemoveDevice(sub: Subscription) {
    setRemovingId(sub.id)
    try {
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      })
      setSubscriptions((prev) => prev.filter((s) => s.id !== sub.id))
    } finally {
      setRemovingId(null)
    }
  }

  async function handleSend() {
    setSending(true)
    setSendResult(null)
    setSendError(null)
    try {
      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, url, tag }),
      })
      const json = await res.json()
      if (!res.ok) {
        setSendError(json.error ?? 'Send failed')
      } else {
        setSendResult(json)
        // Refresh subscriptions in case stale ones were cleaned up
        void loadSubscriptions()
      }
    } catch {
      setSendError('Network error')
    } finally {
      setSending(false)
    }
  }

  // ── Not installed as PWA ────────────────────────────────────────────────────
  if (!isStandalone) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3">
          <DevicePhoneMobileIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800">
            <strong>Add to Home Screen</strong> first — iOS push only works when PayReport is
            installed as a PWA. In Safari tap <strong>Share → Add to Home Screen</strong>.
          </p>
        </div>
        {/* Still show devices + test panel for desktop/Chrome testing */}
        <SubscriptionsSection
          subscriptions={subscriptions}
          loading={loadingSubscriptions}
          removingId={removingId}
          onRemove={handleRemoveDevice}
        />
        <SendPanel
          title={title} setTitle={setTitle}
          body={body} setBody={setBody}
          url={url} setUrl={setUrl}
          tag={tag} setTag={setTag}
          sending={sending}
          onSend={handleSend}
          result={sendResult}
          error={sendError}
          disabled={subscriptions.length === 0}
        />
      </div>
    )
  }

  // ── Push not supported ──────────────────────────────────────────────────────
  if (!isSupported) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-slate-100 px-4 py-3">
        <BellSlashIcon className="h-4 w-4 shrink-0 text-slate-400" />
        <p className="text-sm text-slate-500">
          Push not supported. Use Safari on iOS 16.4+ or Chrome on desktop.
        </p>
      </div>
    )
  }

  // ── Permission denied ───────────────────────────────────────────────────────
  if (permission === 'denied') {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-rose-50 px-4 py-3">
        <XCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
        <p className="text-sm text-rose-700">
          Notifications blocked. Go to{' '}
          <strong>Settings → PayReport → Notifications</strong> and enable them.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* ── Enable/Disable toggle ── */}
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-2xl ${
              isSubscribed ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'
            }`}
          >
            <BellIcon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              {isSubscribed ? 'Notifications enabled' : 'Notifications disabled'}
            </p>
            <p className="text-xs text-slate-500">
              {isSubscribed ? 'This device is subscribed' : 'Tap to enable on this device'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={isSubscribed ? disable : enable}
          disabled={isPending}
          className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
            isSubscribed ? 'bg-emerald-500' : 'bg-slate-300'
          }`}
          role="switch"
          aria-checked={isSubscribed}
        >
          <span
            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
              isSubscribed ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {error ? (
        <p className="text-xs font-semibold text-rose-600">{error}</p>
      ) : null}

      {/* ── Subscribed devices list ── */}
      <SubscriptionsSection
        subscriptions={subscriptions}
        loading={loadingSubscriptions}
        removingId={removingId}
        onRemove={handleRemoveDevice}
      />

      {/* ── Send test notification ── */}
      <SendPanel
        title={title} setTitle={setTitle}
        body={body} setBody={setBody}
        url={url} setUrl={setUrl}
        tag={tag} setTag={setTag}
        sending={sending}
        onSend={handleSend}
        result={sendResult}
        error={sendError}
        disabled={subscriptions.length === 0}
      />
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SubscriptionsSection({
  subscriptions,
  loading,
  removingId,
  onRemove,
}: {
  subscriptions: Subscription[]
  loading: boolean
  removingId: string | null
  onRemove: (sub: Subscription) => void
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
        Subscribed Devices ({loading ? '…' : subscriptions.length})
      </p>
      {loading ? (
        <div className="h-10 animate-pulse rounded-2xl bg-slate-100" />
      ) : subscriptions.length === 0 ? (
        <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-400">
          No devices subscribed yet.
        </p>
      ) : (
        <div className="space-y-2">
          {subscriptions.map((sub) => (
            <div
              key={sub.id}
              className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-700">
                  {endpointLabel(sub.endpoint)}
                </p>
                <p className="text-xs text-slate-400">Added {timeAgo(sub.created_at)}</p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(sub)}
                disabled={removingId === sub.id}
                aria-label="Remove device"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-rose-100 hover:text-rose-500 disabled:opacity-40"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SendPanel({
  title, setTitle,
  body, setBody,
  url, setUrl,
  tag, setTag,
  sending,
  onSend,
  result,
  error,
  disabled,
}: {
  title: string; setTitle: (v: string) => void
  body: string; setBody: (v: string) => void
  url: string; setUrl: (v: string) => void
  tag: string; setTag: (v: string) => void
  sending: boolean
  onSend: () => void
  result: SendResult
  error: string | null
  disabled: boolean
}) {
  return (
    <div>
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
        Send Test Notification
      </p>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClassName}
            placeholder="Notification title"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">Body</label>
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className={inputClassName}
            placeholder="Notification body text"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">URL (on tap)</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className={inputClassName}
              placeholder="/dashboard"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Tag (dedup)</label>
            <input
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className={inputClassName}
              placeholder="payreport-test"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onSend}
          disabled={sending || disabled}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PaperAirplaneIcon className="h-4 w-4" />
          {sending ? 'Sending…' : 'Send to all devices'}
        </button>

        {disabled && !sending ? (
          <p className="text-center text-xs text-slate-400">Subscribe on a device first to send.</p>
        ) : null}

        {result ? (
          <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3">
            <CheckCircleIcon className="h-4 w-4 shrink-0 text-emerald-500" />
            <p className="text-sm text-emerald-700">
              Sent to <strong>{result.sent}</strong> device{result.sent !== 1 ? 's' : ''}
              {result.stale > 0 ? `, removed ${result.stale} stale` : ''}
            </p>
          </div>
        ) : null}

        {error ? (
          <div className="flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3">
            <XCircleIcon className="h-4 w-4 shrink-0 text-rose-500" />
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

