export type DistributionPlatformOption = {
  value: string;
  label: string;
};

export const DEFAULT_DISTRIBUTION_PLATFORMS: DistributionPlatformOption[] = [
  { value: "Spotify", label: "Spotify" },
  { value: "Apple Music", label: "Apple Music" },
  { value: "YouTube Music", label: "YouTube Music" },
  { value: "Deezer", label: "Deezer" },
  { value: "Amazon Music", label: "Amazon Music" },
  { value: "TikTok", label: "TikTok" },
  { value: "Facebook", label: "Instagram/Facebook" },
  { value: "TIDAL", label: "Tidal" },
];

const legacyPlatformMap: Record<string, DistributionPlatformOption> = {
  SPOTIFY: { value: "Spotify", label: "Spotify" },
  DEEZER: { value: "Deezer", label: "Deezer" },
  APPLE_MUSIC: { value: "Apple Music", label: "Apple Music" },
  YOUTUBE_MUSIC: { value: "YouTube Music", label: "YouTube Music" },
  TIKTOK: { value: "TikTok", label: "TikTok" },
  INSTAGRAM_FACEBOOK: { value: "Facebook", label: "Instagram/Facebook" },
  AMAZON_MUSIC: { value: "Amazon Music", label: "Amazon Music" },
  TIDAL: { value: "TIDAL", label: "Tidal" },
};

export function normalizePlatformValue(platform: string) {
  return legacyPlatformMap[platform]?.value ?? platform;
}

export function platformDisplayName(platform: string) {
  return legacyPlatformMap[platform]?.label
    ?? DEFAULT_DISTRIBUTION_PLATFORMS.find((item) => item.value === platform)?.label
    ?? platform;
}
