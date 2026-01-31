import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OrganizationType, DonorProfile } from '@/types'; // Added DonorProfile import
import { ArrowLeft, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext'; // Added useAuth import

const DonorSignup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { registerDonor } = useAuth(); // Hook into the real registration function
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    organizationName: '',
    organizationType: '' as OrganizationType | '',
    location: '',
    phoneNumber: '',
    username: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // 1. Validation
    if (!formData.organizationType) {
      toast({
        title: 'Error',
        description: 'Please select an organization type.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    try {
      // 2. Real Implementation: Call the Supabase registration logic
      // We pass the data to AuthContext which handles the DB insert
      await registerDonor({
        id: '', // The DB will auto-generate this UUID, so we pass empty or omit
        username: formData.username,
        organizationName: formData.organizationName,
        organizationType: formData.organizationType as OrganizationType,
        location: formData.location,
        phoneNumber: formData.phoneNumber,
        password: formData.password,
      });

      toast({
        title: 'Success!',
        description: 'Your donor account has been created.',
      });

      // 3. Redirect to Dashboard
      // Since registerDonor also logs the user in, we go straight to dashboard
      navigate('/donor/dashboard');
      
    } catch (error: any) {
      console.error("Signup Error:", error);
      toast({
        title: 'Registration Failed',
        description: error.message || 'An error occurred during signup.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="p-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/donor/login')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Login
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 pb-12">
        <div className="w-full max-w-md animate-slide-up">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-donor shadow-glow mb-4">
              <Building2 className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Create Donor Account</h1>
            <p className="text-muted-foreground mt-2">Join AhaarSetu as a food donor</p>
          </div>

          {/* Form */}
          <div className="bg-card rounded-2xl shadow-elevated p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  type="text"
                  placeholder="e.g., Hotel Sunrise"
                  value={formData.organizationName}
                  onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                  className="h-12"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="orgType">Organization Type</Label>
                <Select
                  value={formData.organizationType}
                  onValueChange={(value: OrganizationType) => 
                    setFormData({ ...formData, organizationType: value })
                  }
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HOSTEL">Hostel</SelectItem>
                    <SelectItem value="HOTEL">Hotel / Restaurant</SelectItem>
                    <SelectItem value="EVENT">Event (Wedding, Function)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  type="text"
                  placeholder="e.g., MG Road, Bangalore"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="h-12"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="e.g., 9876543210"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="h-12"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Choose a username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="h-12"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="h-12"
                  required
                />
              </div>

              <Button 
                type="submit" 
                variant="donor" 
                size="lg" 
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link 
                  to="/donor/login" 
                  className="text-primary font-medium hover:underline"
                >
                  Login
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonorSignup;