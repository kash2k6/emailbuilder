import { storage } from "@/lib/storage"

/**
 * Sync a member to the appropriate email platform based on company integration
 */
export async function syncMemberToEmailPlatform(memberData: any, integration: any) {
  console.log(`=== SYNCING MEMBER TO EMAIL PLATFORM ===`)
  console.log(`Platform: ${integration.platform}`)
  console.log(`Member: ${memberData.email}`)

  try {
    switch (integration.platform) {
      case "mailchimp":
        return await syncMemberToMailchimp(memberData, integration)
      case "klaviyo":
        return await syncMemberToKlaviyo(memberData, integration)
      case "convertkit":
        return await syncMemberToConvertKit(memberData, integration)
      case "activecampaign":
        return await syncMemberToActiveCampaign(memberData, integration)
      case "gohighlevel":
        return await syncMemberToGoHighLevel(memberData, integration)
      case "resend":
        return await syncMemberToResend(memberData, integration)
      default:
        throw new Error(`Unsupported email platform: ${integration.platform}`)
    }
  } catch (error) {
    console.error(`Error syncing member to ${integration.platform}:`, error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error during sync",
      platform: integration.platform,
      memberId: memberData.id
    }
  }
}

/**
 * Handle invalid membership (cancelled, expired, etc.)
 */
export async function handleInvalidMembership(memberData: any, integration: any) {
  console.log(`=== HANDLING INVALID MEMBERSHIP ===`)
  console.log(`Platform: ${integration.platform}`)
  console.log(`Member: ${memberData.email}`)

  try {
    switch (integration.platform) {
      case "mailchimp":
        return await handleInvalidMailchimpMember(memberData, integration)
      case "klaviyo":
        return await handleInvalidKlaviyoMember(memberData, integration)
      case "convertkit":
        return await handleInvalidConvertKitMember(memberData, integration)
      case "activecampaign":
        return await handleInvalidActiveCampaignMember(memberData, integration)
      case "gohighlevel":
        return await handleInvalidGoHighLevelMember(memberData, integration)
      default:
        console.log(`No invalid membership handler for platform: ${integration.platform}`)
        return { success: true, message: "No action taken for invalid membership" }
    }
  } catch (error) {
    console.error(`Error handling invalid membership for ${integration.platform}:`, error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error handling invalid membership",
      platform: integration.platform,
      memberId: memberData.id
    }
  }
}

/**
 * Update member in email platform
 */
export async function updateMemberInEmailPlatform(memberData: any, integration: any) {
  console.log(`=== UPDATING MEMBER IN EMAIL PLATFORM ===`)
  console.log(`Platform: ${integration.platform}`)
  console.log(`Member: ${memberData.email}`)

  try {
    // For most platforms, updating is the same as syncing (upsert behavior)
    return await syncMemberToEmailPlatform(memberData, integration)
  } catch (error) {
    console.error(`Error updating member in ${integration.platform}:`, error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error during update",
      platform: integration.platform,
      memberId: memberData.id
    }
  }
}

// Email platform sync functions
async function syncMemberToMailchimp(memberData: any, integration: any) {
  const { syncMemberToMailchimp } = await import("@/app/actions/mailchimp")
  
  if (!integration.api_key || !integration.list_id || !integration.dc) {
    throw new Error("Missing Mailchimp configuration")
  }

  return await syncMemberToMailchimp(
    integration.api_key,
    integration.dc,
    integration.list_id,
    memberData
  )
}

async function syncMemberToResend(memberData: any, integration: any) {
  const { syncMemberToResend } = await import("@/app/actions/resend")
  
  if (!integration.api_key || !integration.list_id) {
    throw new Error("Missing Resend configuration")
  }

  return await syncMemberToResend(
    integration.api_key,
    integration.list_id,
    memberData
  )
}

async function syncMemberToKlaviyo(memberData: any, integration: any) {
  const { syncMemberToKlaviyo } = await import("@/app/actions/klaviyo")
  
  if (!integration.api_key || !integration.list_id) {
    throw new Error("Missing Klaviyo configuration")
  }

  return await syncMemberToKlaviyo(
    integration.api_key,
    integration.list_id,
    memberData
  )
}

async function syncMemberToConvertKit(memberData: any, integration: any) {
  const { syncMemberToConvertKit } = await import("@/app/actions/convertkit")
  
  if (!integration.api_key || !integration.list_id) {
    throw new Error("Missing ConvertKit configuration")
  }

  return await syncMemberToConvertKit(
    integration.api_key,
    integration.list_id,
    memberData,
    [] // No tags for webhook sync
  )
}

async function syncMemberToActiveCampaign(memberData: any, integration: any) {
  const { syncMemberToActiveCampaign } = await import("@/app/actions/activecampaign")
  
  if (!integration.api_key || !integration.list_id || !integration.api_url) {
    throw new Error("Missing ActiveCampaign configuration")
  }

  return await syncMemberToActiveCampaign(
    integration.api_key,
    integration.api_url,
    integration.list_id,
    memberData
  )
}

async function syncMemberToGoHighLevel(memberData: any, integration: any) {
  const { syncMemberToGoHighLevel } = await import("@/app/actions/gohighlevel")
  
  if (!integration.api_key || !integration.list_id || !integration.location_id) {
    throw new Error("Missing GoHighLevel configuration")
  }

  return await syncMemberToGoHighLevel(
    integration.api_key,
    integration.location_id,
    integration.list_id,
    memberData
  )
}

// Invalid membership handlers
async function handleInvalidMailchimpMember(memberData: any, integration: any) {
  // For Mailchimp, we can unsubscribe the member or add them to a "cancelled" segment
  console.log(`Handling invalid Mailchimp member: ${memberData.email}`)
  
  // For now, just log the action. In a real implementation, you might:
  // 1. Unsubscribe the member
  // 2. Add them to a "cancelled" segment
  // 3. Update their tags
  
  return { success: true, message: "Invalid membership logged for Mailchimp" }
}

async function handleInvalidKlaviyoMember(memberData: any, integration: any) {
  console.log(`Handling invalid Klaviyo member: ${memberData.email}`)
  return { success: true, message: "Invalid membership logged for Klaviyo" }
}

async function handleInvalidConvertKitMember(memberData: any, integration: any) {
  console.log(`Handling invalid ConvertKit member: ${memberData.email}`)
  return { success: true, message: "Invalid membership logged for ConvertKit" }
}

async function handleInvalidActiveCampaignMember(memberData: any, integration: any) {
  console.log(`Handling invalid ActiveCampaign member: ${memberData.email}`)
  return { success: true, message: "Invalid membership logged for ActiveCampaign" }
}

async function handleInvalidGoHighLevelMember(memberData: any, integration: any) {
  console.log(`Handling invalid GoHighLevel member: ${memberData.email}`)
  return { success: true, message: "Invalid membership logged for GoHighLevel" }
} 