"use server"

import type { WhopMembership } from "../types"
import { processMembersInBatches, getPlatformLimits } from "./sync-utils"

// Validate ConvertKit API key and fetch forms
export async function validateConvertKitApiKey(
  apiKey: string,
): Promise<{ success: boolean; forms?: any[]; tags?: any[]; error?: string }> {
  try {
    console.log(`Validating ConvertKit API key`)

    // Make request to ConvertKit API to validate key and fetch forms
    const response = await fetch(`https://api.convertkit.com/v3/forms?api_key=${apiKey}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      let errorMessage = `Failed to connect to ConvertKit: ${response.status} ${response.statusText}`

      try {
        const errorData = await response.json()
        console.error("ConvertKit API error:", JSON.stringify(errorData))
        if (errorData.error) {
          errorMessage = `ConvertKit error: ${errorData.error}`
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
    console.log("ConvertKit forms response:", data)

    // Also fetch tags
    const tagsResponse = await fetch(`https://api.convertkit.com/v3/tags?api_key=${apiKey}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    let tags: any[] = []
    if (tagsResponse.ok) {
      const tagsData = await tagsResponse.json()
      console.log("ConvertKit tags response:", tagsData)
      tags = tagsData.tags || []
    } else {
      console.error(`Failed to fetch tags: ${tagsResponse.status}`)
    }

    return {
      success: true,
      forms: data.forms || [],
      tags: tags,
    }
  } catch (error) {
    console.error("Error validating ConvertKit API key:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to connect to ConvertKit",
    }
  }
}

// Create a new ConvertKit form/sequence
export async function createConvertKitForm(
  apiKey: string,
  formName: string,
): Promise<{ success: boolean; formId?: string; error?: string }> {
  try {
    // ConvertKit API doesn't support creating forms via API
    // We'll return an error message instructing the user to create a form manually
    return {
      success: false,
      error:
        "ConvertKit API doesn't support creating forms programmatically. Please create a form in your ConvertKit account and refresh the list.",
    }
  } catch (error) {
    console.error("Error creating ConvertKit form:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create form",
    }
  }
}

// Create a tag in ConvertKit
export async function createConvertKitTag(
  apiKey: string,
  tagName: string,
): Promise<{ success: boolean; tagId?: number; error?: string }> {
  try {
    console.log(`Creating ConvertKit tag: ${tagName}`)

    const response = await fetch(`https://api.convertkit.com/v3/tags?api_key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tag: {
          name: tagName,
        },
      }),
    })

    if (!response.ok) {
      let errorMessage = `Failed to create tag: ${response.status} ${response.statusText}`

      try {
        const errorData = await response.json()
        console.error("ConvertKit API error:", JSON.stringify(errorData))
        if (errorData.error) {
          errorMessage = `ConvertKit error: ${errorData.error}`
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
    console.log("ConvertKit create tag response:", data)

    if (!data.tag || !data.tag.id) {
      return {
        success: false,
        error: "Failed to create tag: Invalid response from ConvertKit",
      }
    }

    return {
      success: true,
      tagId: data.tag.id,
    }
  } catch (error) {
    console.error("Error creating ConvertKit tag:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create tag",
    }
  }
}

// Sync members to ConvertKit using v3 API
export async function syncMembersToConvertKit(
  apiKey: string,
  formId: string,
  members: WhopMembership[],
  tagIds: number[] = [],
  onProgress?: (progress: number) => void,
): Promise<{ success: boolean; syncedCount: number; error?: string }> {
  try {
    // Validate required parameters
    if (!apiKey) {
      return { success: false, syncedCount: 0, error: "ConvertKit API key is required" }
    }
    if (!formId) {
      return { success: false, syncedCount: 0, error: "ConvertKit form ID is required" }
    }
    if (!members || members.length === 0) {
      return { success: false, syncedCount: 0, error: "No members to sync" }
    }

    console.log(`Starting ConvertKit sync with formId: ${formId}, members: ${members.length}`)
    
    // Get recommended batch size and delay for ConvertKit
    const { batchSize, delayMs } = getPlatformLimits("convertkit")

    // Filter out members without email addresses
    const membersWithEmails = members.filter(member => member.email && member.email.trim() !== '')
    console.log(`Filtered ${members.length} total members to ${membersWithEmails.length} members with emails`)
    
    if (membersWithEmails.length === 0) {
      return { success: false, syncedCount: 0, error: "No members with valid email addresses found" }
    }

    // Process members in batches
    const result = await processMembersInBatches(
      membersWithEmails,
      batchSize,
      async (batch) => {
        // Process each member individually since ConvertKit doesn't support true batch operations
        for (const member of batch) {
          try {
            // Validate member has required fields
            if (!member.email || member.email.trim() === '') {
              console.log(`Skipping member ${member.id} - no email address`)
              continue
            }

            // Prepare subscriber data for single member - parameters sent directly in request body
            const requestBody = {
              api_key: apiKey,
              email: member.email.trim(),
              first_name: member.user?.split(" ")[0] || "",
              fields: {
                last_name: member.user?.split(" ").slice(1).join(" ") || "",
                username: member.username || "",
                product: member.product || "",
                status: member.status || "",
              },
              tags: tagIds,
            }

            console.log(`Syncing member ${member.email} to ConvertKit form ${formId}`)

            // Send request to ConvertKit for single subscriber
            const response = await fetch(`https://api.convertkit.com/v3/forms/${formId}/subscribe`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(requestBody),
            })

            if (!response.ok) {
              const errorData = await response.json()
              console.error(`Failed to sync member ${member.email}:`, errorData)
              throw new Error(errorData.error || `Failed to sync member ${member.email}: ${response.status}`)
            }

            console.log(`Successfully synced member ${member.email}`)

            // Add a small delay between individual requests to respect rate limits
            await new Promise(resolve => setTimeout(resolve, 100))
          } catch (error) {
            console.error(`Error syncing member ${member.email}:`, error)
            throw error
          }
        }
      },
      delayMs,
    )

    return {
      success: result.success,
      syncedCount: result.processedCount,
      error: result.error,
    }
  } catch (error) {
    console.error("Error syncing members to ConvertKit:", error)
    return {
      success: false,
      syncedCount: 0,
      error: error instanceof Error ? error.message : "Unknown error during sync",
    }
  }
}

// Sync a single member to ConvertKit
export async function syncMemberToConvertKit(
  apiKey: string,
  formId: string,
  member: WhopMembership,
  tagIds: number[] = [],
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Syncing member ${member.email} to ConvertKit form ${formId}`)

    // Prepare subscriber data - parameters sent directly in request body
    const requestBody = {
      api_key: apiKey,
      email: member.email,
      first_name: member.user?.split(" ")[0] || "",
      fields: {
        last_name: member.user?.split(" ").slice(1).join(" ") || "",
        username: member.username || "",
        product: member.product || "",
        status: member.status || "",
      },
      tags: tagIds,
    }

    // Send request to ConvertKit
    const response = await fetch(`https://api.convertkit.com/v3/forms/${formId}/subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return {
        success: false,
        error: errorData.error || `Failed to sync member: ${response.status}`,
      }
    }

    const data = await response.json()
    console.log("ConvertKit subscribe response:", data)

    return { success: true }
  } catch (error) {
    console.error("Error syncing member to ConvertKit:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error during sync",
    }
  }
}
