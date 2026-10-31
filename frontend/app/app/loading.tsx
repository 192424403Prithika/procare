import React from "react";

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-4 w-32 bg-[#E6D5DC] rounded-md" />
          <div className="h-7 w-64 bg-[#DFCECF] rounded-lg" />
          <div className="h-4 w-80 bg-[#E6D5DC]/70 rounded-md" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 bg-[#DFCECF] rounded-xl" />
          <div className="h-9 w-32 bg-[#DFCECF] rounded-xl" />
        </div>
      </div>

      {/* KPI Cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white/80 p-5 rounded-2xl border border-[#E6D5DC] shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-24 bg-[#E6D5DC] rounded" />
              <div className="h-8 w-8 bg-[#DFCECF] rounded-xl" />
            </div>
            <div className="h-8 w-16 bg-[#DFCECF] rounded-md" />
            <div className="h-3 w-32 bg-[#E6D5DC]/60 rounded" />
          </div>
        ))}
      </div>

      {/* Main Content Area skeleton */}
      <div className="bg-white/80 rounded-2xl border border-[#E6D5DC] shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-[#E6D5DC]">
          <div className="h-5 w-48 bg-[#DFCECF] rounded-md" />
          <div className="h-8 w-36 bg-[#E6D5DC] rounded-xl" />
        </div>
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((row) => (
            <div
              key={row}
              className="h-12 w-full bg-[#F7EDE5]/60 rounded-xl border border-[#E6D5DC]/50 flex items-center px-4 justify-between"
            >
              <div className="h-4 w-1/4 bg-[#DFCECF] rounded" />
              <div className="h-4 w-1/6 bg-[#E6D5DC] rounded" />
              <div className="h-4 w-1/6 bg-[#E6D5DC] rounded" />
              <div className="h-6 w-20 bg-[#DFCECF] rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

