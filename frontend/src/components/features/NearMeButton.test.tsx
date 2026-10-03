import { fireEvent, render, screen } from "@testing-library/react";
import NearMeButton from "./NearMeButton";

const push = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams("tag=web&sort=rank"),
}));

type Success = (position: { coords: { latitude: number; longitude: number } }) => void;
type Failure = (error: { code: number; PERMISSION_DENIED: number }) => void;

function mockGeolocation(answer: (success: Success, failure: Failure) => void) {
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition: jest.fn(answer) },
  });
}

describe("NearMeButton", () => {
  beforeEach(() => push.mockClear());

  it("lists places by distance from the rounded position, keeping the other filters", () => {
    mockGeolocation((success) => success({ coords: { latitude: 18.795123, longitude: 98.968876 } }));
    render(<NearMeButton />);
    fireEvent.click(screen.getByRole("button", { name: /ใกล้ฉัน/ }));
    expect(push).toHaveBeenCalledWith("/?tag=web&sort=distance&nearLat=18.80&nearLng=98.97");
  });

  it("explains how to allow location when the user said no", () => {
    mockGeolocation((_success, failure) => failure({ code: 1, PERMISSION_DENIED: 1 }));
    render(<NearMeButton />);
    fireEvent.click(screen.getByRole("button", { name: /ใกล้ฉัน/ }));
    expect(screen.getByRole("alert").textContent).toContain("ไม่ได้รับอนุญาตให้ใช้ตำแหน่ง");
    expect(push).not.toHaveBeenCalled();
  });
});
