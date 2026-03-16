"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { id as localeId } from "date-fns/locale";
import type { CalendarDay } from "@/lib/services/siswa-dashboard.service";
import "./attendance-calendar.css";

interface AttendanceCalendarProps {
  days: CalendarDay[];
  onMonthChange?: (year: number, month: number) => void;
}

type DayStatus = "hadir" | "pelanggaran" | "plastik" | "kosong" | "libur" | "izin";

function toKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

// Chevron icon kecil untuk select wrapper
function SelectChevron() {
  return (
    <svg
      width="12" height="12"
      viewBox="0 0 12 12"
      style={{
        position: "absolute", right: 8, top: "50%",
        transform: "translateY(-50%)", pointerEvents: "none",
        opacity: 0.5,
      }}
    >
      <path d="M2 4L6 8L10 4" fill="none" stroke="currentColor" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AttendanceCalendar({ days, onMonthChange }: AttendanceCalendarProps) {
  const [month, setMonth] = React.useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date());

  const todayKey = toKey(new Date());

  const statusMap = React.useMemo(() => {
    const map = new Map<string, DayStatus>();
    days.forEach((d) => map.set(d.date, d.status));
    return map;
  }, [days]);

  // Map keterangan libur untuk tooltip
  const keteranganMap = React.useMemo(() => {
    const map = new Map<string, string>();
    days.forEach((d) => {
      if ((d as any).keteranganLibur) map.set(d.date, (d as any).keteranganLibur);
    });
    return map;
  }, [days]);

  // Map izin detail langsung dari CalendarDay.izin
  const izinMap = React.useMemo(() => {
    const map = new Map<string, { tipe: string; catatan?: string | null }>();
    days.forEach((d) => {
      if (d.izin) map.set(d.date, d.izin);
    });
    return map;
  }, [days]);

  const getStatus = React.useCallback(
    (date: Date): DayStatus => statusMap.get(toKey(date)) ?? "kosong",
    [statusMap],
  );

  const now = new Date();
  const toMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const handleMonthChange = (newMonth: Date) => {
    setMonth(newMonth);
    onMonthChange?.(newMonth.getFullYear(), newMonth.getMonth() + 1);
  };

  const goToPrevMonth = () =>
    handleMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1));

  const goToNextMonth = () => {
    const next = new Date(month.getFullYear(), month.getMonth() + 1, 1);
    if (next <= toMonth) handleMonthChange(next);
  };

  const isNextDisabled = () =>
    month.getFullYear() === now.getFullYear() && month.getMonth() === now.getMonth();

  const selectedDay = React.useMemo(() => {
    if (!selectedDate) return null;
    return days.find((d) => d.date === toKey(selectedDate)) ?? null;
  }, [days, selectedDate]);

  // ── Custom Caption ──────────────────────────────────────────
  const CustomCaption = () => {
    const currentYear = month.getFullYear();
    const currentMonthIdx = month.getMonth();
    const nowYear = now.getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => nowYear - 4 + i);

    return (
      <div className="cal-caption-custom">
        <button
          className="cal-nav-btn"
          onClick={goToPrevMonth}
          aria-label="Bulan sebelumnya"
          type="button"
        >
          <ChevronLeft size={15} />
        </button>

        <div className="cal-caption-selects">
          {/* Select bulan */}
          <div className="cal-select-wrapper" style={{ position: "relative" }}>
            <select
              className="cal-select"
              value={currentMonthIdx}
              onChange={(e) => {
                const newMonth = new Date(currentYear, Number(e.target.value), 1);
                if (newMonth <= toMonth) handleMonthChange(newMonth);
              }}
            >
              {MONTHS_ID.map((name, idx) => (
                <option
                  key={idx}
                  value={idx}
                  disabled={currentYear === nowYear && idx > now.getMonth()}
                >
                  {name}
                </option>
              ))}
            </select>
            <SelectChevron />
          </div>

          {/* Select tahun */}
          <div className="cal-select-wrapper" style={{ position: "relative" }}>
            <select
              className="cal-select"
              value={currentYear}
              onChange={(e) => {
                const newMonth = new Date(Number(e.target.value), currentMonthIdx, 1);
                handleMonthChange(newMonth <= toMonth ? newMonth : toMonth);
              }}
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <SelectChevron />
          </div>
        </div>

        <button
          className={`cal-nav-btn ${isNextDisabled() ? "cal-nav-btn-disabled" : ""}`}
          onClick={goToNextMonth}
          disabled={isNextDisabled()}
          aria-label="Bulan berikutnya"
          type="button"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    );
  };

  // ── Detail hari yang dipilih ──────────────────────────────────
  const renderDayDetail = () => {
    if (!selectedDate) return null;

    const key = toKey(selectedDate);
    const isFutureDate = key > todayKey;
    const status = statusMap.get(key);
    const keterangan = keteranganMap.get(key);
    const izinDetail = izinMap.get(key);

    const dateLabel = selectedDate.toLocaleDateString("id-ID", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });

    // Hari libur (termasuk masa depan)
    if (status === "libur") {
      return (
        <div className="attendance-day-detail">
          <div className="attendance-day-title">{dateLabel}</div>
          <div className="attendance-day-meta">
            <span className="meta-item meta-status-libur">
              📅 {keterangan ?? "Libur"}
            </span>
          </div>
        </div>
      );
    }

    // Masa depan non-libur
    if (isFutureDate) {
      return (
        <div className="attendance-day-detail">
          <div className="attendance-day-title">{dateLabel}</div>
          <div className="attendance-day-meta">
            <span className="meta-item" style={{ opacity: 0.5, fontSize: "11px" }}>
              🗓️ Belum terjadi
            </span>
          </div>
        </div>
      );
    }

    // Hari lampau / hari ini
    return (
      <div className="attendance-day-detail">
        <div className="attendance-day-title">{dateLabel}</div>
        {selectedDay ? (
          <div className="attendance-day-meta">
            <span className={`meta-item meta-status-${selectedDay.status}`}>
              {selectedDay.status === "hadir" ? "✅ Bawa tumbler"
                : selectedDay.status === "pelanggaran" ? "⚠️ Pelanggaran"
                  : selectedDay.status === "plastik" ? "🛍️ Beli plastik"
                    : selectedDay.status === "izin" ? "🛏️ Izin / Sakit"
                      : "❌ Tidak bawa tumbler"}
            </span>
            <span className="meta-item">🧴 Tumbler: {selectedDay.hadir ? "Ya" : "Tidak"}</span>
            <span className="meta-item">⚠️ Pelanggaran: {selectedDay.pelanggaranCount}</span>
            <span className="meta-item">🛍️ Plastik: {selectedDay.plastikCount}</span>
            {selectedDay.status === "izin" && (
              <>
                <span className="meta-item meta-status-izin">
                  🛏️ Tipe:{" "}
                  {izinDetail?.tipe === "sakit" ? "Sakit"
                    : izinDetail?.tipe === "izin" ? "Izin"
                      : izinDetail?.tipe === "tanpa_keterangan" ? "Tanpa Keterangan"
                        : "Izin"}
                </span>
                {izinDetail?.catatan && (
                  <span className="meta-item">💬 {izinDetail.catatan}</span>
                )}
                <span className="meta-item" style={{ opacity: 0.7 }}>
                  🔒 Streak tidak putus
                </span>
              </>
            )}
          </div>
        ) : (
          <div className="attendance-day-meta">
            <span className="meta-item meta-status-kosong">❌ Tidak bawa tumbler</span>
            <span className="meta-item">⚠️ Pelanggaran: 0</span>
            <span className="meta-item">🛍️ Plastik: 0</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="attendance-calendar-wrapper">
      <CustomCaption />

      <DayPicker
        mode="single"
        locale={localeId}
        month={month}
        onMonthChange={handleMonthChange}
        selected={selectedDate}
        onSelect={setSelectedDate}
        toMonth={toMonth}
        showOutsideDays
        hideNavigation
        classNames={{
          root: "attendance-cal-root",
          months: "attendance-cal-months",
          month: "attendance-cal-month",
          month_caption: "attendance-cal-caption-hidden",
          caption_label: "attendance-cal-caption-label-hidden",
          dropdowns: "attendance-cal-dropdown-hidden",
          nav: "attendance-cal-nav-hidden",
          month_grid: "attendance-cal-table",
          weekdays: "attendance-cal-head-row",
          weekday: "attendance-cal-head-cell",
          week: "attendance-cal-row",
          day: "attendance-cal-cell",
          day_button: "attendance-cal-day",
          outside: "attendance-cal-day-outside",
          disabled: "attendance-cal-day-disabled",
        }}
        modifiers={{
          hariIni: (d) => toKey(d) === todayKey,
          hadir: (d) => getStatus(d) === "hadir",
          pelanggaran: (d) => getStatus(d) === "pelanggaran",
          plastik: (d) => getStatus(d) === "plastik",
          libur: (d) => getStatus(d) === "libur",
          izin: (d) => getStatus(d) === "izin",
          kosong: (d) => getStatus(d) === "kosong",
          masaDepan: (d) => toKey(d) > todayKey && getStatus(d) !== "libur",
        }}
        modifiersClassNames={{
          hariIni: "cal-day-today",
          hadir: "cal-day-hadir",
          pelanggaran: "cal-day-pelanggaran",
          plastik: "cal-day-plastik",
          libur: "cal-day-libur",
          izin: "cal-day-izin",
          kosong: "cal-day-kosong",
          masaDepan: "cal-day-future",
        }}
      />

      {renderDayDetail()}

      {/* Legend — sekarang include izin */}
      <div className="attendance-legend">
        {[
          { cls: "legend-hadir", label: "Bawa tumbler" },
          { cls: "legend-izin", label: "Izin / Sakit" },
          { cls: "legend-pelanggaran", label: "Pelanggaran" },
          { cls: "legend-plastik", label: "Beli plastik" },
          { cls: "legend-libur", label: "Libur" },
          { cls: "legend-kosong", label: "Tidak bawa" },
        ].map(({ cls, label }) => (
          <div key={cls} className="attendance-legend-item">
            <span className={`legend-dot ${cls}`} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}