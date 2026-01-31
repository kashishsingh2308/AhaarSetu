import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ReceiverType } from '@/types';
import { ArrowLeft, Users, User, Building } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

const ReceiverSignup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [receiverType, setReceiverType] = useState<ReceiverType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    organizationName: '',
    location: '',
    username: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Direct database sync without using Supabase Auth's email requirement
      // We store the plain username and password directly in your table
      const { data, error } = await supabase
        .from('receivers')
        .insert([
          {
            username: formData.username.trim(),
            password: formData.password, // In production, usually hashed via Edge Function
            receiver_type: receiverType,
            name: receiverType === 'individual' ? formData.name : null,
            organization_name: receiverType === 'organization' ? formData.organizationName : null,
            location: formData.location,
          },
        ])
        .select();

      if (error) {
        if (error.code === '23505') throw new Error('Username already taken');
        throw error;
      }

      toast({
        title: 'Account Created Successfully',
        description: `Welcome, ${formData.username}! You can now login.`,
      });
      
      navigate('/receiver/login');
    } catch (error: any) {
      toast({
        title: 'Signup Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!receiverType) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="p-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/receiver/login')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md animate-slide-up text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-receiver shadow-glow mb-4">
              <Users className="w-8 h-8 text-accent-foreground" />
            </div>
            <h1 className="text-2xl font-bold">Create Receiver Account</h1>
            <div className="mt-8 space-y-4">
              <button onClick={() => setReceiverType('individual')} className="w-full bg-card rounded-2xl shadow-elevated p-6 text-left hover:shadow-glow transition-all flex items-center gap-4 group">
                <User className="w-6 h-6 text-secondary" />
                <div>
                  <h3 className="font-semibold text-foreground">Individual</h3>
                  <p className="text-sm text-muted-foreground">Personal account</p>
                </div>
              </button>
              <button onClick={() => setReceiverType('organization')} className="w-full bg-card rounded-2xl shadow-elevated p-6 text-left hover:shadow-glow transition-all flex items-center gap-4 group">
                <Building className="w-6 h-6 text-secondary" />
                <div>
                  <h3 className="font-semibold text-foreground">Organization</h3>
                  <p className="text-sm text-muted-foreground">NGOs or Shelters</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="p-4">
        <Button variant="ghost" size="sm" onClick={() => setReceiverType(null)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      </div>
      <div className="flex-1 flex items-center justify-center p-4 pb-12">
        <div className="w-full max-w-md bg-card rounded-2xl shadow-elevated p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <h2 className="text-xl font-bold text-center mb-6">
              {receiverType === 'individual' ? 'Individual' : 'Organization'} Signup
            </h2>
            
            <div className="space-y-2">
              <Label>Username</Label>
              <Input 
                placeholder="Pick a simple username" 
                value={formData.username} 
                onChange={(e) => setFormData({ ...formData, username: e.target.value })} 
                required 
              />
            </div>

            <div className="space-y-2">
              <Label>{receiverType === 'individual' ? 'Full Name' : 'Organization Name'}</Label>
              <Input 
                placeholder="Enter name" 
                value={receiverType === 'individual' ? formData.name : formData.organizationName} 
                onChange={(e) => setFormData({ ...formData, [receiverType === 'individual' ? 'name' : 'organizationName']: e.target.value })} 
                required 
              />
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <Input 
                placeholder="Your city/area" 
                value={formData.location} 
                onChange={(e) => setFormData({ ...formData, location: e.target.value })} 
                required 
              />
            </div>

            <div className="space-y-2">
              <Label>Password</Label>
              <Input 
                type="password" 
                placeholder="Choose a password" 
                value={formData.password} 
                onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                required 
              />
            </div>

            <Button type="submit" variant="receiver" className="w-full h-12" disabled={isLoading}>
              {isLoading ? 'Creating Account...' : 'Register Now'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReceiverSignup;