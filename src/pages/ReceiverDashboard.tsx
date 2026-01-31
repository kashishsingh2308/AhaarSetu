import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { 
  LogOut, 
  Clock, 
  MapPin, 
  Building2, 
  Loader2, 
  User, 
  Utensils,
  RefreshCcw,
  CheckCircle,
  XCircle,
  Clock3,
  Key,
  Copy,
  Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

const ReceiverDashboard = () => {
  const navigate = useNavigate();
  const { receiverProfile, logout, updateReceiverProfile } = useAuth();
  const { toast } = useToast();

  const [dbFoodPosts, setDbFoodPosts] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFood, setSelectedFood] = useState<any | null>(null);
  const [bookingForm, setBookingForm] = useState({ quantity: '', note: '' });
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    organizationName: '',
    location: '',
  });
  const [copiedToken, setCopiedToken] = useState<string>('');

  // Fetch all active food posts
  const fetchAllFood = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('food_posts')
        .select('*')
        .eq('is_active', true)
        .gt('available_quantity', 0)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Food fetch error:', error);
        throw error;
      }
      setDbFoodPosts(data || []);
    } catch (error: any) {
      console.error("Food Fetch Error:", error);
      toast({ 
        title: 'Error', 
        description: 'Failed to load food listings.', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Fetch receiver's booking requests
  const fetchMyRequests = useCallback(async () => {
    if (!receiverProfile?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('receiver_id', receiverProfile.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Bookings fetch error:', error);
        throw error;
      }
      
      // Get food details for each booking
      const requestsWithFoodDetails = await Promise.all(
        (data || []).map(async (request) => {
          try {
            const { data: foodData } = await supabase
              .from('food_posts')
              .select('food_name, organization_name, location, available_quantity')
              .eq('id', request.food_post_id)
              .single();
            
            return {
              ...request,
              food_posts: foodData || null
            };
          } catch (error) {
            console.log('Error fetching food details for booking:', error);
            return request;
          }
        })
      );
      
      setMyRequests(requestsWithFoodDetails);
      
    } catch (error: any) {
      console.error("Booking Fetch Error:", error);
      toast({
        title: 'Error',
        description: 'Failed to load booking requests',
        variant: 'destructive'
      });
    }
  }, [receiverProfile, toast]);

  // Set up real-time subscriptions
  useEffect(() => {
    // Existing logic for profile and bookings...
    if (receiverProfile) {
      fetchMyRequests();
    }
    fetchAllFood();

    // Real-time subscription for food post updates
    const foodPostsChannel = supabase
      .channel('receiver-food-sync')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'food_posts'
        },
        (payload) => {
          console.log('Syncing food list due to update:', payload);
          fetchAllFood();
        }
      )
      .subscribe();

    // Keep your existing bookings channel
    const bookingsChannel = supabase
      .channel(`receiver-${receiverProfile?.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `receiver_id=eq.${receiverProfile?.id}`
        },
        (payload) => {
          console.log('Booking update received:', payload);
          fetchMyRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(foodPostsChannel);
      supabase.removeChannel(bookingsChannel);
    };
  }, [receiverProfile, fetchAllFood, fetchMyRequests]);

  // Handle booking submission
  const handleBookFood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFood || !receiverProfile) return;

    const quantity = parseInt(bookingForm.quantity);
    
    // Check if requested quantity is valid
    if (quantity <= 0 || quantity > selectedFood.available_quantity) {
      toast({
        title: 'Invalid Quantity',
        description: `Please enter a quantity between 1 and ${selectedFood.available_quantity}`,
        variant: 'destructive'
      });
      return;
    }

    try {
      // Generate a unique booking ID
      const bookingId = `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Create booking in database ONLY
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .insert([{
          id: bookingId,
          food_post_id: selectedFood.id,
          donor_id: selectedFood.donor_id,
          receiver_id: receiverProfile.id,
          receiver_name: receiverProfile.organizationName || receiverProfile.name || receiverProfile.username,
          quantity: quantity,
          note: bookingForm.note,
          status: 'pending',
        }])
        .select()
        .single();

      if (bookingError) {
        console.error('Booking creation error:', bookingError);
        throw bookingError;
      }

      console.log('Booking created successfully:', bookingData);
      
      toast({ 
        title: 'Request Sent Successfully!', 
        description: `Your booking request has been sent to ${selectedFood.organization_name}.`
      });
      
      // Reset form
      setBookingForm({ quantity: '', note: '' });
      setSelectedFood(null);

    } catch (error: any) {
      console.error("Booking Error Details:", error);
      toast({ 
        title: 'Booking Failed', 
        description: error.message || 'Failed to send booking request.', 
        variant: 'destructive' 
      });
    }
  };

  // Cancel a booking request
  const handleCancelBooking = async (bookingId: string) => {
    try {
      const booking = myRequests.find(b => b.id === bookingId);
      if (!booking) throw new Error('Booking not found');

      console.log('Cancelling booking:', bookingId, 'Status:', booking.status);
      
      // Update booking status to cancelled in database
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: 'cancelled',
          token: null,
          token_generated_at: null
        })
        .eq('id', bookingId)
        .eq('receiver_id', receiverProfile?.id);

      if (error) {
        console.error('Booking update error during cancel:', error);
        throw error;
      }

      console.log('Booking cancelled successfully');
      
      toast({ 
        title: 'Booking Cancelled', 
        description: 'Your request has been cancelled.' 
      });

    } catch (error: any) {
      console.error('Cancellation Error Details:', error);
      toast({ 
        title: 'Cancellation Failed', 
        description: error.message || 'Failed to cancel booking.',
        variant: 'destructive' 
      });
    }
  };

  // Copy token to clipboard
  const copyTokenToClipboard = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    toast({
      title: 'Token Copied!',
      description: 'Verification token copied to clipboard.',
    });
    
    // Reset copied state after 2 seconds
    setTimeout(() => {
      setCopiedToken('');
    }, 2000);
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock3 className="w-4 h-4 text-yellow-500" />;
      case 'accepted': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'cancelled': return <XCircle className="w-4 h-4 text-gray-500" />;
      default: return <Clock3 className="w-4 h-4 text-yellow-500" />;
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'accepted': return 'bg-green-50 text-green-700 border-green-200';
      case 'rejected': return 'bg-red-50 text-red-700 border-red-200';
      case 'completed': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'cancelled': return 'bg-gray-50 text-gray-700 border-gray-200';
      default: return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('receivers')
        .update({
          name: profileForm.name,
          organization_name: profileForm.organizationName,
          location: profileForm.location,
        })
        .eq('id', receiverProfile?.id);

      if (error) throw error;
      updateReceiverProfile({ ...receiverProfile!, ...profileForm });
      toast({ title: 'Profile Updated' });
      setEditProfileOpen(false);
    } catch (error: any) {
      toast({ title: 'Update Failed', variant: 'destructive' });
    }
  };

  const getDisplayName = () => {
    return receiverProfile?.organizationName || receiverProfile?.name || receiverProfile?.username || 'User';
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">Ahaar<span className="text-primary">Setu</span></h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden md:inline">
              Welcome, <span className="font-semibold text-foreground">{getDisplayName()}</span>
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                fetchAllFood();
                fetchMyRequests();
                toast({title: "Refreshed", description: "Data refreshed"});
              }}
            >
              <RefreshCcw className="w-4 h-4 mr-2" /> Refresh
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold hover:bg-primary/20 transition-all border border-primary/20 cursor-pointer">
                  {getDisplayName().charAt(0).toUpperCase()}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-2 shadow-xl">
                <div className="px-2 py-3">
                  <p className="text-sm font-bold truncate">{getDisplayName()}</p>
                  <p className="text-xs text-muted-foreground truncate">@{receiverProfile?.username || 'account'}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => setEditProfileOpen(true)} className="cursor-pointer">
                    <User className="w-4 h-4 mr-2" /> Profile Settings
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10 cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-12">
        {/* Available Food Grid */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold">Available Food Donations</h2>
              <p className="text-sm text-muted-foreground">Request food from donors in your community</p>
              <p className="text-xs text-muted-foreground italic">Quantities update in real-time</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchAllFood} disabled={loading} className="rounded-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4 mr-2" />} 
              Refresh
            </Button>
          </div>
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground text-sm">Loading food listings...</p>
            </div>
          ) : dbFoodPosts.length === 0 ? (
            <div className="bg-card rounded-3xl p-16 text-center border border-dashed border-border">
              <Utensils className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">No active food donations available.</p>
              <p className="text-sm text-muted-foreground mt-2">Check back later for new donations.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {dbFoodPosts.map((food) => (
                <div key={food.id} className="bg-card rounded-3xl p-6 border border-border hover:shadow-lg transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{food.food_name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-1 rounded-full ${food.food_type === 'vegetarian' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {food.food_type}
                        </span>
                        <span className="text-xs text-muted-foreground">{food.freshness_time} fresh</span>
                      </div>
                    </div>
                    <span className={`text-sm font-bold px-3 py-1 rounded-full ${food.available_quantity > 0 ? 'text-primary bg-primary/10' : 'text-red-600 bg-red-50'}`}>
                      {food.available_quantity} servings left
                    </span>
                  </div>
                  
                  <div className="space-y-3 text-sm text-muted-foreground mb-6">
                    <div className="flex items-center gap-2.5">
                      <Building2 className="w-4 h-4" /> 
                      {food.organization_name}
                    </div>
                    <div className="flex items-center gap-2.5">
                      <MapPin className="w-4 h-4" /> 
                      {food.location}
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-4 h-4" /> 
                      Posted {new Date(food.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <Button 
                    variant="receiver" 
                    className="w-full rounded-2xl font-bold py-6" 
                    onClick={() => setSelectedFood(food)}
                    disabled={food.available_quantity <= 0}
                  >
                    {food.available_quantity > 0 ? 'Request Food' : 'Out of Stock'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* My Requests Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">My Booking Requests ({myRequests.length})</h2>
            <Button variant="outline" size="sm" onClick={fetchMyRequests} className="rounded-full">
              <RefreshCcw className="w-4 h-4 mr-2" /> Refresh
            </Button>
          </div>
          
          {myRequests.length === 0 ? (
            <div className="bg-card rounded-3xl p-12 text-center border border-border">
              <Clock3 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">No booking requests yet</p>
              <p className="text-sm text-muted-foreground mt-2">Request food from available listings above</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myRequests.map((request) => {
                const foodName = request.food_posts?.food_name || 'Food Item';
                const organization = request.food_posts?.organization_name || '';
                const availableQty = request.food_posts?.available_quantity || 0;
                
                return (
                  <div key={request.id} className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusIcon(request.status)}
                            <span className="text-xs font-mono text-muted-foreground">
                              #{request.id.substring(0, 8)}
                            </span>
                          </div>
                          
                          <h3 className="font-bold text-lg mb-2">{foodName}</h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm">{organization || 'Donor'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm">Quantity: {request.quantity} servings</span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Requested: {formatDate(request.created_at)}
                              </div>
                              {request.status === 'pending' && (
                                <div className="text-xs text-yellow-600">
                                  Note: Quantity will only reduce when donor accepts your request
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center">
                              <span className={`text-sm font-semibold px-3 py-1.5 rounded-full ${getStatusColor(request.status)}`}>
                                {request.status.toUpperCase()}
                              </span>
                            </div>
                          </div>
                          
                          {request.note && (
                            <div className="bg-muted/30 p-3 rounded-lg mb-4">
                              <p className="text-sm">
                                <span className="font-medium">Your note:</span> {request.note}
                              </p>
                            </div>
                          )}
                          
                          {/* TOKEN DISPLAY FOR ACCEPTED REQUESTS */}
                          {request.status === 'accepted' && request.token && (
                            <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-200">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <Key className="w-5 h-5 text-green-600" />
                                  <span className="font-semibold text-green-700">Verification Token</span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-3 text-green-700 hover:bg-green-100"
                                  onClick={() => copyTokenToClipboard(request.token)}
                                >
                                  {copiedToken === request.token ? (
                                    <Check className="w-3 h-3 mr-2" />
                                  ) : (
                                    <Copy className="w-3 h-3 mr-2" />
                                  )}
                                  Copy
                                </Button>
                              </div>
                              
                              <div className="text-center mb-3">
                                <div className="text-2xl font-bold tracking-wider font-mono text-green-700 bg-white p-3 rounded-lg border border-green-300">
                                  {request.token}
                                </div>
                              </div>
                              
                              <div className="text-xs text-green-600 space-y-1">
                                <p>✅ <strong>Same token as donor</strong> - Show this during pickup</p>
                                <p>📱 Token generated: {request.token_generated_at ? formatDate(request.token_generated_at) : 'Recently'}</p>
                                <p>🔐 Use this token for identity verification with the donor</p>
                              </div>
                            </div>
                          )}
                          
                          {/* Action buttons */}
                          <div className="flex gap-3 mt-6">
                            {request.status === 'pending' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => handleCancelBooking(request.id)}
                              >
                                Cancel Request
                              </Button>
                            )}
                            
                            {request.status === 'accepted' && (
                              <div className="flex items-center gap-2 text-green-600">
                                <CheckCircle className="w-4 h-4" />
                                <span className="text-sm font-medium">Contact donor for pickup details</span>
                              </div>
                            )}
                            
                            {request.status === 'rejected' && (
                              <div className="flex items-center gap-2 text-red-600">
                                <XCircle className="w-4 h-4" />
                                <span className="text-sm font-medium">Request was declined by donor</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Booking Dialog */}
      <Dialog open={!!selectedFood} onOpenChange={() => setSelectedFood(null)}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle>Request Food</DialogTitle>
            <DialogDescription>
              Send a booking request to {selectedFood?.organization_name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedFood && (
            <div className="space-y-2 mb-4 p-3 bg-muted/30 rounded-xl">
              <div className="font-bold text-lg">{selectedFood.food_name}</div>
              <div className="text-sm text-muted-foreground">
                Available: <span className="font-semibold text-primary">{selectedFood.available_quantity} servings</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Donor: {selectedFood.organization_name}
              </div>
              <div className="text-sm text-muted-foreground">
                Location: {selectedFood.location}
              </div>
              <div className="text-xs text-muted-foreground italic">
                Note: Quantity will only reduce when donor accepts your request
              </div>
            </div>
          )}
          
          <form onSubmit={handleBookFood} className="space-y-6 pt-2">
            <div className="space-y-3">
              <Label htmlFor="quantity" className="font-bold">How many servings do you need?</Label>
              <Input 
                id="quantity"
                type="number" 
                className="rounded-xl h-12"
                value={bookingForm.quantity} 
                onChange={(e) => setBookingForm({...bookingForm, quantity: e.target.value})} 
                required 
                min="1" 
                max={selectedFood?.available_quantity}
                placeholder="Enter number of servings"
              />
              <p className="text-xs text-muted-foreground">
                Maximum available: {selectedFood?.available_quantity} servings
              </p>
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="note" className="font-bold">Additional Notes (Optional)</Label>
              <Textarea 
                id="note"
                className="rounded-xl resize-none min-h-[100px]"
                value={bookingForm.note} 
                onChange={(e) => setBookingForm({...bookingForm, note: e.target.value})} 
                placeholder="Any special instructions or requirements..."
              />
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setSelectedFood(null)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                variant="receiver" 
                className="rounded-xl font-bold h-12 px-8"
                disabled={!bookingForm.quantity || parseInt(bookingForm.quantity) <= 0 || 
                         parseInt(bookingForm.quantity) > (selectedFood?.available_quantity || 0)}
              >
                Send Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your receiver profile information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                {receiverProfile?.receiverType === 'individual' ? 'Full Name' : 'Organization Name'}
              </Label>
              <Input
                id="name"
                value={profileForm.name}
                onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                placeholder={
                  receiverProfile?.receiverType === 'individual' 
                    ? 'Enter your full name' 
                    : 'Enter organization name'
                }
              />
            </div>
            
            {receiverProfile?.receiverType !== 'individual' && (
              <div className="space-y-2">
                <Label htmlFor="orgName">Organization Name (Optional)</Label>
                <Input
                  id="orgName"
                  value={profileForm.organizationName}
                  onChange={(e) => setProfileForm({...profileForm, organizationName: e.target.value})}
                  placeholder="Enter organization name if different"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={profileForm.location}
                onChange={(e) => setProfileForm({...profileForm, location: e.target.value})}
                placeholder="Enter your location"
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditProfileOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="receiver">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReceiverDashboard;