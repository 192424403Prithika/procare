"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  BellIcon,
  AlertTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  DropletIcon,
  WrenchIcon,
  ArrowRightIcon,
} from "@/components/Icons";

export default function NotificationsPage() {
  const [filter, setFilter] = useState<"all" | "unread" | "critical">("all");
  const [notifications, setNotifications] = useState([
    {
      id: "NOTIF-01",
      title: "Statutory 24-Hour Investigation SLA Countdown",
      message: "Trinity Court (Unit 14) has 18 hours remaining on the Awaab's Law emergency investigation window.",
      type: "critical",
      time: "12 minutes ago",
      read: false,
      link: "/app/deadlines",
      actionText: "View SLA Countdown",
    },
    {
      id: "NOTIF-02",
      title: "Severe Nocturnal Condensation Warning",
      message: "Open-Meteo stations predict external relative humidity exceeding 96% tonight across Salford and Central Manchester. Cold wall surfaces at risk.",
      type: "warning",
      time: "45 minutes ago",
      read: false,
      link: "/app/weather",
      actionText: "Open Weather Model",
    },
    {
      id: "NOTIF-03",
      title: "Acoustic Leak Anomaly Flagged (1.24 kHz)",
      message: "Micro-acoustic recording at Pendleton Tower Service Riser indicates persistent pressurized pinhole signature (+18dB SNR).",
      type: "critical",
      time: "2 hours ago",
      read: false,
      link: "/app/acoustic-analysis",
      actionText: "Review FFT Spectrum",
    },
    {
      id: "NOTIF-04",
      title: "Work Order Completed & Ready for Signoff",
      message: "EnviroDry Remediation UK has uploaded photographic completion evidence for Apt 2B window reveal remediation.",
      type: "success",
      time: "5 hours ago",
      read: true,
      link: "/app/work-orders",
      actionText: "Review & Sign Off",
    },
  ]);

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "critical") return n.type === "critical";
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#806C7B] mb-1">
            <Link href="/app/dashboard" className="hover:text-[#79566F]">
              Dashboard
            </Link>
            <span>/</span>
            <span>Alerts &amp; Compliance Feeds</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#493344] tracking-tight">
            Notification Center
          </h1>
          <p className="text-xs text-[#806C7B]">
            Real-time multi-modal anomaly alerts, statutory SLA deadlines, and contractor dispatch notifications
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={markAllAsRead}
            className="px-3 py-1.5 rounded-xl border border-[#E6D5DC] bg-white text-xs font-semibold text-[#493344] hover:bg-[#F7EDE5] transition-colors cursor-pointer"
          >
            Mark All as Read
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            filter === "all" ? "bg-[#79566F] text-white shadow-xs" : "bg-white text-[#806C7B] hover:text-[#493344] border border-[#E6D5DC]"
          }`}
        >
          All Notifications ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("unread")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            filter === "unread" ? "bg-[#79566F] text-white shadow-xs" : "bg-white text-[#806C7B] hover:text-[#493344] border border-[#E6D5DC]"
          }`}
        >
          Unread Only ({notifications.filter((n) => !n.read).length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("critical")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            filter === "critical" ? "bg-[#79566F] text-white shadow-xs" : "bg-white text-[#806C7B] hover:text-[#493344] border border-[#E6D5DC]"
          }`}
        >
          Critical Only
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filtered.map((item) => (
          <div
            key={item.id}
            className={`p-4 rounded-3xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              !item.read
                ? "bg-white border-[#79566F]/30 shadow-xs ring-1 ring-[#79566F]/10"
                : "bg-white/80 border-[#E6D5DC]"
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${
                  item.type === "critical"
                    ? "bg-[#FDF2F4] text-[#C84661]"
                    : item.type === "warning"
                    ? "bg-[#FDF5ED] text-[#B86B35]"
                    : "bg-[#EFF8F3] text-[#4A8B71]"
                }`}
              >
                {item.type === "critical" ? (
                  <AlertTriangleIcon size={20} />
                ) : item.type === "warning" ? (
                  <ClockIcon size={20} />
                ) : (
                  <CheckCircleIcon size={20} />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-[#493344]">{item.title}</h3>
                  {!item.read && (
                    <span className="w-2 h-2 rounded-full bg-[#79566F]" />
                  )}
                </div>
                <p className="text-xs text-[#806C7B] mt-0.5">{item.message}</p>
                <span className="text-[10px] text-[#806C7B] mt-1 block font-mono">{item.time}</span>
              </div>
            </div>

            <div className="shrink-0 sm:self-center">
              <Link
                href={item.link}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EFE4EC] text-[#79566F] text-xs font-semibold hover:bg-[#79566F] hover:text-white transition-colors"
              >
                <span>{item.actionText}</span>
                <ArrowRightIcon size={12} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
