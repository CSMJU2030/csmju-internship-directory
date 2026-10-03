"use client";

import { useState } from "react";
import type { Province } from "../../lib/api";
import { fieldLabel, input } from "../ui";

/**
 * Province field with one-tap picks of the provinces already in the
 * directory (most used first). Typing a new one still works, and the
 * datalist offers the same names when JavaScript has not loaded yet.
 */
export default function ProvincePicker({ provinces, initial = "" }: { provinces: Province[]; initial?: string }) {
  const [value, setValue] = useState(initial);

  return (
    <div className="flex flex-col gap-3">
      <label className={fieldLabel}>
        จังหวัด (จำเป็น)
        <input
          className={input}
          name="province"
          required
          minLength={2}
          maxLength={50}
          list="province-options"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="เชียงใหม่"
        />
      </label>
      <datalist id="province-options">
        {provinces.map((province) => (
          <option key={province.name} value={province.name} />
        ))}
      </datalist>
      {provinces.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="จังหวัดที่เคยเพิ่มไว้">
          {provinces.slice(0, 12).map((province) => (
            <button
              key={province.name}
              type="button"
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-label-md transition-colors ${
                province.name === value.trim()
                  ? "border-primary-container bg-primary-container/10 text-primary-container"
                  : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-primary-container"
              }`}
              aria-pressed={province.name === value.trim()}
              onClick={() => setValue(province.name)}
            >
              {province.name} <span className="text-label-sm text-outline tabular-nums">{province.placeCount}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
