/**
 * Utility functions for syncing members to email platforms
 * with rate limiting and batch processing
 */

import type { WhopMembership } from "@/app/types"

/**
 * Process members in batches with rate limiting
 * @param members Array of members to process
 * @param batchSize Number of members to process in each batch
 * @param processBatch Function to process each batch
 * @param delayMs Delay between batches in milliseconds
 */
export async function processMembersInBatches(
  members: WhopMembership[],
  batchSize: number,
  processBatch: (batch: WhopMembership[]) => Promise<any>,
  delayMs = 1000,
): Promise<{ success: boolean; processedCount: number; error?: string }> {
  let processedCount = 0
  const totalMembers = members.length

  try {
    // Split members into batches
    const batches: WhopMembership[][] = []
    for (let i = 0; i < totalMembers; i += batchSize) {
      batches.push(members.slice(i, i + batchSize))
    }

    // Process each batch with delay between batches
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]

      // Process current batch
      await processBatch(batch)
      processedCount += batch.length

      // Add delay before next batch (except for the last batch)
      if (i < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }

    return { success: true, processedCount }
  } catch (error) {
    return {
      success: false,
      processedCount,
      error: error instanceof Error ? error.message : "Unknown error during batch processing",
    }
  }
}

/**
 * Get recommended batch size and delay for different email platforms
 */
export function getPlatformLimits(platform: string): { batchSize: number; delayMs: number } {
  switch (platform.toLowerCase()) {
    case "mailchimp":
      return { batchSize: 500, delayMs: 1000 } // Mailchimp has higher limits
    case "convertkit":
      return { batchSize: 100, delayMs: 1500 } // ConvertKit has stricter rate limits
    case "klaviyo":
      return { batchSize: 100, delayMs: 1000 }
    case "activecampaign":
      return { batchSize: 100, delayMs: 1200 }
    case "gohighlevel":
      return { batchSize: 50, delayMs: 2000 } // GoHighLevel has stricter limits
    case "resend":
      return { batchSize: 100, delayMs: 1000 } // Resend has good rate limits
    default:
      return { batchSize: 50, delayMs: 2000 } // Conservative default
  }
}
