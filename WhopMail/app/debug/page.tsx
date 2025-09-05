'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function DebugPage() {
  const [configs, setConfigs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchConfigs() {
      try {
        setLoading(true)
        
        // Get all configs to see what's in the database
        const { data, error } = await supabase
          .from('email_platform_configs')
          .select('*')
        
        if (error) {
          setError(error.message)
          return
        }
        
        console.log('All configs in database:', data)
        setConfigs(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    
    fetchConfigs()
  }, [])

  if (loading) return <div className="p-8">Loading...</div>
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Database Debug - Email Platform Configs</h1>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Total Configs: {configs.length}</h2>
        {configs.length === 0 && (
          <p className="text-amber-600">No configurations found in database!</p>
        )}
      </div>
      
      {configs.map((config, index) => (
        <div key={index} className="border rounded-lg p-4 mb-4 bg-gray-50">
          <h3 className="font-semibold mb-2">Config #{index + 1}</h3>
          <pre className="text-sm overflow-auto bg-white p-3 rounded border">
            {JSON.stringify(config, null, 2)}
          </pre>
        </div>
      ))}
      
      <div className="mt-8 p-4 bg-orange-50 rounded-lg">
        <h3 className="font-semibold text-orange-800 mb-2">What to look for:</h3>
        <ul className="text-sm text-orange-700 space-y-1">
          <li>• Check if there are any configs with your whop_user_id</li>
          <li>• Look for configs with email_type = 'whopmail'</li>
          <li>• Verify the username and from_name fields exist</li>
        </ul>
      </div>
    </div>
  )
}
