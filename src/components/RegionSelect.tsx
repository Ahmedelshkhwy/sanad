"use client";

import { useId, useMemo, useRef, useState } from "react";
import { inputClass } from "@/components/ui/Field";
import type { Region } from "@/lib/regions";

/** Arabic search key: no diacritics or tatweel, one alef, ة→ه, ى→ي, no leading "ال". */
export function searchKey(s: string): string {
  return s
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .split(/\s+/)
    .map((w) => w.replace(/^ال(?=..)/, ""))
    .join(" ")
    .trim()
    .toLowerCase();
}

function matches(items: { id: string; label: string }[], query: string) {
  const q = searchKey(query);
  if (!q) return items;
  const starts = items.filter((i) => searchKey(i.label).startsWith(q));
  const rest = items.filter((i) => !starts.includes(i) && searchKey(i.label).includes(q));
  return [...starts, ...rest];
}

/** A text box that filters a list as you type; pick with a tap, arrows and Enter. */
function Combobox({
  label,
  items,
  value,
  onChange,
  placeholder,
  disabled,
  required,
}: {
  label: string;
  items: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
  disabled?: boolean;
  required?: boolean;
}) {
  const id = useId();
  const selected = items.find((i) => i.id === value);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const list = useMemo(() => matches(items, query).slice(0, 60), [items, query]);
  const input = useRef<HTMLInputElement>(null);

  function pick(itemId: string) {
    onChange(itemId);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="relative grid gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        ref={input}
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={open && list[active] ? `${id}-${list[active].id}` : undefined}
        autoComplete="off"
        disabled={disabled}
        required={required && !selected}
        placeholder={placeholder}
        className={`${inputClass} disabled:opacity-50`}
        value={open ? query : (selected?.label ?? "")}
        onFocus={() => {
          setQuery("");
          setActive(0);
          setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, list.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && open) {
            e.preventDefault();
            if (list[active]) pick(list[active].id);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && (
        <ul
          id={`${id}-list`}
          role="listbox"
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-lg"
        >
          {list.length ? (
            list.map((item, i) => (
              <li
                key={item.id}
                id={`${id}-${item.id}`}
                role="option"
                aria-selected={item.id === value}
                className={`cursor-pointer rounded-lg px-3 py-2 ${i === active ? "bg-mint" : ""} ${item.id === value ? "font-semibold" : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(item.id)}
              >
                {item.label}
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-sm text-muted">مفيش نتيجة. جرّب تكتبها بشكل تاني.</li>
          )}
        </ul>
      )}
    </div>
  );
}

const byName = (a: Region, b: Region) => a.name.localeCompare(b.name, "ar");

/** The governorate a region sits in, and the city (if the region is a city or below one). */
function locate(regions: Region[], regionId: string | null | undefined) {
  const byId = new Map(regions.map((r) => [r.id, r]));
  let r = regionId ? byId.get(regionId) : undefined;
  let city = "";
  while (r) {
    if (r.kind === "city") city = r.id;
    if (!r.parent_id) return { gov: r.id, city };
    r = byId.get(r.parent_id);
  }
  return { gov: "", city: "" };
}

/**
 * Governorate, then city or centre, both searchable. Submits the city (or the governorate
 * when no city is picked) as `name`.
 */
export function RegionSelect({
  regions,
  name = "region_id",
  defaultValue,
  required,
  requireCity = required,
}: {
  regions: Region[];
  name?: string;
  defaultValue?: string | null;
  required?: boolean;
  requireCity?: boolean;
}) {
  const start = useMemo(() => locate(regions, defaultValue), [regions, defaultValue]);
  const [gov, setGov] = useState(start.gov);
  const [city, setCity] = useState(start.city);
  const govs = useMemo(() => regions.filter((r) => !r.parent_id).sort(byName).map((r) => ({ id: r.id, label: r.name })), [regions]);
  const cities = useMemo(
    () => regions.filter((r) => r.parent_id === gov && r.kind === "city").sort(byName).map((r) => ({ id: r.id, label: r.name })),
    [regions, gov],
  );
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Combobox
        label="المحافظة"
        placeholder="اكتب اسم المحافظة"
        items={govs}
        value={gov}
        required={required}
        onChange={(id) => {
          if (id !== gov) setCity("");
          setGov(id);
        }}
      />
      <Combobox
        label="المدينة أو المركز"
        placeholder={gov ? "اكتب اسم المدينة أو المركز" : "اختار المحافظة الأول"}
        items={cities}
        value={city}
        onChange={setCity}
        disabled={!gov}
        required={requireCity && cities.length > 0}
      />
      <input type="hidden" name={name} value={city || gov} />
    </div>
  );
}

/** Several regions (coverage): search governorates and cities, each pick becomes a removable chip. */
export function RegionChecks({ regions, name = "regions", selected = [] }: { regions: Region[]; name?: string; selected?: string[] }) {
  const [picked, setPicked] = useState<string[]>(selected);
  const labelled = useMemo(() => {
    const byId = new Map(regions.map((r) => [r.id, r]));
    return regions
      .map((r) => {
        const parent = r.parent_id ? byId.get(r.parent_id) : undefined;
        return { id: r.id, label: parent ? `${r.name}، ${parent.name}` : `${r.name} (المحافظة كلها)`, gov: !r.parent_id };
      })
      .sort((a, b) => Number(b.gov) - Number(a.gov) || a.label.localeCompare(b.label, "ar"));
  }, [regions]);
  const label = new Map(labelled.map((l) => [l.id, l.label]));
  const remaining = labelled.filter((l) => !picked.includes(l.id));
  return (
    <div className="grid gap-2">
      <Combobox
        label="ضيف منطقة"
        placeholder="اكتب اسم محافظة أو مدينة"
        items={remaining}
        value=""
        onChange={(id) => setPicked((p) => [...p, id])}
      />
      {picked.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {picked.map((id) => (
            <li key={id} className="flex items-center gap-1 rounded-full bg-mint px-3 py-1 text-sm">
              {label.get(id) ?? "منطقة"}
              <button type="button" aria-label={`شيل ${label.get(id) ?? ""}`} className="px-1 text-muted" onClick={() => setPicked((p) => p.filter((x) => x !== id))}>
                ×
              </button>
              <input type="hidden" name={name} value={id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
