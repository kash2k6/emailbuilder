"use server"

import type { WhopMembership, EmailPlatformConfig } from "@/app/types"
import { syncMemberToMailchimp } from "./mailchimp"
import { syncMemberToConvertKit } from "./convertkit"
import { syncMemberToKlaviyo } from "./klaviyo"
import { syncMemberToActiveCampaign } from "./activecampaign"
import { syncMemberToGoHighLevel } from "./gohighlevel"
import { syncMemberToResend } from "./resend"

/**
 * Sync a member to all connected email platforms
 */
export async function syncMemberToEmailPlatforms(
  member: WhopMembership,
  integration: EmailPlatformConfig,
): Promise<{ success: boolean; message: string }> {
  try {
    switch (integration.type) {
      case "mailchimp":
        if (!integration.apiKey || !integration.listId || !integration.dc) {
          return { success: false, message: "Missing Mailchimp configuration" }
        }
        return await syncMemberToMailchimp(integration.apiKey, integration.dc, integration.listId, member)

      case "convertkit":
        if (!integration.apiKey || !integration.listId) {
          return { success: false, message: "Missing ConvertKit configuration" }
        }
        const convertkitResult = await syncMemberToConvertKit(integration.apiKey, integration.listId, member, [])
        return { success: convertkitResult.success, message: convertkitResult.error || "Success" }

      case "klaviyo":
        if (!integration.apiKey || !integration.listId) {
          return { success: false, message: "Missing Klaviyo configuration" }
        }
        const klaviyoResult = await syncMemberToKlaviyo(integration.apiKey, integration.listId, member)
        return { success: klaviyoResult.success, message: klaviyoResult.error || "Success" }

      case "activecampaign":
        if (!integration.apiKey || !integration.apiUrl || !integration.listId) {
          return { success: false, message: "Missing ActiveCampaign configuration" }
        }
        const activecampaignResult = await syncMemberToActiveCampaign(integration.apiUrl, integration.apiKey, integration.listId, member)
        return { success: activecampaignResult.success, message: activecampaignResult.error || "Success" }

      case "gohighlevel":
        if (!integration.apiKey || !integration.locationId || !integration.listId) {
          return { success: false, message: "Missing GoHighLevel configuration" }
        }
        const gohighlevelResult = await syncMemberToGoHighLevel(integration.apiKey, integration.locationId, integration.listId, member)
        return { success: gohighlevelResult.success, message: gohighlevelResult.error || "Success" }

      case "resend":
        if (!integration.apiKey || !integration.listId) {
          return { success: false, message: "Missing Resend configuration" }
        }
        const resendResult = await syncMemberToResend(integration.apiKey, integration.listId, member)
        return { success: resendResult.success, message: resendResult.error || "Success" }

      default:
        return { success: false, message: `Unsupported platform: ${integration.type}` }
    }
  } catch (error) {
    console.error(`Error syncing member to ${integration.type}:`, error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error during sync",
    }
  }
}

// Alias for webhook handler
export const syncNewMemberToEmailPlatforms = syncMemberToEmailPlatforms
