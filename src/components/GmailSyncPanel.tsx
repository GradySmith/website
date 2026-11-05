"use client";

import { useState, useTransition } from "react";
import { Mail, RefreshCw, SlidersHorizontal, X } from "lucide-react";
import { PillButton } from "./PillButton";
import { connectGmail, disconnectGmail, scanGmailForBookings } from "@/app/bookings/actions";
import type { BookingSearchType } from "@/lib/gmail";

type ScanUnit = "days" | "weeks";

const SCAN_TYPE_LABELS: Record<BookingSearchType, string> = {
  all: "all bookings",
  flight: "flights",
  hotel: "hotels",
};

export function GmailSyncPanel({
  connected,
  lastScannedAt,
}: {
  connected: boolean;
  lastScannedAt: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [amount, setAmount] = useState("30");
  const [unit, setUnit] = useState<ScanUnit>("days");
  const [scanType, setScanType] = useState<BookingSearchType>("all");

  function handleScan() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await scanGmailForBookings();
      if (result.success) {
        setMessage(
          result.data.found > 0
            ? `Found ${result.data.found} new booking${result.data.found === 1 ? "" : "s"} — review ${result.data.found === 1 ? "it" : "them"} below.`
            : "No new bookings found in the last 90 days."
        );
      } else {
        setError(result.error);
      }
    });
  }

  function handleCustomScan() {
    const parsedAmount = Math.max(1, Math.round(Number(amount) || 0));
    const sinceDays = unit === "weeks" ? parsedAmount * 7 : parsedAmount;
    const rangeLabel = `${parsedAmount} ${unit === "weeks" ? (parsedAmount === 1 ? "week" : "weeks") : parsedAmount === 1 ? "day" : "days"}`;
    const typeLabel = SCAN_TYPE_LABELS[scanType];

    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await scanGmailForBookings(sinceDays, scanType);
      if (result.success) {
        setMessage(
          result.data.found > 0
            ? `Found ${result.data.found} new booking${result.data.found === 1 ? "" : "s"} in the last ${rangeLabel} — review ${result.data.found === 1 ? "it" : "them"} below.`
            : `No new ${typeLabel} found in the last ${rangeLabel}.`
        );
      } else {
        setError(result.error);
      }
    });
  }

  // disconnectGmail returns an ActionResult (not void), so it can't be
  // passed directly as a <form action> — Next only allows that for
  // actions typed (formData) => void | Promise<void>. Calling it the
  // same way as handleScan above sidesteps that and lets us surface the
  // error if the delete fails.
  function handleDisconnect() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await disconnectGmail();
      if (!result.success) {
        setError(result.error);
      }
    });
  }

  if (!connected) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-brand-teal-200 bg-brand-teal-50/40 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-brand-ink">
            <Mail className="h-4 w-4 text-brand-teal-600" />
            Sync bookings from Gmail
          </h2>
          <p className="mt-1 text-sm text-brand-muted">
            Connect Gmail and the planner will scan the last 90 days for flight and hotel
            confirmations, so you can add them to a trip in one click.
          </p>
        </div>
        <form action={connectGmail}>
          <PillButton type="submit" variant="primary">
            Connect Gmail
          </PillButton>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-brand-teal-100 bg-white p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-brand-ink">
            <Mail className="h-4 w-4 text-brand-teal-600" />
            Gmail connected
          </h2>
          <p className="mt-1 text-sm text-brand-muted">
            {lastScannedAt
              ? `Last scanned ${new Date(lastScannedAt).toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "UTC",
                })}`
              : "Not scanned yet — run your first scan below."}
          </p>
          {message && <p className="mt-1 text-sm text-emerald-700">{message}</p>}
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
        <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
          <PillButton type="button" variant="primary" onClick={handleScan} disabled={isPending}>
            <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
            {isPending ? "Scanning..." : "Scan last 90 days"}
          </PillButton>
          <PillButton
            type="button"
            variant="secondary"
            onClick={() => setIsCustomOpen((prev) => !prev)}
            disabled={isPending}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Custom scan
          </PillButton>
          <PillButton
            type="button"
            variant="secondary"
            onClick={handleDisconnect}
            disabled={isPending}
          >
            Disconnect
          </PillButton>
        </div>
      </div>

      {isCustomOpen && (
        <div className="flex flex-col gap-3 rounded-xl border border-dashed border-brand-teal-200 bg-brand-teal-50/40 p-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-brand-muted">Look back</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="select-input w-20"
                />
                <select
                  value={unit}
                  onChange={(event) => setUnit(event.target.value as ScanUnit)}
                  className="select-input"
                >
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-brand-muted">Looking for</label>
              <select
                value={scanType}
                onChange={(event) => setScanType(event.target.value as BookingSearchType)}
                className="select-input"
              >
                <option value="all">All bookings</option>
                <option value="flight">Flights only</option>
                <option value="hotel">Hotels only</option>
              </select>
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            <PillButton
              type="button"
              variant="primary"
              onClick={handleCustomScan}
              disabled={isPending}
            >
              <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
              {isPending ? "Scanning..." : "Scan"}
            </PillButton>
            <button
              type="button"
              onClick={() => setIsCustomOpen(false)}
              disabled={isPending}
              aria-label="Close custom scan"
              className="text-brand-muted hover:text-brand-teal-700"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
