// src/contexts/FoodContext.tsx
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { FoodPost, BookingRequest, BookingStatus, ReceiverType } from '@/types';
import { supabase } from '@/lib/supabase';

interface FoodContextType {
  foodPosts: FoodPost[];
  bookingRequests: BookingRequest[];
  isLoading: boolean;
  addFoodPost: (post: Omit<FoodPost, 'id' | 'postedAt'>) => Promise<void>;
  removeFoodPost: (id: string) => Promise<void>;
  updateFoodQuantity: (id: string, quantity: number) => Promise<void>;
  addBookingRequest: (request: Omit<BookingRequest, 'id' | 'status' | 'createdAt'>) => Promise<void>;
  updateBookingStatus: (id: string, status: BookingStatus, token?: string) => Promise<void>;
  getBookingsForDonor: (donorId: string) => BookingRequest[];
  getBookingsForReceiver: (receiverId: string) => BookingRequest[];
  refreshFoodPosts: () => Promise<void>;
  refreshBookings: () => Promise<void>;
}

const FoodContext = createContext<FoodContextType | undefined>(undefined);

export const FoodProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [foodPosts, setFoodPosts] = useState<FoodPost[]>([]);
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshFoodPosts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('food_posts')
        .select('*')
        .eq('is_active', true)
        .order('posted_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const mappedData: FoodPost[] = data.map(item => ({
          id: item.id,
          donorId: item.donor_id,
          donorName: item.organization_name,
          location: item.location,
          foodName: item.food_name,
          foodType: item.food_type === 'vegetarian' ? 'veg' : 'non-veg',
          quantity: item.available_quantity,
          freshTill: item.freshness_time,
          postedAt: item.posted_at
        }));
        setFoodPosts(mappedData);
      }
    } catch (error) {
      console.error('Error fetching food posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshBookings = async () => {
    try {
      // Simple query without joins
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const mappedBookings: BookingRequest[] = (data || []).map(item => ({
        id: item.id,
        foodPostId: item.food_post_id,
        receiverId: item.receiver_id,
        receiverName: item.receiver_name,
        receiverType: item.receiver_type as ReceiverType,
        requestedQuantity: item.quantity,
        note: item.note,
        status: item.status as BookingStatus,
        token: item.token,
        createdAt: item.created_at
      }));
      
      setBookingRequests(mappedBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  // Fetch initial data
  useEffect(() => {
    const init = async () => {
      await Promise.all([refreshFoodPosts(), refreshBookings()]);
    };
    init();
  }, []);

  const addFoodPost = async (post: Omit<FoodPost, 'id' | 'postedAt'>) => {
    const storedUser = localStorage.getItem('ahaarsetu_user');
    let donorId = post.donorId;
    let donorName = post.donorName;
    let location = post.location;

    if (storedUser) {
      const userData = JSON.parse(storedUser);
      if (userData.role === 'donor') {
        donorId = userData.profile.id;
        donorName = userData.profile.organizationName;
        location = userData.profile.location;
      }
    }

    const { error } = await supabase
      .from('food_posts')
      .insert([{
        donor_id: donorId,
        food_name: post.foodName,
        food_type: post.foodType === 'veg' ? 'vegetarian' : 'non-vegetarian',
        quantity: post.quantity,
        available_quantity: post.quantity,
        freshness_time: post.freshTill,
        organization_name: donorName,
        location: location,
        is_active: true
      }]);

    if (error) {
      console.error('Error adding food post:', error);
      throw error;
    }
  };

  const removeFoodPost = async (id: string) => {
    const { error } = await supabase
      .from('food_posts')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Error removing food post:', error);
      throw error;
    }
  };

  const updateFoodQuantity = async (id: string, quantity: number) => {
    const { error } = await supabase
      .from('food_posts')
      .update({ 
        available_quantity: quantity,
        is_active: quantity > 0
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating quantity:', error);
      throw error;
    }
  };

  const addBookingRequest = async (request: Omit<BookingRequest, 'id' | 'status' | 'createdAt'>) => {
    const { error } = await supabase
      .from('bookings')
      .insert([{
        food_post_id: request.foodPostId,
        receiver_id: request.receiverId,
        receiver_name: request.receiverName,
        quantity: request.requestedQuantity,
        note: request.note,
        status: 'pending'
      }]);

    if (error) {
      console.error('Booking failed:', error);
      throw error;
    }
  };

  const updateBookingStatus = async (id: string, status: BookingStatus) => {
    const updateData: any = { status };
    if (status === 'accepted') {
      updateData.token = `TK-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    }

    const { error } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Error updating booking status:', error);
      throw error;
    }
  };

  const getBookingsForDonor = (donorId: string) => {
    const donorFoodIds = foodPosts
      .filter(f => f.donorId === donorId)
      .map(f => f.id);
    return bookingRequests.filter(r => donorFoodIds.includes(r.foodPostId));
  };

  const getBookingsForReceiver = (receiverId: string) => {
    return bookingRequests.filter(r => r.receiverId === receiverId);
  };

  return (
    <FoodContext.Provider
      value={{
        foodPosts,
        bookingRequests,
        isLoading,
        addFoodPost,
        removeFoodPost,
        updateFoodQuantity,
        addBookingRequest,
        updateBookingStatus,
        getBookingsForDonor,
        getBookingsForReceiver,
        refreshFoodPosts,
        refreshBookings
      }}
    >
      {children}
    </FoodContext.Provider>
  );
};

export const useFood = () => {
  const context = useContext(FoodContext);
  if (context === undefined) {
    throw new Error('useFood must be used within a FoodProvider');
  }
  return context;
};