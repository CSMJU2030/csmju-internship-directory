"use client";

import { useState } from "react";
import type { PlaceTag } from "../../lib/api";

const MAX_TAGS = 5;
const fold = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * Fields of work: tick from the list (presets, then ones other users added)
 * or add a new one. The "เพิ่มสายงาน" box is also sent as `newTags`, so
 * typing "Data Engineering, DevOps" works before JavaScript loads.
 */
export default function TagPicker({ tags, initial = [] }: { tags: PlaceTag[]; initial?: string[] }) {
  const [options, setOptions] = useState<Array<{ key: string; label: string }>>(() => {
    const known = tags.map((tag) => ({ key: tag.key, label: tag.label }));
    // A place may list a field nobody else uses any more - keep it ticked.
    for (const key of initial) {
      if (!known.some((tag) => tag.key === key)) known.push({ key, label: key });
    }
    return known;
  });
  const [selected, setSelected] = useState<string[]>(initial);
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState("");

  const full = selected.length >= MAX_TAGS;

  function toggle(key: string) {
    setMessage("");
    setSelected((current) => (current.includes(key) ? current.filter((tag) => tag !== key) : full ? current : [...current, key]));
  }

  function addDraft() {
    const words = draft.trim().replace(/\s+/g, " ");
    if (words.length < 2 || words.length > 40) {
      setMessage("ชื่อสายงานต้องยาว 2-40 ตัวอักษร");
      return;
    }
    const existing = options.find((tag) => fold(tag.key) === fold(words) || fold(tag.label) === fold(words));
    const key = existing ? existing.key : words;
    if (!existing) setOptions((current) => [...current, { key, label: words }]);
    if (!selected.includes(key)) {
      if (full) {
        setMessage(`เลือกได้สูงสุด ${MAX_TAGS} สายงาน`);
        return;
      }
      setSelected((current) => [...current, key]);
    }
    setDraft("");
    setMessage(existing ? "มีสายงานนี้อยู่แล้ว เลือกให้แล้ว" : "");
  }

  return (
    <fieldset className="picker">
      <legend>สายงานที่รับฝึก (เลือกได้สูงสุด {MAX_TAGS})</legend>
      <div className="tag-picker">
        {options.map((tag) => {
          const checked = selected.includes(tag.key);
          return (
            <label key={tag.key} className="choice">
              <input
                type="checkbox"
                name="tags"
                value={tag.key}
                checked={checked}
                disabled={!checked && full}
                onChange={() => toggle(tag.key)}
              />
              <span>{tag.label}</span>
            </label>
          );
        })}
      </div>
      <div className="add-tag">
        <label className="add-tag-input">
          ไม่มีในรายการ? เพิ่มสายงาน
          <input
            name="newTags"
            maxLength={120}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addDraft();
              }
            }}
            placeholder="เช่น Data Engineering"
          />
        </label>
        <button type="button" className="btn btn-secondary btn-sm" onClick={addDraft}>
          เพิ่ม
        </button>
      </div>
      <p className="muted small" aria-live="polite">
        {message}
      </p>
    </fieldset>
  );
}
