export function shortHash(value: string): string {
  if (value.length <= 18) return value;
  return `${value.slice(0, 10)}…${value.slice(-6)}`;
}

export function shortAddress(value: string): string {
  if (value.length < 12) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function when(ms: number): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(ms);
}

export function pillClass(status: string): string {
  if (status === "ACCEPTED" || status === "IN_SCOPE" || status === "UPHELD" || status === "FROZEN") {
    return "pill pill-forest";
  }
  if (status === "CHANGE_REQUEST" || status === "REVISED" || status === "REJECTED" || status === "EXPIRED") {
    return "pill pill-terra";
  }
  if (status === "INSUFFICIENT_EVIDENCE" || status === "REVIEW_NOT_ADMISSIBLE" || status === "IN_REVIEW") {
    return "pill pill-amber";
  }
  return "pill pill-ink";
}
