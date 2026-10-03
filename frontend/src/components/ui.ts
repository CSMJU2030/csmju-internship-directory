/**
 * Class strings this subsystem repeats, built on the central ones in @/csmju
 * (ui.ts) and the tokens in globals.css. Tailwind utilities only - no hex and
 * no arbitrary values (UI-01, UI-02). Buttons and fields keep the 44px touch
 * target (ui-design-system.md 6.1).
 */
import { cardClass, dangerButtonClass, inputClass, primaryButtonClass, secondaryButtonClass } from "@/csmju";

const touch = "min-h-11";

export const primaryButton = `${primaryButtonClass} ${touch}`;
export const secondaryButton = `${secondaryButtonClass} ${touch} inline-flex items-center justify-center gap-2`;
export const tonalButton = `${touch} inline-flex items-center justify-center gap-2 rounded-lg bg-primary-container/10 px-4 py-2.5 text-label-md text-primary-container transition-colors hover:bg-primary-container/20 disabled:cursor-not-allowed disabled:opacity-40`;
export const dangerButton = `${dangerButtonClass} ${touch}`;
export const input = `${inputClass} ${touch}`;
export const card = `${cardClass} p-6`;

export const pageTitle = "font-display text-headline-lg text-on-surface";
export const sectionTitle = "mb-4 font-display text-headline-md text-on-surface";
export const muted = "text-body-md text-on-surface-variant";
export const small = "text-label-md font-normal text-on-surface-variant";
export const fieldLabel = "flex flex-col gap-2 text-label-md text-on-surface";
export const link = "inline-flex min-h-11 items-center gap-1 text-label-md text-primary-container hover:underline";

export const alertError = "rounded-lg border border-error/30 bg-error-container px-4 py-3 text-body-md text-on-error-container";
export const alertSuccess = "rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-body-md text-emerald-700";

export const tag = "rounded-full bg-primary-container/10 px-2.5 py-1 text-label-sm text-primary-container";
