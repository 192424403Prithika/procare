"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  BellIcon,
  AlertTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  DropletIcon,
  WrenchIcon,
  ArrowRightIcon,
  RefreshCwIcon,
  SparklesIcon,
} from "@/components/Icons";
import { apiClient } from "@/lib/apiClient";

interface NotificationItem {
  id: string;
  user_id?: string;
  title: string;
  message: string;
  type: "critical" | "warning" | "info" | "success";
  is_read: boolean;
  link?: string;
  action_text?: string;
  created_at: string;
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState<"all" | "unread" | "critical" | "warning">("all");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchNotificationsList = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.get<NotificationItem[]>("/api/v1/notifications");
      setNotifications(data || []);
    } catch (err) {
      console.warn("Failed to load notifications from backend:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotificationsList();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await apiClient.put(`/api/v1/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.warn("Failed to mark notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiClient.put("/api/v1/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.warn("Failed to mark all as read:", err);
    }
  };

  const handleGenerateAlerts = async () => {
    setIsGenerating(true);
    try {
      await apiClient.post("/api/v1/notifications/generate-alerts");
      await fetchNotificationsList();
    } catch (err) {
      console.warn("Failed to generate alerts:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.is_read;
    if (filter === "critical") return n.type === "critical";
    if (filter === "warning") return n.type === "warning";
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

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
            Notification Center &amp; Statutory Alerts
          </h1>
          <p className="text-xs text-[#806C7B]">
            Real-time multi-modal anomaly alerts, statutory SLA deadlines, and contractor dispatch notifications
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleGenerateAlerts}
            disabled={isGenerating}
            className="px-3 py-1.5 rounded-xl border border-[#E6D5DC] bg-white text-xs font-semibold text-[#493344] hover:bg-[#F7EDE5] transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCwIcon size={14} className={isGenerating ? "animate-spin" : ""} />
            Evaluate Alerts
          </button>
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            className="px-3 py-1.5 rounded-xl border border-[#E6D5DC] bg-white text-xs font-semibold text-[#493344] hover:bg-[#F7EDE5] transition-colors cursor-pointer"
          >
            Mark All as Read
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            filter === "all"
              ? "bg-[#79566F] text-white shadow-xs"
              : "bg-white text-[#806C7B] hover:text-[#493344] border border-[#E6D5DC]"
          }`}
        >
          All Notifications ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("unread")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            filter === "unread"
              ? "bg-[#79566F] text-white shadow-xs"
              : "bg-white text-[#806C7B] hover:text-[#493344] border border-[#E6D5DC]"
          }`}
        >
          Unread Only ({unreadCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter("critical")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            filter === "critical"
              ? "bg-[#C84661] text-white shadow-xs"
              : "bg-white text-[#C84661] hover:bg-[#FDF2F4] border border-[#C84661]/30"
          }`}
        >
          Critical 24h ({notifications.filter((n) => n.type === "critical").length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("warning")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            filter === "warning"
              ? "bg-[#B86B35] text-white shadow-xs"
              : "bg-white text-[#B86B35] hover:bg-[#FDF5ED] border border-[#B86B35]/30"
          }`}
        >
          Weather Warnings ({notifications.filter((n) => n.type === "warning").length})
        </button>
      </div>

      {/* Feed */}
      {isLoading ? (
        <div className="p-16 text-center text-xs text-[#806C7B] bg-white rounded-2xl border border-[#E6D5DC]">
          <div className="w-8 h-8 border-2 border-[#79566F] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading active compliance feeds...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-16 text-center text-xs text-[#806C7B] bg-white rounded-2xl border border-[#E6D5DC]">
          No notifications match the selected category.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const isCrit = item.type === "critical";
            const isWarn = item.type === "warning";
            const isSucc = item.type === "success";

            const borderStyle = isCrit
              ? "border-l-4 border-l-[#C84661] border-[#E6D5DC]"
              : isWarn
              ? "border-l-4 border-l-[#B86B35] border-[#E6D5DC]"
              : isSucc
              ? "border-l-4 border-l-[#4A8B71] border-[#E6D5DC]"
              : "border-l-4 border-l-[#79566F] border-[#E6D5DC]";

            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border bg-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${borderStyle} ${
                  !item.is_read ? "bg-[#F7EDE5]/30" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                      isCrit
                        ? "bg-[#FDF2F4] text-[#C84661]"
                        : isWarn
                        ? "bg-[#FDF5ED] text-[#B86B35]"
                        : isSucc
                        ? "bg-[#EFF8F3] text-[#4A8B71]"
                        : "bg-[#EFE4EC] text-[#79566F]"
                    }`}
                  >
                    {isCrit && <AlertTriangleIcon size={18} />}
                    {isWarn && <ClockIcon size={18} />}
                    {isSucc && <CheckCircleIcon size={18} />}
                    {!isCrit && !isWarn && !isSucc && <BellIcon size={18} />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-[#493344]">{item.title}</span>
                      {!item.is_read && (
                        <span className="w-2 h-2 rounded-full bg-[#C84661]" title="Unread" />
                      )}
                    </div>
                    <p className="text-xs text-[#806C7B] leading-relaxed max-w-2xl">
                      {item.message}
                    </p>
                    <span className="text-[10px] text-[#806C7B] mt-1 block">
                      {item.created_at ? new Date(item.created_at).toLocaleString() : "Recently"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {!item.is_read && (
                    <button
                      type="button"
                      onClick={() => handleMarkAsRead(item.id)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-[#806C7B] hover:text-[#493344] hover:bg-[#F7EDE5] rounded-lg transition-colors cursor-pointer"
                    >
                      Mark read
                    </button>
                  )}

                  {item.link && (
                    <Link
                      href={item.link}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#79566F] hover:bg-[#63445A] text-white text-xs font-semibold shadow-xs transition-colors"
                    >
                      {item.action_text || "View"}
                      <ArrowRightIcon size={12} />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
