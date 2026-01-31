import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FoodType } from '@/types';
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
} from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  LogOut, 
  User, 
  Clock, 
  MapPin, 
  Utensils, 
  Check, 
  X, 
  Loader2, 
  Copy, 
  Key, 
  RefreshCcw,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

const DonorDashboard = () => {
  const navigate = useNavigate();
  const { donorProfile, logout } = useAuth();
  const { toast } = useToast();

  const [showPostModal, setShowPostModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [selectedToken, setSelectedToken] = useState<string>('');
  const [selectedBookingInfo, setSelectedBookingInfo] = useState<any>(null);
  
  const [dbPosts, setDbPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingBookings, setPendingBookings] = useState<any[]>([]);
  const [acceptedBookings, setAcceptedBookings] = useState<any[]>([]);
  const [copiedToken, setCopiedToken] = useState<string>('');

  const [postForm, setPostForm] = useState({
    foodName: '',
    foodType: 'veg' as FoodType,
    quantity: '',
    freshTill: '',
  });

  // Fetch donor's food posts
  const fetchMyPosts = useCallback(async () => {
    try {
      setLoading(true);
      
      const userId = donorProfile?.id;
      if (!userId) return;

      const { data, error } = await supabase
        .from('food_posts')
        .select('*')
        .eq('donor_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setDbPosts(data || []);
      
    } catch (error: any) {
      console.error('Fetch error:', error.message);
      toast({
        title: 'Sync Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [donorProfile, toast]);

  // Fetch ALL booking requests (pending and accepted)
  const fetchAllBookings = useCallback(async () => {
    try {
      const userId = donorProfile?.id;
      if (!userId) return;

      // Fetch all bookings for this donor
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('donor_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Query error:', error);
        return;
      }

      // Get food details for each booking
      const bookingsWithFoodDetails = await Promise.all(
        (data || []).map(async (booking) => {
          try {
            const { data: foodData } = await supabase
              .from('food_posts')
              .select('food_name, organization_name, available_quantity')
              .eq('id', booking.food_post_id)
              .single();
            
            return {
              ...booking,
              food_posts: foodData || null
            };
          } catch (error) {
            return booking;
          }
        })
      );
      
      // Separate into pending and accepted
      const pending = bookingsWithFoodDetails.filter(b => b.status === 'pending');
      const accepted = bookingsWithFoodDetails.filter(b => b.status === 'accepted');
      
      setPendingBookings(pending);
      setAcceptedBookings(accepted);
      
    } catch (error: any) {
      console.error('Error fetching bookings:', error);
    }
  }, [donorProfile]);

  // Update food post quantity locally
  const updateLocalFoodQuantity = useCallback((foodPostId: string, newQuantity: number) => {
    setDbPosts(prev => prev.map(post => 
      post.id === foodPostId 
        ? { 
            ...post, 
            available_quantity: newQuantity,
            is_active: newQuantity > 0 
          }
        : post
    ));
  }, []);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!donorProfile?.id) return;

    fetchMyPosts();
    fetchAllBookings();

    // Real-time subscription for food posts
    const foodPostsChannel = supabase
      .channel(`donor-food-posts-global`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'food_posts'
        },
        (payload) => {
          if ((payload.new as any)?.donor_id === donorProfile.id) {
            if (payload.eventType === 'UPDATE') {
              setDbPosts(prev => {
                const index = prev.findIndex(post => post.id === payload.new.id);
                if (index !== -1) {
                  const updated = [...prev];
                  updated[index] = {
                    ...updated[index],
                    available_quantity: payload.new.available_quantity,
                    is_active: payload.new.is_active
                  };
                  return updated;
                }
                return prev;
              });
            } else if (payload.eventType === 'INSERT') {
              fetchMyPosts();
            }
          }
        }
      )
      .subscribe();

    // Real-time subscription for bookings
    const bookingsChannel = supabase
      .channel(`donor-bookings-${donorProfile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `donor_id=eq.${donorProfile.id}`
        },
        (payload) => {
          console.log('Booking update received:', payload);
          
          if (payload.eventType === 'UPDATE') {
            // Refresh all bookings when any booking is updated
            fetchAllBookings();
          } else if (payload.eventType === 'INSERT') {
            fetchAllBookings();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(foodPostsChannel);
      supabase.removeChannel(bookingsChannel);
    };
  }, [donorProfile, fetchMyPosts, fetchAllBookings]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handlePostFood = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = donorProfile?.id;

    if (!userId) {
      toast({ title: "Error", description: "Not authenticated", variant: "destructive"});
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('food_posts')
        .insert([{
            donor_id: userId,
            food_name: postForm.foodName,
            food_type: postForm.foodType === 'veg' ? 'vegetarian' : 'non-vegetarian',
            quantity: parseInt(postForm.quantity),
            available_quantity: parseInt(postForm.quantity),
            freshness_time: postForm.freshTill,
            organization_name: donorProfile?.organizationName || 'Donor',
            location: donorProfile?.location || 'Unknown',
            is_active: true
        }]);

      if (error) throw error;

      toast({ title: 'Success', description: 'Food posted successfully!' });
      setPostForm({ foodName: '', foodType: 'veg', quantity: '', freshTill: '' });
      setShowPostModal(false);

    } catch (error: any) {
      toast({ title: 'Post Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle accepting a booking request
  const handleAccept = async (bookingId: string) => {
    try {
      setIsSubmitting(true);
      
      // 1. Get the booking details
      const { data: bookingData, error: fetchError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (fetchError) throw fetchError;

      const foodPostId = bookingData.food_post_id;
      const bookedQuantity = parseInt(bookingData.quantity);
      
      // 2. Get the current food quantity
      const { data: foodData, error: foodError } = await supabase
        .from('food_posts')
        .select('*')
        .eq('id', foodPostId)
        .single();

      if (foodError || !foodData) throw new Error('Food not found');

      // 3. Validate quantity
      const currentQty = parseInt(foodData.available_quantity);
      if (bookedQuantity > currentQty) {
        throw new Error(`Requested quantity (${bookedQuantity}) exceeds available (${currentQty})`);
      }
      
      const newQty = currentQty - bookedQuantity;
      
      // 4. Update local UI (optimistic update)
      updateLocalFoodQuantity(foodPostId, newQty);
      
      // 5. Generate token
      const token = `TK-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      
      // 6. Update BOTH in database
      // A. Update food quantity first
      const { error: foodUpdateError } = await supabase
        .from('food_posts')
        .update({ 
          available_quantity: newQty,
          is_active: newQty > 0
        })
        .eq('id', foodPostId);

      if (foodUpdateError) throw foodUpdateError;

      // B. Update booking status
      const { error: bookingUpdateError } = await supabase
        .from('bookings')
        .update({ 
          status: 'accepted',
          token: token,
          token_generated_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (bookingUpdateError) {
        // Rollback local UI if booking update fails
        updateLocalFoodQuantity(foodPostId, currentQty);
        throw bookingUpdateError;
      }

      // 7. Store booking info and show token modal
      const bookingInfo = {
        token,
        receiverName: bookingData.receiver_name,
        foodName: foodData.food_name,
        quantity: bookingData.quantity,
        bookingId: bookingData.id
      };
      
      setSelectedToken(token);
      setSelectedBookingInfo(bookingInfo);
      setShowTokenModal(true);
      
      // 8. Show success toast
      toast({ 
        title: '✅ Request Accepted!', 
        description: `Token generated and quantity updated.`,
      });

    } catch (error: any) {
      toast({ 
        title: 'Failed to Accept', 
        description: error.message, 
        variant: 'destructive' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle rejecting a booking request
  const handleReject = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: 'rejected',
          token: null,
          token_generated_at: null
        })
        .eq('id', bookingId);

      if (error) throw error;

      toast({ title: 'Booking Rejected', description: 'Request declined.' });

    } catch (error: any) {
      toast({ 
        title: 'Reject Failed', 
        description: error.message, 
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
      description: 'Token copied to clipboard.',
    });
    
    // Reset copied state after 2 seconds
    setTimeout(() => {
      setCopiedToken('');
    }, 2000);
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
          <h1 className="text-xl font-bold text-foreground">Ahaar<span className="text-primary">Setu</span></h1>
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                fetchMyPosts();
                fetchAllBookings();
                toast({title: "Refreshed", description: "Data refreshed"});
              }}
            >
              <RefreshCcw className="w-4 h-4 mr-2" /> Refresh
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-10 h-10 rounded-full gradient-donor flex items-center justify-center text-primary-foreground font-bold shadow-soft">
                  {donorProfile?.organizationName?.charAt(0) || 'D'}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2">
                  <p className="font-semibold text-foreground">{donorProfile?.organizationName}</p>
                  <p className="text-sm text-muted-foreground">@{donorProfile?.username}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-8">
        {/* Post Food Button */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Post Surplus Food</h2>
            <Button variant="donor" onClick={() => setShowPostModal(true)}>
              <Plus className="w-4 h-4 mr-2" /> Post Food
            </Button>
          </div>
        </section>

        {/* My Food Listings */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">My Food Listings ({dbPosts.length})</h2>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : dbPosts.length === 0 ? (
            <div className="bg-card rounded-2xl shadow-soft p-8 text-center">
              <Utensils className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No food listings found.</p>
              <p className="text-sm text-muted-foreground mt-2">Post some food to get started!</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {dbPosts.map((food) => (
                <div key={food.id} className="bg-card rounded-2xl shadow-soft p-5 border border-transparent hover:border-green-100 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${food.food_type === 'vegetarian' || food.food_type === 'veg' ? 'bg-green-500' : 'bg-red-500'}`} />
                      <h3 className="font-semibold text-foreground">{food.food_name}</h3>
                    </div>
                    <span className={`text-sm font-medium px-3 py-1 rounded-full ${food.available_quantity > 0 ? 'text-primary bg-primary/10' : 'text-red-600 bg-red-50'}`}>
                      {food.available_quantity}/{food.quantity} servings
                      {food.available_quantity === 0 && ' (Out of stock)'}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2"><Clock className="w-4 h-4" /><span>Fresh for {food.freshness_time}</span></div>
                    <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /><span>{food.location}</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* PENDING Booking Requests */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Pending Booking Requests ({pendingBookings.length})
            </h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchAllBookings}>
                <RefreshCcw className="w-4 h-4 mr-2" /> Refresh
              </Button>
            </div>
          </div>
          
          {pendingBookings.length === 0 ? (
            <div className="bg-card rounded-2xl shadow-soft p-8 text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No pending booking requests.</p>
              <p className="text-sm text-muted-foreground mt-2">
                When receivers book your food, requests will appear here.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {pendingBookings.map((request) => {
                const foodPost = dbPosts.find(fp => fp.id === request.food_post_id);
                const availableQty = foodPost?.available_quantity || request.food_posts?.available_quantity || 0;
                const foodName = foodPost?.food_name || request.food_posts?.food_name || 'Food Item';
                
                return (
                  <div key={request.id} className="bg-card rounded-2xl shadow-soft p-6 border border-yellow-200">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Key className="w-4 h-4 text-yellow-600" />
                          <span className="text-xs text-muted-foreground font-mono">
                            Request #{request.id.substring(0, 8)}
                          </span>
                        </div>
                        
                        <h3 className="font-bold text-lg">{foodName}</h3>
                        
                        <div className="space-y-2 text-sm mt-3">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-primary" />
                            <span>
                              <strong>Receiver:</strong> {request.receiver_name || 'Unknown Receiver'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Utensils className="w-4 h-4 text-primary" />
                            <span>
                              <strong>Quantity:</strong> {request.quantity} servings
                              <span className={`ml-2 ${availableQty < request.quantity ? 'text-red-600' : 'text-muted-foreground'}`}>
                                (Available: {availableQty})
                                {availableQty < request.quantity && ' - Insufficient!'}
                              </span>
                            </span>
                          </div>
                          {request.note && (
                            <div className="bg-muted/30 p-2 rounded-lg">
                              <p className="text-xs">
                                <span className="font-medium">Note:</span> {request.note}
                              </p>
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            Requested: {formatDate(request.created_at)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 ml-4">
                        <Button 
                          size="sm" 
                          onClick={() => handleAccept(request.id)}
                          disabled={isSubmitting || availableQty < request.quantity}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="w-4 h-4 mr-2" /> Accept
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleReject(request.id)}
                          disabled={isSubmitting}
                        >
                          <X className="w-4 h-4 mr-2" /> Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ACCEPTED Booking Requests (Automatically appears after acceptance) */}
        {acceptedBookings.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                ✅ Accepted Requests ({acceptedBookings.length})
              </h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={fetchAllBookings}>
                  <RefreshCcw className="w-4 h-4 mr-2" /> Refresh
                </Button>
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              {acceptedBookings.map((request) => {
                const foodPost = dbPosts.find(fp => fp.id === request.food_post_id);
                const foodName = foodPost?.food_name || request.food_posts?.food_name || 'Food Item';
                
                return (
                  <div key={request.id} className="bg-card rounded-2xl shadow-soft p-6 border border-green-200">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-xs text-muted-foreground font-mono">
                              Accepted #{request.id.substring(0, 8)}
                            </span>
                          </div>
                          <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">
                            ACCEPTED
                          </span>
                        </div>
                        
                        <h3 className="font-bold text-lg mb-3">{foodName}</h3>
                        
                        <div className="space-y-3">
                          {/* Booking Details */}
                          <div className="bg-green-50 rounded-lg p-4">
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-green-600" />
                                <span>
                                  <strong>Receiver:</strong> {request.receiver_name || 'Unknown Receiver'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Utensils className="w-4 h-4 text-green-600" />
                                <span>
                                  <strong>Quantity:</strong> {request.quantity} servings
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Accepted: {request.token_generated_at ? formatDate(request.token_generated_at) : formatDate(request.updated_at || request.created_at)}
                              </div>
                            </div>
                          </div>
                          
                          {/* Token Display */}
                          {request.token && (
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
                                <p>✅ <strong>Same token as receiver</strong> - Use for verification during pickup</p>
                                <p>📱 Token generated: {request.token_generated_at ? formatDate(request.token_generated_at) : 'Recently'}</p>
                                <p>🔐 Share this token only with the receiver</p>
                              </div>
                            </div>
                          )}
                          
                          {request.note && (
                            <div className="bg-muted/30 p-3 rounded-lg">
                              <p className="text-sm">
                                <span className="font-medium">Receiver's note:</span> {request.note}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* Post Food Modal */}
      <Dialog open={showPostModal} onOpenChange={setShowPostModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Post Surplus Food</DialogTitle></DialogHeader>
          <form onSubmit={handlePostFood} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="foodName">Food Name</Label>
              <Input id="foodName" value={postForm.foodName} onChange={(e) => setPostForm({ ...postForm, foodName: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <RadioGroup value={postForm.foodType} onValueChange={(v: FoodType) => setPostForm({...postForm, foodType: v})} className="flex gap-4">
                <div className="flex items-center space-x-2"><RadioGroupItem value="veg" id="v" /><Label htmlFor="v">Veg</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="non-veg" id="nv" /><Label htmlFor="nv">Non-Veg</Label></div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label htmlFor="q">Quantity</Label>
              <Input id="q" type="number" value={postForm.quantity} onChange={(e) => setPostForm({ ...postForm, quantity: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f">Fresh For</Label>
              <Input id="f" value={postForm.freshTill} onChange={(e) => setPostForm({ ...postForm, freshTill: e.target.value })} placeholder="e.g., 2 hours, tomorrow" required />
            </div>
            <Button type="submit" variant="donor" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Posting...' : 'Post Food'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Token Display Modal (Optional - can be removed if not needed) */}
      <Dialog open={showTokenModal} onOpenChange={setShowTokenModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-green-600" />
              Booking Token Generated
            </DialogTitle>
            <DialogDescription>
              Share this token with the receiver for verification
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {selectedBookingInfo && (
              <div className="bg-green-50 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-green-700 mb-2">Booking Details:</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Food:</strong> {selectedBookingInfo.foodName}</p>
                  <p><strong>Receiver:</strong> {selectedBookingInfo.receiverName}</p>
                  <p><strong>Quantity:</strong> {selectedBookingInfo.quantity} servings</p>
                </div>
              </div>
            )}
            
            <div className="text-center">
              <div className="text-4xl font-bold tracking-wider font-mono text-green-600 bg-green-50 p-6 rounded-2xl border border-green-200">
                {selectedToken}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Both you and the receiver will use this same token
              </p>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800 font-medium">Important:</p>
              <ul className="text-xs text-yellow-700 mt-2 space-y-1 list-disc list-inside">
                <li>Share this token only with the receiver</li>
                <li>Use for verification during pickup</li>
                <li>Token is valid for 24 hours</li>
              </ul>
            </div>
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => copyTokenToClipboard(selectedToken)}
              className="flex-1"
            >
              <Copy className="w-4 h-4 mr-2" /> Copy Token
            </Button>
            <Button 
              onClick={() => setShowTokenModal(false)}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DonorDashboard;