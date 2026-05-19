export const supportedPlatforms = ["instagram", "facebook", "linkedin"] as const;
export type SupportedPlatform = (typeof supportedPlatforms)[number];
