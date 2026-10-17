import type { ScopeCard } from "./policy";

export const DEMO_DEVELOPER = "0x1111111111111111111111111111111111111111";
export const DEMO_CLIENT = "0x2222222222222222222222222222222222222222";

/** Clearly labelled specimen. Not a customer, not a chain record. */
export const exampleCard: ScopeCard = {
  title: "EU basket tax matches displayed lines",
  brokenBehavior:
    "VAT-inclusive totals round half-up per line, so a three-item basket can charge one cent more than the sum of the displayed line prices.",
  expectedBehavior:
    "The charged basket total equals the sum of the displayed line prices. Tax is computed on the basket, not re-rounded per line.",
  environment: "Web storefront, EU VAT-inclusive display, Chrome Firefox and Safari",
  baselineVersion: "storefront 4.2.1",
  included: [
    {
      id: "S-1",
      text: "Correct EU VAT-inclusive basket charging so the total equals the sum of displayed line prices.",
      scenario: "",
    },
  ],
  excluded: [
    { id: "X-1", text: "New tax jurisdictions, exemptions, or B2B reverse charge.", scenario: "" },
    { id: "X-2", text: "Visual redesign of the cart.", scenario: "" },
  ],
  acceptance: [
    {
      id: "A-1",
      text: "Three displayed lines of 10.00, 10.00 and 10.01 at 19 percent VAT inclusive charge exactly the sum of those displayed lines.",
      scenario: "",
    },
  ],
  protected: [
    {
      id: "P-1",
      text: "Guest checkout without a tax id still completes and charges the displayed total.",
      scenario: "guest-eu-vat",
    },
  ],
};

export function emptyCard(): ScopeCard {
  return {
    title: "",
    brokenBehavior: "",
    expectedBehavior: "",
    environment: "",
    baselineVersion: "",
    included: [{ id: "S-1", text: "", scenario: "" }],
    excluded: [],
    acceptance: [{ id: "A-1", text: "", scenario: "" }],
    protected: [],
  };
}
