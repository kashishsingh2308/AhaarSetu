export type UserRole = 'donor' | 'receiver';
export type ReceiverType = 'individual' | 'organization';
export type OrganizationType = 'HOSTEL' | 'HOTEL' | 'EVENT';
export type FoodType = 'veg' | 'non-veg';
export type BookingStatus = 'pending' | 'accepted' | 'rejected';


export interface DonorProfile {
  id: string;
  username: string;
  organizationName: string;
  organizationType: 'HOTEL' | 'HOSTEL' | 'EVENT';
  location: string;
  phoneNumber: string;
}

export interface ReceiverProfile {
  id: string;
  username: string;
  receiverType: ReceiverType;
  name: string;
  organizationName?: string;
  location?: string;
}

export interface FoodPost {
  id: string;
  donorId: string;
  donorName: string;
  location: string;
  foodName: string;
  foodType: FoodType;
  quantity: number;
  freshTill: string;
  postedAt: string;
}

export interface BookingRequest {
  id: string;
  foodPostId: string;
  receiverId: string;
  receiverName: string;
  receiverType: ReceiverType;
  requestedQuantity: number;
  note: string;
  status: BookingStatus;
  token?: string;
  createdAt: string;
}
