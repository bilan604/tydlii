/** tydlii.com Option A tokens. The smile wordmark lives in each app's assets/brand. */
export const brand = {
  ink: "#070707",
  teal: "#04a3ac",
  sage: "#5c9396",
  mist: "#e5f3f4",
} as const;

export type BrandColor = (typeof brand)[keyof typeof brand];
