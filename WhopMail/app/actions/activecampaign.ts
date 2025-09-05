"use server"

import type { WhopMembership } from "../types"
import { processMembersInBatches, getPlatformLimits } from "./sync-utils"

// Validate ActiveCampaign API key and fetch lists
export async function validateActiveCampaignApiKey(
  apiUrl: string,
  apiKey: string,
): Promise<{ success: boolean; lists?: any[]; error?: string }> {
  try {
    console.log(`Validating ActiveCampaign API key`)

    // Make request to ActiveCampaign API to validate key and fetch lists
    const response = await fetch(`${apiUrl}/api/3/lists`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Api-Token": apiKey,
      },
    })

    if (!response.ok) {
      let errorMessage = `Failed to connect to ActiveCampaign: ${response.status} ${response.statusText}`

      try {
        const errorData = await response.json()
        console.error("ActiveCampaign API error:", JSON.stringify(errorData))
        if (errorData.message) {
          errorMessage = `ActiveCampaign error: ${errorData.message}`
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
    console.log("ActiveCampaign lists response:", data)

    return {
      success: true,
      lists: data.lists || [],
    }
  } catch (error) {
    console.error("Error validating ActiveCampaign API key:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to connect to ActiveCampaign",
    }
  }
}

// Create a new ActiveCampaign list
export async function createActiveCampaignList(
  apiUrl: string,
  apiKey: string,
  listName: string,
): Promise<{ success: boolean; listId?: string; error?: string }> {
  try {
    console.log(`Creating ActiveCampaign list: ${listName}`)

    const response = await fetch(`${apiUrl}/api/3/lists`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Token": apiKey,
      },
      body: JSON.stringify({
        list: {
          name: listName,
          stringid: listName.toLowerCase().replace(/[^a-z0-9]/g, "-"),
        },
      }),
    })

    if (!response.ok) {
      let errorMessage = `Failed to create list: ${response.status} ${response.statusText}`

      try {
        const errorData = await response.json()
        console.error("ActiveCampaign API error:", JSON.stringify(errorData))
        if (errorData.message) {
          errorMessage = `ActiveCampaign error: ${errorData.message}`
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
    console.log("ActiveCampaign create list response:", data)

    if (!data.list || !data.list.id) {
      return {
        success: false,
        error: "Failed to create list: Invalid response from ActiveCampaign",
      }
    }

    return {
      success: true,
      listId: data.list.id.toString(),
    }
  } catch (error) {
    console.error("Error creating ActiveCampaign list:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create list",
    }
  }
}

// Sync members to ActiveCampaign list
export async function syncMembersToActiveCampaign(
  apiUrl: string,
  apiKey: string,
  listId: string,
  members: WhopMembership[],
  onProgress?: (progress: number) => void,
): Promise<{ success: boolean; syncedCount: number; error?: string }> {
  try {
    // Get recommended batch size and delay for ActiveCampaign
    const { batchSize, delayMs } = getPlatformLimits("activecampaign")

    // Process members in batches
    const result = await processMembersInBatches(
      members,
      batchSize,
      async (batch) => {
        // Process each member in the batch
        for (const member of batch) {
          // First create or update contact
          const contactResponse = await fetch(`${apiUrl}/api/3/contacts`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Api-Token": apiKey,
            },
            body: JSON.stringify({
              contact: {
                email: member.email,
                firstName: member.user?.split(" ")[0] || "",
                lastName: member.user?.split(" ").slice(1).join(" ") || "",
                fieldValues: [
                  {
                    field: "Username",
                    value: member.username || "",
                  },
                  {
                    field: "Product",
                    value: member.product || "",
                  },
                  {
                    field: "Status",
                    value: member.status || "",
                  },
                ],
              },
            }),
          })

          if (!contactResponse.ok) {
            const errorData = await contactResponse.json()
            throw new Error(errorData.message || `Failed to create contact: ${contactResponse.status}`)
          }

          const contactData = await contactResponse.json()
          const contactId = contactData.contact.id

          // Add contact to list
          const addToListResponse = await fetch(`${apiUrl}/api/3/contactLists`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Api-Token": apiKey,
            },
            body: JSON.stringify({
              contactList: {
                list: listId,
                contact: contactId,
                status: 1,
              },
            }),
          })

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
    console.error("Error syncing members to ActiveCampaign:", error)
    return {
      success: false,
      syncedCount: 0,
      error: error instanceof Error ? error.message : "Unknown error during sync",
    }
  }
}

// Sync a single member to ActiveCampaign
export async function syncMemberToActiveCampaign(
  apiUrl: string,
  apiKey: string,
  listId: string,
  member: WhopMembership,
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Syncing member ${member.email} to ActiveCampaign list ${listId}`)

    // Create or update contact
    const contactResponse = await fetch(`${apiUrl}/api/3/contacts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Token": apiKey,
      },
      body: JSON.stringify({
        contact: {
          email: member.email,
          firstName: member.user?.split(" ")[0] || "",
          lastName: member.user?.split(" ").slice(1).join(" ") || "",
          fieldValues: [
            {
              field: "Username",
              value: member.username || "",
            },
            {
              field: "Product",
              value: member.product || "",
            },
            {
              field: "Status",
              value: member.status || "",
            },
          ],
        },
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
        error: "Failed to create contact: Invalid response from ActiveCampaign",
      }
    }

    const contactId = contactData.contact.id

    // Add contact to list
    const addToListResponse = await fetch(`${apiUrl}/api/3/contactLists`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Token": apiKey,
      },
      body: JSON.stringify({
        contactList: {
          list: listId,
          contact: contactId,
          status: 1,
        },
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
    console.error("Error syncing member to ActiveCampaign:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error during sync",
    }
  }
}
