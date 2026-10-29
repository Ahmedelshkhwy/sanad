import { inputClass } from "@/components/ui/Field";
import type { RegionOption } from "@/lib/regions";

/** One region from the tree; children are indented under their parent. */
export function RegionSelect({
  options,
  name = "region_id",
  defaultValue,
  required,
  placeholder = "اختار المنطقة",
}: {
  options: RegionOption[];
  name?: string;
  defaultValue?: string | null;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <select name={name} defaultValue={defaultValue ?? ""} required={required} className={inputClass}>
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {"  ".repeat(o.depth)}
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** Several regions as checkboxes (coverage areas). */
export function RegionChecks({ options, name = "regions", selected = [] }: { options: RegionOption[]; name?: string; selected?: string[] }) {
  return (
    <fieldset className="grid max-h-56 gap-1 overflow-y-auto rounded-xl border-[1.5px] border-line p-3 text-sm">
      {options.map((o) => (
        <label key={o.id} className="flex items-center gap-2" style={{ paddingInlineStart: `${o.depth * 1.1}rem` }}>
          <input type="checkbox" name={name} value={o.id} defaultChecked={selected.includes(o.id)} className="accent-green" />
          {o.label}
        </label>
      ))}
    </fieldset>
  );
}
