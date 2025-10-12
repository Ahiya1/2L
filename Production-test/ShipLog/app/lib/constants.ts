// ShipLog Launch Platform Constants
// Centralized list of all supported launch platforms

export const LAUNCH_PLATFORMS = [
  'Product Hunt',
  'Twitter',
  'Show HN',
  'Reddit',
  'IndieHackers',
  'Newsletter',
  'Other',
] as const

export type LaunchPlatform = typeof LAUNCH_PLATFORMS[number]

// Helper function for product initialization
export const getDefaultLaunches = (productId: string) =>
  LAUNCH_PLATFORMS.map(platform => ({
    productId,
    platform,
    launched: false,
  }))
