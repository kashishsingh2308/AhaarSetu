// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { UserRole, DonorProfile, ReceiverProfile, ReceiverType } from '@/types';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: UserRole | null;
  donorProfile: DonorProfile | null;
  receiverProfile: ReceiverProfile | null;
  loginDonor: (username: string, password: string) => Promise<void>;
  loginReceiver: (username: string, password: string) => Promise<void>;
  logout: () => void;
  updateDonorProfile: (profile: DonorProfile) => void;
  updateReceiverProfile: (profile: ReceiverProfile) => void;
  isLoading: boolean;
  registerDonor: (profile: DonorProfile & { password: string }) => Promise<void>;
  registerReceiver: (profile: ReceiverProfile & { password: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [donorProfile, setDonorProfile] = useState<DonorProfile | null>(null);
  const [receiverProfile, setReceiverProfile] = useState<ReceiverProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedUser = localStorage.getItem('ahaarsetu_user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          // Optional: Verify with Supabase here if using real Auth sessions
          if (userData.role === 'donor') {
            setDonorProfile(userData.profile);
            setUserRole('donor');
          } else if (userData.role === 'receiver') {
            setReceiverProfile(userData.profile);
            setUserRole('receiver');
          }
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  const loginDonor = async (username: string, password: string) => {
    console.log('🔐 Attempting donor login:', username);
    
    const { data, error } = await supabase
      .from('donors')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single();

    if (error || !data) {
      throw new Error('Invalid username or password');
    }

    const profile: DonorProfile = {
      id: data.id, // This will now be a proper UUID from the DB
      username: data.username,
      organizationName: data.organization_name,
      organizationType: data.organization_type.toUpperCase() as any,
      location: data.location,
      phoneNumber: data.phone_number
    };

    localStorage.setItem('ahaarsetu_user', JSON.stringify({
      role: 'donor',
      profile,
      timestamp: new Date().toISOString()
    }));

    setDonorProfile(profile);
    setUserRole('donor');
    setIsAuthenticated(true);
  };

  const loginReceiver = async (username: string, password: string) => {
    const { data, error } = await supabase
      .from('receivers')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single();

    if (error || !data) {
      throw new Error('Invalid username or password');
    }

    const profile: ReceiverProfile = {
      id: data.id,
      username: data.username,
      receiverType: data.receiver_type as ReceiverType,
      name: data.name,
      organizationName: data.organization_name,
      location: data.location
    };

    localStorage.setItem('ahaarsetu_user', JSON.stringify({
      role: 'receiver',
      profile,
      timestamp: new Date().toISOString()
    }));

    setReceiverProfile(profile);
    setUserRole('receiver');
    setIsAuthenticated(true);
  };

  const registerDonor = async (profileData: DonorProfile & { password: string }) => {
    // Note: Do NOT manually generate an 'id'. 
    // Let Supabase generate the UUID automatically on insert.
    const { data, error } = await supabase
      .from('donors')
      .insert([{
        organization_name: profileData.organizationName,
        organization_type: profileData.organizationType.toLowerCase(),
        location: profileData.location,
        phone_number: profileData.phoneNumber,
        username: profileData.username,
        password: profileData.password
      }])
      .select()
      .single();

    if (error) throw error;
    await loginDonor(profileData.username, profileData.password);
  };

  const registerReceiver = async (profileData: ReceiverProfile & { password: string }) => {
    const { data, error } = await supabase
      .from('receivers')
      .insert([{
        receiver_type: profileData.receiverType,
        name: profileData.name,
        organization_name: profileData.organizationName,
        location: profileData.location,
        username: profileData.username,
        password: profileData.password
      }])
      .select()
      .single();

    if (error) throw error;
    await loginReceiver(profileData.username, profileData.password);
  };

  const logout = () => {
    localStorage.removeItem('ahaarsetu_user');
    setIsAuthenticated(false);
    setUserRole(null);
    setDonorProfile(null);
    setReceiverProfile(null);
  };

  const updateDonorProfile = (profile: DonorProfile) => {
    setDonorProfile(profile);
    const stored = localStorage.getItem('ahaarsetu_user');
    if (stored) {
      const userData = JSON.parse(stored);
      userData.profile = profile;
      localStorage.setItem('ahaarsetu_user', JSON.stringify(userData));
    }
  };

  const updateReceiverProfile = (profile: ReceiverProfile) => {
    setReceiverProfile(profile);
    const stored = localStorage.getItem('ahaarsetu_user');
    if (stored) {
      const userData = JSON.parse(stored);
      userData.profile = profile;
      localStorage.setItem('ahaarsetu_user', JSON.stringify(userData));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userRole,
        donorProfile,
        receiverProfile,
        loginDonor,
        loginReceiver,
        logout,
        updateDonorProfile,
        updateReceiverProfile,
        isLoading,
        registerDonor,
        registerReceiver
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};