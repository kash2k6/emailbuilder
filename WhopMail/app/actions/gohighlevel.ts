"use server"

import type { WhopMembership } from "../types"
import { processMembersInBatches, getPlatformLimits } from "./sync-utils"

// Validate GoHighLevel API key and fetch lists
export async function validateGoHighLevelApiKey(
  apiKey: string,
  locationId: string,
): Promise<{ success: boolean; lists?: any[]; error?: string }> {
  try {
    console.log(`Validating GoHighLevel API key for location ${locationId}`)

    // Make request to GoHighLevel API to validate key and fetch lists
    const response = await fetch(`https://services.leadconnectorhq.com/contacts/lists`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        Version: "2021-07-28",
        locationId: locationId,
      },
    })

    if (!response.ok) {
      let errorMessage = `Failed to connect to GoHighLevel: ${response.status}  ${response.statusText}`

      try {
        const errorData = await response.json()
        console.error("GoHighLevel API error:", JSON.stringify(errorData))
        if (errorData.message) {
          errorMessage = `GoHighLevel error: ${errorData.message}`
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
    console.log("GoHighLevel lists response:", data)

    return {
      success: true,
      lists: data.lists || [],
    }
  } catch (error) {
    console.error("Error validating GoHighLevel API key:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to connect to GoHighLevel",
    }
  }
}

// Create a new GoHighLevel list
export async function createGoHighLevelList(
  apiKey: string,
  locationId: string,
  listName: string,
): Promise<{ success: boolean; listId?: string; error?: string }> {
  try {
    console.log(`Creating GoHighLevel list: ${listName}`)

    const response = await fetch(`https://services.leadconnectorhq.com/contacts/lists`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        Version: "2021-07-28",
        locationId: locationId,
      },
      body: JSON.stringify({
        name: listName,
      }),
    })

    if (!response.ok) {
      let errorMessage = `Failed to create list: ${response.status}  ${response.statusText}`

      try {
        const errorData = await response.json()
        console.error("GoHighLevel API error:", JSON.stringify(errorData))
        if (errorData.message) {
          errorMessage = `GoHighLevel error: ${errorData.message}`
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
    console.log("GoHighLevel create list response:", data)

    if (!data.id) {
      return {
        success: false,
        error: "Failed to create list: Invalid response from GoHighLevel",
      }
    }

    return {
      success: true,
      listId: data.id,
    }
  } catch (error) {
    console.error("Error creating GoHighLevel list:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create list",
    }
  }
}

// Sync members to GoHighLevel list
export async function syncMembersToGoHighLevel(
  apiKey: string,
  locationId: string,
  listId: string,
  members: WhopMembership[],
  onProgress?: (progress: number) => void,
): Promise<{ success: boolean; syncedCount: number; error?: string }> {
  try {
    // Get recommended batch size and delay for GoHighLevel
    const { batchSize, delayMs } = getPlatformLimits("gohighlevel")

    // Process members in batches
    const result = await processMembersInBatches(
      members,
      batchSize,
      async (batch) => {
        // Process each member in the batch
        for (const member of batch) {
          // First create or update contact
          const contactResponse = await fetch(`https://services.leadconnectorhq.com/contacts/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
              Version: "2021-07-28",
              locationId: locationId,
            },
            body: JSON.stringify({
              email: member.email,
              firstName: member.user?.split(" ")[0] || "",
              lastName: member.user?.split(" ").slice(1).join(" ") || "",
              customField: [
                {
                  id: "username",
                  value: member.username || "",
                },
                {
                  id: "product",
                  value: member.product || "",
                },
                {
                  id: "status",
                  value: member.status || "",
                },
              ],
              source: "Whop Email Bridge",
            }),
          })

          if (!contactResponse.ok) {
            const errorData = await contactResponse.json()
            throw new Error(errorData.message || `Failed to create contact: ${contactResponse.status}`)
          }

          const contactData = await contactResponse.json()
          const contactId = contactData.contact.id

          // Add contact to list
          const addToListResponse = await fetch(
            `https://services.leadconnectorhq.com/contacts/lists/${listId}/contacts`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
                Version: "2021-07-28",
                locationId: locationId,
              },
              body: JSON.stringify({
                contactIds: [contactId],
              }),
            },
          )

          if (!addToListResponse.ok) {
            const errorData = await addToListResponse.json()
            throw new Error(errorData.message || `Failed to add contact to list: ${addToListResponse.status}`)
          }
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
    console.error("Error syncing members to GoHighLevel:", error)
    return {
      success: false,
      syncedCount: 0,
      error: error instanceof Error ? error.message : "Unknown error during sync",
    }
  }
}

// Sync a single member to GoHighLevel
export async function syncMemberToGoHighLevel(
  apiKey: string,
  locationId: string,
  listId: string,
  member: WhopMembership,
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Syncing member ${member.email} to GoHighLevel list ${listId}`)

    // Create or update contact
    const contactResponse = await fetch(`https://services.leadconnectorhq.com/contacts/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        Version: "2021-07-28",
        locationId: locationId,
      },
      body: JSON.stringify({
        email: member.email,
        firstName: member.user?.split(" ")[0] || "",
        lastName: member.user?.split(" ").slice(1).join(" ") || "",
        customField: [
          {
            id: "username",
            value: member.username || "",
          },
          {
            id: "product",
            value: member.product || "",
          },
          {
            id: "status",
            value: member.status || "",
          },
        ],
        source: "Whop Email Bridge",
      }),
    })

    if (!contactResponse.ok) {
      const errorData = await contactResponse.json()
      return {
        success: false,
        error: errorData.message || `Failed to create contact: ${contactResponse.status}`,
      }
    }

    const contactData = await contactResponse.json()

    if (!contactData.contact || !contactData.contact.id) {
      return {
        success: false,
        error: "Failed to create contact: Invalid response from GoHighLevel",
      }
    }

    const contactId = contactData.contact.id

    // Add contact to list
    const addToListResponse = await fetch(`https://services.leadconnectorhq.com/contacts/lists/${listId}/contacts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        Version: "2021-07-28",
        locationId: locationId,
      },
      body: JSON.stringify({
        contactIds: [contactId],
      }),
    })

    if (!addToListResponse.ok) {
      const errorData = await addToListResponse.json()
      return {
        success: false,
        error: errorData.message || `Failed to add contact to list: ${addToListResponse.status}`,
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Error syncing member to GoHighLevel:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error during sync",
    }
  }
}
