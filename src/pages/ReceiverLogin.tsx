import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

const ReceiverLogin = () => {
  const navigate = useNavigate();
  const { loginReceiver } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. Query the 'receivers' table directly for the username and password
      const { data, error } = await supabase
        .from('receivers')
        .select('*')
        .eq('username', username.trim())
        .eq('password', password) // Matching the plain text password from your signup logic
        .single();

      if (error || !data) {
        throw new Error('Invalid username or password');
      }

      // 2. Call loginReceiver with TWO STRING PARAMETERS (username, password)
      await loginReceiver(username.trim(), password);

      toast({
        title: 'Welcome back!',
        description: `Logged in as ${data.username}`,
      });

      // 3. Redirect to dashboard
      navigate('/receiver/dashboard');
      
    } catch (error: any) {
      toast({
        title: 'Login Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="p-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-slide-up">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-receiver shadow-glow mb-4">
              <Users className="w-8 h-8 text-accent-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Receiver Login</h1>
            <p className="text-muted-foreground mt-2">Sign in with your username</p>
          </div>

          <div className="bg-card rounded-2xl shadow-elevated p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-12"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12"
                  required
                />
              </div>

              <Button 
                type="submit" 
                variant="receiver" 
                size="lg" 
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Verifying...' : 'Login'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Link 
                  to="/receiver/signup" 
                  className="text-secondary font-medium hover:underline"
                >
                  Create Account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiverLogin;