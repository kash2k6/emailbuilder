"use server"
import type { MailchimpApiResponse, WhopMembership } from "../types"
import { processMembersInBatches, getPlatformLimits } from "./sync-utils"

// Validate Mailchimp API key and fetch lists
export async function validateMailchimpApiKey(apiKey: string): Promise<MailchimpApiResponse> {
  try {
    // Extract data center from API key
    const dc = apiKey.split("-")[1]

    if (!dc) {
      return {
        success: false,
        error: "Invalid API key format. Mailchimp API keys should end with a data center (e.g. us6).",
      }
    }

    // Make request to Mailchimp API to validate key and fetch lists
    const response = await fetch(`https://${dc}.api.mailchimp.com/3.0/lists?count=100`, {
      method: "GET",
      headers: {
        Authorization: `apikey ${apiKey}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      let errorMessage = `Failed to connect to Mailchimp: ${response.status} ${response.statusText}`

      try {
        const errorData = await response.json()
        console.error("Mailchimp API error:", JSON.stringify(errorData))
        if (errorData.detail) {
          errorMessage = `Mailchimp error: ${errorData.detail}`
        }
      } catch (e) {
        console.error("Could not parse error response:", e)
      }

      return {
        success: false,
        error: errorMessage,
      }
    }

    const data = await response.json()

    return {
      success: true,
      lists: data.lists,
      dc: dc,
    }
  } catch (error) {
    console.error("Error validating Mailchimp API key:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to connect to Mailchimp",
    }
  }
}

// Create a new Mailchimp list
export async function createMailchimpList(
  apiKey: string,
  dc: string,
  listName: string,
  companyName = "My Company",
): Promise<{ success: boolean; listId?: string; error?: string }> {
  try {
    const response = await fetch(`https://${dc}.api.mailchimp.com/3.0/lists`, {
      method: "POST",
      headers: {
        Authorization: `apikey ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: listName,
        contact: {
          company: companyName,
          address1: "123 Street",
          city: "City",
          state: "State",
          zip: "12345",
          country: "US",
        },
        permission_reminder: "You are receiving this email because you signed up for updates.",
        campaign_defaults: {
          from_name: companyName,
          from_email: "you@example.com",
          subject: "Default Subject",
          language: "en",
        },
        email_type_option: true,
      }),
    })

    if (!response.ok) {
      let errorMessage = `Failed to create list: ${response.status} ${response.statusText}`

      try {
        const errorData = await response.json()
        console.error("Mailchimp API error:", JSON.stringify(errorData))
        if (errorData.detail) {
          errorMessage = `Mailchimp error: ${errorData.detail} (${response.status})`
        }
      } catch (e) {
        console.error("Could not parse error response:", e)
      }

      return {
        success: false,
        error: errorMessage,
      }
    }

    const data = await response.json()
    console.log("Mailchimp create list response:", data)

    return {
      success: true,
      listId: data.id,
    }
  } catch (error) {
    console.error("Error creating Mailchimp list:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create list",
    }
  }
}

// Update the syncMembersToMailchimp function
export async function syncMembersToMailchimp(
  apiKey: string,
  dc: string,
  listId: string,
  members: WhopMembership[],
  onProgress?: (progress: number) => void,
): Promise<{ success: boolean; syncedCount: number; error?: string }> {
  try {
    // Get recommended batch size and delay for Mailchimp
    const { batchSize, delayMs } = getPlatformLimits("mailchimp")

    // Process members in batches
    const result = await processMembersInBatches(
      members,
      batchSize,
      async (batch) => {
        // Create operations array for batch processing
        const operations = batch.map((member) => ({
          method: "POST",
          path: `/lists/${listId}/members`,
          body: JSON.stringify({
            email_address: member.email,
            status: "subscribed",
            merge_fields: {
              FNAME: member.name?.split(" ")[0] || "",
              LNAME: member.name?.split(" ").slice(1).join(" ") || "",
              USERNAME: member.username || "",
              PRODUCT: member.product || "",
              STATUS: member.status || "",
            },
            tags: [member.product || "Whop Member", member.status || ""],
          }),
        }))

        // Send batch request to Mailchimp
        const response = await fetch(`https://${dc}.api.mailchimp.com/3.0/batches`, {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`anystring:${apiKey}`).toString("base64")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ operations }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.detail || `Failed to sync batch: ${response.status}`)
        }
      },
      delayMs,
      onProgress,
    )

    return {
      success: result.success,
      syncedCount: result.processedCount,
      error: result.error,
    }
  } catch (error) {
    console.error("Error syncing members to Mailchimp:", error)
    return {
      success: false,
      syncedCount: 0,
      error: error instanceof Error ? error.message : "Unknown error during sync",
    }
  }
}

// Add this function to mailchimp.ts
export async function syncMemberToMailchimp(
  apiKey: string,
  dc: string,
  listId: string,
  member: WhopMembership,
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`https://${dc}.api.mailchimp.com/3.0/lists/${listId}/members`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`anystring:${apiKey}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_address: member.email,
        status: "subscribed",
        merge_fields: {
          FNAME: member.name?.split(" ")[0] || "",
          LNAME: member.name?.split(" ").slice(1).join(" ") || "",
          USERNAME: member.username || "",
          PRODUCT: member.product || "",
          STATUS: member.status || "",
        },
        tags: [member.product || "Whop Member", member.status || ""],
      }),
    })

    if (!response.ok) {
      // Handle 400 error for already subscribed members
      if (response.status === 400) {
        const errorData = await response.json()
        if (errorData.title === "Member Exists") {
          return { success: true, message: "Member already exists in Mailchimp" }
        }
      }

      const errorData = await response.json()
      throw new Error(errorData.detail || `Failed to sync member: ${response.status}`)
    }

    return { success: true, message: "Member synced to Mailchimp successfully" }
  } catch (error) {
    console.error("Error syncing member to Mailchimp:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error during sync",
    }
  }
}
