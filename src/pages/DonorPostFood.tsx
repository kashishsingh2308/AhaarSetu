// src/pages/DonorPostFood.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useFood } from '@/contexts/FoodContext'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase'

const DonorPostFood = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { addFoodPost, refreshFoodPosts } = useFood()
  const { donorProfile, isAuthenticated, userRole } = useAuth()
  
  const [formData, setFormData] = useState({
    foodName: '',
    foodType: 'veg',
    quantity: '',
    freshnessTime: '',
    note: ''
  })
  const [loading, setLoading] = useState(false)
  const [dbMode, setDbMode] = useState<'supabase' | 'local'>('supabase')
  const [errorDetails, setErrorDetails] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setErrorDetails(null)
  }

  const handleFoodTypeChange = (value: string) => {
    setFormData(prev => ({ ...prev, foodType: value }))
  }

  const testDatabaseConnection = async () => {
    try {
      toast({
        title: "Testing Connection",
        description: "Checking database connection...",
      })

      // Test if donors table is accessible
      const { data: donors, error: donorsError } = await supabase
        .from('donors')
        .select('count', { count: 'exact', head: true })
      
      if (donorsError) {
        console.error('❌ Database test failed:', donorsError)
        toast({
          title: "Connection Failed",
          description: "Could not connect to database",
          variant: "destructive"
        })
        return false
      }
      
      toast({
        title: "Connection Successful",
        description: "Database is accessible",
      })
      return true
      
    } catch (error) {
      console.error('💥 Database test error:', error)
      toast({
        title: "Connection Error",
        description: "Unexpected error during connection test",
        variant: "destructive"
      })
      return false
    }
  }

  const saveToDatabase = async (donorId: string, foodData: any) => {
    try {
      const { data, error } = await supabase
        .from('food_posts')
        .insert([{
          donor_id: donorId,
          food_name: foodData.foodName,
          food_type: foodData.foodType === 'veg' ? 'vegetarian' : 'non-vegetarian',
          quantity: foodData.quantity,
          available_quantity: foodData.quantity,
          freshness_time: foodData.freshnessTime,
          organization_name: foodData.donorName || 'Unknown Organization',
          location: foodData.location || 'Unknown Location',
          is_active: true
        }])
        .select()
        .single()

      if (error) {
        console.error('❌ Database save error:', error)
        
        // Handle specific errors
        if (error.code === '23503') {
          return { 
            success: false, 
            error: 'Your donor account is not registered in the database. Please re-register.',
            details: `Donor ID "${donorId}" not found.`
          }
        }
        
        return { 
          success: false, 
          error: error.message,
          details: error.code || 'Unknown error'
        }
      }

      console.log('✅ Successfully saved to database:', data)
      return { success: true, data }
      
    } catch (error: any) {
      console.error('💥 Unexpected error during save:', error)
      return { 
        success: false, 
        error: 'Unexpected error',
        details: error.message 
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorDetails(null)

    // Validation
    if (!isAuthenticated || userRole !== 'donor') {
      toast({
        title: "Error",
        description: "Please login as a donor first",
        variant: "destructive"
      })
      navigate('/donor/login')
      setLoading(false)
      return
    }

    if (!donorProfile) {
      toast({
        title: "Error",
        description: "Donor profile not found",
        variant: "destructive"
      })
      setLoading(false)
      return
    }

    const quantity = parseInt(formData.quantity)
    if (isNaN(quantity) || quantity <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid quantity (minimum 1)",
        variant: "destructive"
      })
      setLoading(false)
      return
    }

    // Prepare food data
    const foodData = {
      donorId: donorProfile.id,
      donorName: donorProfile.organizationName,
      location: donorProfile.location,
      foodName: formData.foodName,
      foodType: formData.foodType,
      quantity: quantity,
      freshnessTime: formData.freshnessTime
    }

    try {
      // Try to save to database first
      const dbResult = await saveToDatabase(donorProfile.id, foodData)
      
      if (dbResult.success) {
        setDbMode('supabase')
        
        // Success! Refresh food posts
        await refreshFoodPosts()
        
        toast({
          title: "Success!",
          description: "Food posted and saved to database!",
        })
        
        // Reset form
        setFormData({
          foodName: '',
          foodType: 'veg',
          quantity: '',
          freshnessTime: '',
          note: ''
        })
        
        // Navigate to dashboard
        setTimeout(() => navigate('/donor/dashboard'), 1000)
        
      } else {
        // Database failed, fallback to local
        setDbMode('local')
        setErrorDetails(dbResult.details || dbResult.error)
        
        // Save to local context
        await addFoodPost({
          donorId: donorProfile.id,
          donorName: donorProfile.organizationName,
          location: donorProfile.location,
          foodName: formData.foodName,
          foodType: formData.foodType as 'veg' | 'non-veg',
          quantity: quantity,
          freshTill: formData.freshnessTime
        })
        
        toast({
          title: "Warning",
          description: "Saved locally (database unavailable)",
          variant: "default"
        })
        
        // Reset form
        setFormData({
          foodName: '',
          foodType: 'veg',
          quantity: '',
          freshnessTime: '',
          note: ''
        })
        
        // Navigate to dashboard
        setTimeout(() => navigate('/donor/dashboard'), 1000)
      }

    } catch (error: any) {
      console.error('💥 Submit error:', error)
      
      toast({
        title: "Error",
        description: error.message || 'Failed to post food',
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-green-700">Post Surplus Food</CardTitle>
          <p className="text-gray-600">Share food, meals & refreshments with those in need</p>
          
          {/* Database Status */}
          <div className="mt-4">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              dbMode === 'supabase' 
                ? 'bg-green-100 text-green-800 border border-green-200' 
                : 'bg-amber-100 text-amber-800 border border-amber-200'
            }`}>
              <span className={`w-2 h-2 rounded-full mr-2 ${
                dbMode === 'supabase' ? 'bg-green-500' : 'bg-amber-500'
              }`}></span>
              {dbMode === 'supabase' ? 'Connected to Database' : 'Using Local Storage'}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {errorDetails && (
            <Alert variant="destructive" className="mb-6 animate-in fade-in duration-300">
              <AlertTitle>Database Connection Issue</AlertTitle>
              <AlertDescription className="mt-2">
                <p className="mb-2">Your food is saved locally, but not in the database. This means:</p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Other users won't see your food posts</li>
                  <li>Posts will disappear when you refresh or logout</li>
                  <li>Booking features won't work properly</li>
                </ul>
                <p className="mt-3 text-sm">
                  <strong>Error:</strong> {errorDetails}
                </p>
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Organization Info */}
            <div className="space-y-3">
              <Label className="text-gray-700 font-semibold">Your Organization</Label>
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-green-700 font-bold">D</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{donorProfile?.organizationName || 'Your Organization'}</h3>
                    <p className="text-sm text-gray-600 mt-1">{donorProfile?.location || 'Your Location'}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-gray-500">
                        ID: <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                          {donorProfile?.id ? donorProfile.id.substring(0, 8) + '...' : 'Not set'}
                        </code>
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={testDatabaseConnection}
                        className="text-xs h-7"
                      >
                        Test Connection
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Food Name */}
            <div className="space-y-2">
              <Label htmlFor="foodName" className="text-gray-700 font-semibold">
                Food Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="foodName"
                name="foodName"
                value={formData.foodName}
                onChange={handleChange}
                placeholder="e.g., Rice with Dal, Biryani, Roti Sabzi"
                required
                disabled={loading}
                className="focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* Food Type */}
            <div className="space-y-3">
              <Label className="text-gray-700 font-semibold">
                Food Type <span className="text-red-500">*</span>
              </Label>
              <RadioGroup
                value={formData.foodType}
                onValueChange={handleFoodTypeChange}
                className="grid grid-cols-2 gap-3"
                disabled={loading}
              >
                <div>
                  <RadioGroupItem value="veg" id="veg" className="peer sr-only" disabled={loading} />
                  <Label
                    htmlFor="veg"
                    className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-white p-4 hover:bg-gray-50 hover:border-green-300 peer-data-[state=checked]:border-green-500 peer-data-[state=checked]:bg-green-50 cursor-pointer transition-all"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded-full bg-green-500"></div>
                      <span className="font-medium text-green-700">Vegetarian</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-center">Suitable for vegetarians</p>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="non-veg" id="non-veg" className="peer sr-only" disabled={loading} />
                  <Label
                    htmlFor="non-veg"
                    className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-white p-4 hover:bg-gray-50 hover:border-red-300 peer-data-[state=checked]:border-red-500 peer-data-[state=checked]:bg-red-50 cursor-pointer transition-all"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded-full bg-red-500"></div>
                      <span className="font-medium text-red-700">Non-Vegetarian</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-center">Contains meat or fish</p>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="quantity" className="text-gray-700 font-semibold">
                Quantity (Number of servings) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                value={formData.quantity}
                onChange={handleChange}
                placeholder="e.g., 50"
                min="1"
                required
                disabled={loading}
                className="focus:ring-green-500 focus:border-green-500"
              />
              <p className="text-xs text-gray-500">
                How many people can this meal serve? Minimum 1 serving.
              </p>
            </div>

            {/* Freshness Time */}
            <div className="space-y-2">
              <Label htmlFor="freshnessTime" className="text-gray-700 font-semibold">
                Freshness Time <span className="text-red-500">*</span>
              </Label>
              <Input
                id="freshnessTime"
                name="freshnessTime"
                value={formData.freshnessTime}
                onChange={handleChange}
                placeholder="e.g., 4 hours, till 8 PM, until tomorrow 10 AM"
                required
                disabled={loading}
                className="focus:ring-green-500 focus:border-green-500"
              />
              <p className="text-xs text-gray-500">
                When will this food stay fresh? Be specific so receivers know when to collect.
              </p>
            </div>

            {/* Optional Note */}
            <div className="space-y-2">
              <Label htmlFor="note" className="text-gray-700 font-semibold">
                Additional Notes (Optional)
              </Label>
              <Textarea
                id="note"
                name="note"
                value={formData.note}
                onChange={handleChange}
                placeholder="Any additional information about the food, packaging, allergens, special instructions, etc..."
                rows={3}
                disabled={loading}
                className="focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/donor/dashboard')}
                className="flex-1 sm:flex-none sm:w-32"
                disabled={loading}
              >
                Cancel
              </Button>
              
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Posting...
                  </span>
                ) : (
                  'Post Food'
                )}
              </Button>
            </div>

            {/* Tips Section */}
            <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <h4 className="font-semibold text-blue-800 mb-2">💡 Tips for a great food post:</h4>
              <ul className="text-sm text-blue-700 space-y-1 list-disc pl-5">
                <li>Be specific about food type and quantity</li>
                <li>Mention any allergens (nuts, gluten, dairy, etc.)</li>
                <li>Provide clear pickup instructions in the notes</li>
                <li>Update or remove the post once food is collected</li>
                <li>Ensure food safety standards are maintained</li>
              </ul>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default DonorPostFood