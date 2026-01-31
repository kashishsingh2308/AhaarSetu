// src/pages/TestPage.tsx
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const TestPage = () => {
  const [donors, setDonors] = useState<any[]>([])
  const [foodPosts, setFoodPosts] = useState<any[]>([])

  const fetchDonors = async () => {
    const { data } = await supabase.from('donors').select('*')
    setDonors(data || [])
  }

  const fetchFoodPosts = async () => {
    const { data } = await supabase.from('food_posts').select('*')
    setFoodPosts(data || [])
  }

  const createTestDonor = async () => {
    const { data, error } = await supabase
      .from('donors')
      .insert([{
        organization_name: 'Test Hotel ' + Date.now(),
        organization_type: 'hotel',
        location: 'Test Location',
        phone_number: '0000000000',
        username: 'test' + Date.now(),
        password: 'test123'
      }])
      .select()
    
    if (error) {
      console.error('Error creating donor:', error)
    } else {
      console.log('Created donor:', data)
      fetchDonors()
    }
  }

  useEffect(() => {
    fetchDonors()
    fetchFoodPosts()
  }, [])

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Database Test Page</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Donors in Database</h2>
              <Button onClick={createTestDonor} size="sm">
                Add Test Donor
              </Button>
            </div>
            <div className="space-y-3">
              {donors.map(donor => (
                <div key={donor.id} className="p-3 border rounded">
                  <p><strong>ID:</strong> <code className="text-xs">{donor.id}</code></p>
                  <p><strong>Username:</strong> {donor.username}</p>
                  <p><strong>Org:</strong> {donor.organization_name}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold mb-4">Food Posts</h2>
            <div className="space-y-3">
              {foodPosts.map(post => (
                <div key={post.id} className="p-3 border rounded">
                  <p><strong>Food:</strong> {post.food_name}</p>
                  <p><strong>Donor ID:</strong> <code className="text-xs">{post.donor_id}</code></p>
                  <p><strong>Quantity:</strong> {post.available_quantity}/{post.quantity}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default TestPage