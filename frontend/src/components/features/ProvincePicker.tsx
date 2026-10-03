"use client";

import { useState } from "react";
import type { Province } from "../../lib/api";

/**
 * Province field with one-tap picks of the provinces already in the
 * directory (most used first). Typing a new one still works, and the
 * datalist offers the same names when JavaScript has not loaded yet.
 */
export default function ProvincePicker({ provinces, initial = "" }: { provinces: Province[]; initial?: string }) {
  const [value, setValue] = useState(initial);

  return (
    <div className="picker">
      <label>
        จังหวัด (จำเป็น)
        <input
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
        <div className="quick-picks" role="group" aria-label="จังหวัดที่เคยเพิ่มไว้">
          {provinces.slice(0, 12).map((province) => (
            <button
              key={province.name}
              type="button"
              className={`chip${province.name === value.trim() ? " chip-on" : ""}`}
              aria-pressed={province.name === value.trim()}
              onClick={() => setValue(province.name)}
            >
              {province.name} <span className="chip-count tabular">{province.placeCount}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
