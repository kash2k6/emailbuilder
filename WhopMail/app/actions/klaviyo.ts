"use server"

import type { WhopMembership } from "../types"
import { processMembersInBatches, getPlatformLimits } from "./sync-utils"

// Validate Klaviyo API key and fetch lists
export async function validateKlaviyoApiKey(
  apiKey: string,
): Promise<{ success: boolean; lists?: any[]; error?: string }> {
  try {
    console.log(`Validating Klaviyo API key`)

    // Make request to Klaviyo API to validate key and fetch lists
    const response = await fetch(`https://a.klaviyo.com/api/lists`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Klaviyo-API-Key ${apiKey}`,
        revision: "2025-07-15",
      },
    })

    if (!response.ok) {
      let errorMessage = `Failed to connect to Klaviyo: ${response.status} ${response.statusText}`

      try {
        const errorData = await response.json()
        console.error("Klaviyo API error:", JSON.stringify(errorData))
        if (errorData.errors && errorData.errors[0]?.detail) {
          errorMessage = `Klaviyo error: ${errorData.errors[0].detail}`
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
    console.log("Klaviyo lists response:", data)

    return {
      success: true,
      lists: data.data || [],
    }
  } catch (error) {
    console.error("Error validating Klaviyo API key:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to connect to Klaviyo",
    }
  }
}

// Create a new Klaviyo list
export async function createKlaviyoList(
  apiKey: string,
  listName: string,
): Promise<{ success: boolean; listId?: string; error?: string }> {
  try {
    console.log(`Creating Klaviyo list: ${listName}`)

    const response = await fetch(`https://a.klaviyo.com/api/lists`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Klaviyo-API-Key ${apiKey}`,
        revision: "2025-07-15",
      },
      body: JSON.stringify({
        data: {
          type: "list",
          attributes: {
            name: listName,
          },
        },
      }),
    })

    if (!response.ok) {
      let errorMessage = `Failed to create list: ${response.status} ${response.statusText}`

      try {
        const errorData = await response.json()
        console.error("Klaviyo API error:", JSON.stringify(errorData))
        if (errorData.errors && errorData.errors[0]?.detail) {
          errorMessage = `Klaviyo error: ${errorData.errors[0].detail}`
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
    console.log("Klaviyo create list response:", data)

    if (!data.data || !data.data.id) {
      return {
        success: false,
        error: "Failed to create list: Invalid response from Klaviyo",
      }
    }

    return {
      success: true,
      listId: data.data.id,
    }
  } catch (error) {
    console.error("Error creating Klaviyo list:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create list",
    }
  }
}

// Sync members to Klaviyo list
export async function syncMembersToKlaviyo(
  apiKey: string,
  listId: string,
  members: WhopMembership[],
): Promise<{ success: boolean; syncedCount: number; error?: string }> {
  try {
    console.log(`=== KLAPIYO SYNC START ===`)
    console.log(`Starting Klaviyo sync for ${members.length} members to list ${listId}`)
    console.log(`API Key present: ${!!apiKey}`)
    console.log(`List ID: ${listId}`)
    console.log(`First few members:`, members.slice(0, 3).map(m => ({ email: m.email, name: m.name, user: m.user })))
    
    // Process members in smaller batches to avoid API limits
    const batchSize = 10 // Reduced from default to avoid API limits
    const delayMs = 1000 // 1 second delay between batches

    console.log(`Using batch size: ${batchSize}, delay: ${delayMs}ms`)

    const result = await processMembersInBatches(
      members,
      batchSize,
      async (batch) => {
        console.log(`=== PROCESSING BATCH ===`)
        console.log(`Batch size: ${batch.length}`)
        console.log(`Batch members:`, batch.map(m => ({ email: m.email, name: m.name, user: m.user })))
        
        console.log(`Processing Klaviyo batch with ${batch.length} members`)
        
        // Create profiles array for batch processing
        const profiles = batch.map((member) => {
          // Log member data for debugging
          console.log("Processing member for Klaviyo:", {
            email: member.email,
            name: member.name,
            user: member.user,
            username: member.username,
            product: member.product,
            status: member.status
          })
          
          // Use member.user as fallback for name if name is undefined
          const memberName = member.name || member.user || ""
          console.log(`Using member name: "${memberName}"`)
          
          const profile = {
            type: "profile",
            attributes: {
              email: member.email,
              first_name: memberName.split(" ")[0] || "",
              last_name: memberName.split(" ").slice(1).join(" ") || "",
              properties: {
                username: member.username || "",
                product: member.product || "",
                status: member.status || "",
                $source: "Whop Email Bridge",
              },
            },
          }
          
          console.log(`Created profile:`, JSON.stringify(profile, null, 2))
          return profile
        }).filter(profile => {
          // Filter out profiles with invalid data
          const isValid = profile.attributes.email && 
                 profile.attributes.email.trim() !== "" &&
                 profile.attributes.email.includes("@")
          console.log(`Profile ${profile.attributes.email} valid: ${isValid}`)
          return isValid
        })

        console.log(`Valid profiles after filtering: ${profiles.length}`)

        if (profiles.length === 0) {
          console.log("No valid profiles in batch, skipping")
          return
        }

        console.log(`Sending ${profiles.length} profiles to Klaviyo`)

        // Send profiles one by one to avoid batch issues
        const createdProfiles = []
        
        for (let i = 0; i < profiles.length; i++) {
          const profile = profiles[i]
          console.log(`=== SENDING PROFILE ${i + 1}/${profiles.length} ===`)
          console.log("Sending individual profile to Klaviyo:", JSON.stringify(profile, null, 2))
          
          console.log(`Making API request to https://a.klaviyo.com/api/profiles`)
          console.log(`Request headers:`, {
            "Content-Type": "application/json",
            Authorization: `Klaviyo-API-Key ${apiKey.substring(0, 10)}...`,
            revision: "2025-07-15",
          })
          
          let createProfileResponse = await fetch(`https://a.klaviyo.com/api/profiles`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Klaviyo-API-Key ${apiKey}`,
              revision: "2025-07-15",
            },
            body: JSON.stringify({
              data: profile,
            }),
          })

          console.log(`Profile ${i + 1} response status:`, createProfileResponse.status)
          console.log(`Profile ${i + 1} response headers:`, Object.fromEntries(createProfileResponse.headers.entries()))

          if (!createProfileResponse.ok) {
            const errorData = await createProfileResponse.json()
            console.log(`Profile ${i + 1} - Klaviyo API response:`, JSON.stringify(errorData, null, 2))
            
            // Check if it's a duplicate profile error
            if (createProfileResponse.status === 409 && errorData.errors?.[0]?.code === "duplicate_profile") {
              console.log(`Profile ${i + 1} - Duplicate profile detected, getting existing profile ID`)
              
              // Get the existing profile ID from the error response
              const existingProfileId = errorData.errors[0].meta?.duplicate_profile_id
              
              if (existingProfileId) {
                console.log(`Profile ${i + 1} - Existing profile ID: ${existingProfileId}`)
                
                // Update the existing profile
                console.log(`Profile ${i + 1} - Updating existing profile...`)
                const updateProfileResponse = await fetch(`https://a.klaviyo.com/api/profiles/${existingProfileId}`, {
                  method: "PATCH",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Klaviyo-API-Key ${apiKey}`,
                    revision: "2025-07-15",
                  },
                  body: JSON.stringify({
                    data: {
                      type: "profile",
                      id: existingProfileId,
                      attributes: profile.attributes,
                    },
                  }),
                })

                console.log(`Profile ${i + 1} - Update response status:`, updateProfileResponse.status)

                if (!updateProfileResponse.ok) {
                  const updateErrorData = await updateProfileResponse.json()
                  console.error(`Profile ${i + 1} - Update failed:`, JSON.stringify(updateErrorData, null, 2))
                  throw new Error(
                    updateErrorData.errors && updateErrorData.errors[0]?.detail
                      ? updateErrorData.errors[0].detail
                      : `Failed to update profile: ${updateProfileResponse.status}`,
                  )
                }

                const updateProfileData = await updateProfileResponse.json()
                console.log(`Profile ${i + 1} - Successfully updated existing profile:`, updateProfileData)
                createdProfiles.push(updateProfileData.data)
              } else {
                console.log(`Profile ${i + 1} - No existing profile ID found, skipping`)
                // Skip this profile if we can't get the existing ID
                continue
              }
            } else {
              // It's a different error, throw it
              console.error(`Profile ${i + 1} - Klaviyo API error:`, JSON.stringify(errorData, null, 2))
              throw new Error(
                errorData.errors && errorData.errors[0]?.detail
                  ? errorData.errors[0].detail
                  : `Failed to create profile: ${createProfileResponse.status}`,
              )
            }
          } else {
            // Profile created successfully
            const createProfileData = await createProfileResponse.json()
            console.log(`Profile ${i + 1} - Successfully created:`, createProfileData)
            createdProfiles.push(createProfileData.data)
          }
          
          // Add a small delay between requests to avoid rate limiting
          console.log(`Waiting 100ms before next profile...`)
          await new Promise(resolve => setTimeout(resolve, 100))
        }

        console.log(`=== BATCH COMPLETE ===`)
        console.log(`Successfully created ${createdProfiles.length} profiles in Klaviyo`)

        // Now add profiles to the list using the correct endpoint structure
        const profileIds = createdProfiles.map((profile: any) => profile.id)
        console.log(`Profile IDs to add to list:`, profileIds)

        // Add profiles to list using the relationships endpoint
        console.log(`Making API request to https://a.klaviyo.com/api/lists/${listId}/relationships/profiles`)
        const addToListResponse = await fetch(`https://a.klaviyo.com/api/lists/${listId}/relationships/profiles`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Klaviyo-API-Key ${apiKey}`,
            revision: "2025-07-15",
          },
          body: JSON.stringify({
            data: profileIds.map((id: string) => ({
              type: "profile",
              id,
            })),
          }),
        })

        console.log(`Add to list response status:`, addToListResponse.status)
        console.log(`Add to list response headers:`, Object.fromEntries(addToListResponse.headers.entries()))

        if (!addToListResponse.ok) {
          const errorData = await addToListResponse.json()
          console.log("Klaviyo add to list response:", JSON.stringify(errorData, null, 2))
          
          // Check if it's a duplicate relationship error (profile already in list)
          if (addToListResponse.status === 409) {
            console.log("Some profiles may already be in the list, but continuing...")
            // This is not a critical error - profiles might already be in the list
            // We'll consider this a success since the profiles exist
          } else {
            console.error("Klaviyo add to list error response:", JSON.stringify(errorData, null, 2))
            throw new Error(
              errorData.errors && errorData.errors[0]?.detail
                ? errorData.errors[0].detail
                : `Failed to add profiles to list: ${addToListResponse.status}`,
            )
          }
        } else {
          // 204 responses don't have a JSON body, so we don't try to parse them
          if (addToListResponse.status !== 204) {
            const addToListData = await addToListResponse.json()
            console.log(`Successfully added profiles to list:`, addToListData)
          } else {
            console.log(`Successfully added profiles to list (204 No Content)`)
          }
        }
        
        console.log(`Successfully processed ${profileIds.length} profiles for Klaviyo list`)
      },
      delayMs,
    )

    console.log(`=== SYNC COMPLETE ===`)
    console.log(`Final result:`, result)
    
    return {
      success: result.success,
      syncedCount: result.processedCount,
      error: result.error,
    }
  } catch (error) {
    console.error("=== SYNC ERROR ===")
    console.error("Error syncing members to Klaviyo:", error)
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace")
    return {
      success: false,
      syncedCount: 0,
      error: error instanceof Error ? error.message : "Unknown error during sync",
    }
  }
}

// Sync a single member to Klaviyo
export async function syncMemberToKlaviyo(
  apiKey: string,
  listId: string,
  member: WhopMembership,
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Syncing member ${member.email} to Klaviyo list ${listId}`)

    // Create profile
    const memberName = member.name || member.user || ""
    const profileData = {
      type: "profile",
      attributes: {
        email: member.email,
        first_name: memberName.split(" ")[0] || "",
        last_name: memberName.split(" ").slice(1).join(" ") || "",
        properties: {
          username: member.username || "",
          product: member.product || "",
          status: member.status || "",
          $source: "Whop Email Bridge",
        },
      },
    }

    // Send request to Klaviyo to create profile
    const createProfileResponse = await fetch(`https://a.klaviyo.com/api/profiles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Klaviyo-API-Key ${apiKey}`,
        revision: "2025-07-15",
      },
      body: JSON.stringify({
        data: profileData,
      }),
    })

    if (!createProfileResponse.ok) {
      const errorData = await createProfileResponse.json()
      return {
        success: false,
        error:
          errorData.errors && errorData.errors[0]?.detail
            ? errorData.errors[0].detail
            : `Failed to create profile: ${createProfileResponse.status}`,
      }
    }

    const createProfileData = await createProfileResponse.json()

    if (!createProfileData.data || !createProfileData.data.id) {
      return {
        success: false,
        error: "Failed to create profile: Invalid response from Klaviyo",
      }
    }

    const profileId = createProfileData.data.id

    // Add profile to list using the relationships endpoint
    const addToListResponse = await fetch(`https://a.klaviyo.com/api/lists/${listId}/relationships/profiles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Klaviyo-API-Key ${apiKey}`,
        revision: "2025-07-15",
      },
      body: JSON.stringify({
        data: [
          {
            type: "profile",
            id: profileId,
          },
        ],
      }),
    })

    if (!addToListResponse.ok) {
      const errorData = await addToListResponse.json()
      return {
        success: false,
        error:
          errorData.errors && errorData.errors[0]?.detail
            ? errorData.errors[0].detail
            : `Failed to add profile to list: ${addToListResponse.status}`,
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Error syncing member to Klaviyo:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error during sync",
    }
  }
}
