import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import HideReviewButton from "./HideReviewButton";
import ReportButton from "./ReportButton";

afterEach(cleanup);

describe("ReportButton", () => {
  it("only opens the dialog - a click never sends a report by itself", () => {
    const action = vi.fn(async () => {});
    render(<ReportButton action={action} placeId="p1" reviewId="r1" reported={false} />);

    const button = screen.getByRole("button", { name: "รายงาน" });
    expect(button.getAttribute("type")).toBe("button");
    fireEvent.click(button);

    expect(screen.getByRole("dialog", { name: "รายงานรีวิวนี้" })).toBeTruthy();
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    expect((screen.getByRole("radio", { name: "สแปม / โฆษณา" }) as HTMLInputElement).checked).toBe(true);
    expect(action).not.toHaveBeenCalled();
  });

  it("says the review was reported instead of offering the button again", () => {
    render(<ReportButton action={async () => {}} placeId="p1" reviewId="r1" reported />);
    expect(screen.queryByRole("button", { name: "รายงาน" })).toBeNull();
    expect(screen.getByText(/รายงานแล้ว/)).toBeTruthy();
  });
});

describe("HideReviewButton", () => {
  it("asks for a reason in a dialog before hiding", () => {
    render(<HideReviewButton action={async () => {}} placeId="p1" reviewId="r1" returnTo="queue" />);

    const button = screen.getByRole("button", { name: "ซ่อนรีวิว" });
    expect(button.getAttribute("type")).toBe("button");
    fireEvent.click(button);

    const dialog = screen.getByRole("dialog", { name: "ซ่อนรีวิวนี้?" });
    expect(dialog.querySelector('input[name="isHidden"]')?.getAttribute("value")).toBe("true");
    expect(dialog.querySelector('input[name="returnTo"]')?.getAttribute("value")).toBe("queue");
    expect(screen.getByRole("textbox", { name: /เหตุผล/ })).toBeTruthy();
  });
});
