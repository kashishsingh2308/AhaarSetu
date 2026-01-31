import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Heart, Users, Building2, ArrowRight } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/10 blur-3xl animate-pulse-slow" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-secondary/20 blur-3xl animate-pulse-slow" />
        </div>

        <div className="relative container mx-auto px-4 py-12 lg:py-20">
          {/* Logo & Brand */}
          <div className="text-center mb-12 animate-fade-in">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl gradient-hero shadow-glow mb-6">
              <Heart className="w-10 h-10 text-primary-foreground" fill="currentColor" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4">
              Ahaar<span className="text-primary">Setu</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
              Connecting surplus food with those who need it. 
              <span className="block mt-2 font-medium text-foreground">
                Zero waste. Full hearts.
              </span>
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-12 animate-slide-up">
            <div className="text-center p-4 rounded-xl bg-card shadow-soft">
              <div className="text-2xl md:text-3xl font-bold text-primary">500+</div>
              <div className="text-xs md:text-sm text-muted-foreground">Meals Rescued</div>
            </div>
            <div className="text-center p-4 rounded-xl bg-card shadow-soft">
              <div className="text-2xl md:text-3xl font-bold text-secondary">50+</div>
              <div className="text-xs md:text-sm text-muted-foreground">Active Donors</div>
            </div>
            <div className="text-center p-4 rounded-xl bg-card shadow-soft">
              <div className="text-2xl md:text-3xl font-bold text-accent">100+</div>
              <div className="text-xs md:text-sm text-muted-foreground">Receivers</div>
            </div>
          </div>

          {/* Role Selection Cards */}
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto animate-slide-up">
            {/* Donor Card */}
            <div className="group relative overflow-hidden rounded-2xl bg-card p-8 shadow-elevated transition-all duration-500 hover:shadow-glow hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-40 h-40 gradient-donor opacity-10 rounded-full -translate-y-1/2 translate-x-1/2 transition-transform group-hover:scale-150" />
              
              <div className="relative">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl gradient-donor shadow-soft mb-6">
                  <Building2 className="w-7 h-7 text-primary-foreground" />
                </div>
                
                <h2 className="text-2xl font-bold text-foreground mb-3">I'm a Donor</h2>
                <p className="text-muted-foreground mb-6">
                  Hotels, hostels, events — share your surplus food and make a difference in your community.
                </p>
                
                <Button 
                  variant="donor" 
                  size="lg" 
                  className="w-full group/btn"
                  onClick={() => navigate('/donor/login')}
                >
                  Login as Donor
                  <ArrowRight className="w-5 h-5 transition-transform group-hover/btn:translate-x-1" />
                </Button>
              </div>
            </div>

            {/* Receiver Card */}
            <div className="group relative overflow-hidden rounded-2xl bg-card p-8 shadow-elevated transition-all duration-500 hover:shadow-glow hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-40 h-40 gradient-receiver opacity-10 rounded-full -translate-y-1/2 translate-x-1/2 transition-transform group-hover:scale-150" />
              
              <div className="relative">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl gradient-receiver shadow-soft mb-6">
                  <Users className="w-7 h-7 text-accent-foreground" />
                </div>
                
                <h2 className="text-2xl font-bold text-foreground mb-3">I'm a Receiver</h2>
                <p className="text-muted-foreground mb-6">
                  Individuals or organizations — find and book available food near you with just a tap.
                </p>
                
                <Button 
                  variant="receiver" 
                  size="lg" 
                  className="w-full group/btn"
                  onClick={() => navigate('/receiver/login')}
                >
                  Login as Receiver
                  <ArrowRight className="w-5 h-5 transition-transform group-hover/btn:translate-x-1" />
                </Button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-16 animate-fade-in">
            <p className="text-sm text-muted-foreground">
              Together, we can reduce food waste and feed more people.
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <span className="inline-block w-2 h-2 rounded-full bg-veg" />
              <span className="text-xs text-muted-foreground">Powered by community kindness</span>
              <span className="inline-block w-2 h-2 rounded-full bg-secondary" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
