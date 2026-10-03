import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import TagPicker from "./TagPicker";

const TAGS = [
  { key: "web", label: "Web Development", preset: true, placeCount: 3 },
  { key: "mobile", label: "Mobile App", preset: true, placeCount: 1 },
  { key: "Data Engineering", label: "Data Engineering", preset: false, placeCount: 1 },
];

const checked = () =>
  screen
    .getAllByRole("checkbox")
    .filter((box) => (box as HTMLInputElement).checked)
    .map((box) => (box as HTMLInputElement).value);

function add(words: string) {
  fireEvent.change(screen.getByRole("textbox", { name: /เพิ่มสายงาน/ }), { target: { value: words } });
  fireEvent.click(screen.getByRole("button", { name: "เพิ่ม" }));
}

afterEach(cleanup);

describe("TagPicker", () => {
  it("keeps the place's current fields ticked, even one nobody else uses", () => {
    render(<TagPicker tags={TAGS} initial={["web", "Blockchain"]} />);
    expect(checked()).toEqual(["web", "Blockchain"]);
  });

  it("adds a new field of work and ticks it", () => {
    render(<TagPicker tags={TAGS} />);
    add("  DevOps   Engineer ");
    expect((screen.getByRole("checkbox", { name: "DevOps Engineer" }) as HTMLInputElement).checked).toBe(true);
  });

  it("ticks the existing field instead of adding the same words twice", () => {
    render(<TagPicker tags={TAGS} />);
    add("web development");
    expect(checked()).toEqual(["web"]);
    expect(screen.getAllByRole("checkbox")).toHaveLength(TAGS.length);
    expect(screen.queryByText("มีสายงานนี้อยู่แล้ว เลือกให้แล้ว")).not.toBeNull();
  });

  it("rejects a name that is too short", () => {
    render(<TagPicker tags={TAGS} />);
    add("x");
    expect(screen.queryByText("ชื่อสายงานต้องยาว 2-40 ตัวอักษร")).not.toBeNull();
    expect(checked()).toEqual([]);
  });

  it("stops at five fields", () => {
    render(<TagPicker tags={TAGS} initial={["web", "mobile", "a1", "a2", "a3"]} />);
    add("Game Dev");
    expect(screen.queryByText("เลือกได้สูงสุด 5 สายงาน")).not.toBeNull();
    expect((screen.getByRole("checkbox", { name: "Data Engineering" }) as HTMLInputElement).disabled).toBe(true);
  });
});
