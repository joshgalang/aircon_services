"use client";

import { IconBtnMagnifyingGlass } from "@/components/ui/ButtonIcons";

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
};

export function TableSearchInput({
  value,
  onChange,
  placeholder = "Search table…",
  className = "",
  "aria-label": ariaLabel = "Search",
}: Props) {
  return (
    <div className={`relative min-w-[10rem] max-w-xs flex-1 ${className}`}>
      <IconBtnMagnifyingGlass className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoComplete="off"
        className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-sm outline-none ring-brand-500/20 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2"
      />
    </div>
  );
}
