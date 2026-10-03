export const regions = ["Chandigarh", "Punjab", "Himachal Pradesh", "Jammu and Kashmir", "Uttarakhand", "Haryana"] as const;
export type Region = typeof regions[number];
export const gemSourceIds: Record<Region, string> = {
  Chandigarh: "gem-direct", Punjab: "gem-direct-punjab",
  "Himachal Pradesh": "gem-direct-himachal", "Jammu and Kashmir": "gem-direct-jammu-kashmir",
  Uttarakhand: "gem-direct-uttarakhand", Haryana: "gem-direct-haryana",
};
