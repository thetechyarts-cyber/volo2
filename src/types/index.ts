// Database Role Enum
export type UserRole = 'customer' | 'worker' | 'admin';

// Worker Status Enum
export enum WorkerStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  ON_JOB = 'ON_JOB',
  SUSPENDED = 'SUSPENDED',
}

// KYC Status Enum
export enum KycStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

// Booking Type Enum
export enum BookingType {
  INSTANT = 'INSTANT',
  SCHEDULED = 'SCHEDULED',
}

// Payment Mode Enum
export enum PaymentMode {
  ONLINE = 'ONLINE',
  COD = 'COD',
}

// Booking Status Enum
export enum BookingStatus {
  PENDING_ASSIGNMENT = 'PENDING_ASSIGNMENT',
  WORKER_ASSIGNED = 'WORKER_ASSIGNED',
  WORKER_ACCEPTED = 'WORKER_ACCEPTED',
  WORKER_REJECTED = 'WORKER_REJECTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  MANUAL_ASSIGNMENT_REQUIRED = 'MANUAL_ASSIGNMENT_REQUIRED',
}

// Payment Status Enum
export enum PaymentStatus {
  PENDING = 'PENDING',
  AUTHORIZED = 'AUTHORIZED',
  CAPTURED = 'CAPTURED',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

// Settlement Status Enum
export enum SettlementStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PAID = 'PAID',
  FAILED = 'FAILED',
}

// Wallet Transaction Type Enum
export enum WalletTxnType {
  COMMISSION_DEDUCTION = 'COMMISSION_DEDUCTION',
  WALLET_TOPUP = 'WALLET_TOPUP',
  ADJUSTMENT = 'ADJUSTMENT',
  REFUND = 'REFUND',
}

// Notification Type Enum
export enum NotificationType {
  BOOKING_REQUEST = 'BOOKING_REQUEST',
  BOOKING_ACCEPTED = 'BOOKING_ACCEPTED',
  BOOKING_REJECTED = 'BOOKING_REJECTED',
  WORKER_ARRIVING = 'WORKER_ARRIVING',
  JOB_STARTED = 'JOB_STARTED',
  JOB_COMPLETED = 'JOB_COMPLETED',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYOUT_PROCESSED = 'PAYOUT_PROCESSED',
  KYC_APPROVED = 'KYC_APPROVED',
  KYC_REJECTED = 'KYC_REJECTED',
  LOW_WALLET_BALANCE = 'LOW_WALLET_BALANCE',
  MANUAL_ASSIGNMENT_CREATED = 'MANUAL_ASSIGNMENT_CREATED',
  MANUAL_ASSIGNMENT_ACCEPTED = 'MANUAL_ASSIGNMENT_ACCEPTED',
  MANUAL_ASSIGNMENT_REJECTED = 'MANUAL_ASSIGNMENT_REJECTED',
  MANUAL_ASSIGNMENT_REASSIGNED = 'MANUAL_ASSIGNMENT_REASSIGNED',
  MANUAL_ASSIGNMENT_EXPIRED = 'MANUAL_ASSIGNMENT_EXPIRED',
  BOOKING_TRACKING_STARTED = 'BOOKING_TRACKING_STARTED',
  WORKER_NEARBY = 'WORKER_NEARBY',
  ETA_UPDATED = 'ETA_UPDATED',
  WORKER_ARRIVED = 'WORKER_ARRIVED',
  ROUTE_STARTED = 'ROUTE_STARTED',
}

// 1. Users Table Interface
export interface User {
  id: string;
  firebase_uid: string | null;
  role: UserRole;
  full_name: string | null;
  phone: string;
  email: string | null;
  avatar_url: string | null;
  is_active: boolean;
  password_hash: string | null;
  created_at: string;
  updated_at: string;
}

// 2. Workers Table Interface
export interface Worker {
  id: string;
  status: WorkerStatus;
  kyc_status: KycStatus;
  current_lat: number | null;
  current_lng: number | null;
  location_updated_at: string | null;
  aadhar_front_url: string | null;
  aadhar_back_url: string | null;
  pan_url: string | null;
  selfie_url: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  razorpayx_contact_id: string | null;
  razorpayx_fund_account_id: string | null;
  commission_wallet_balance: number;
  rating: number;
  total_jobs: number;
  created_at: string;
  updated_at: string;
}

// 3. Service Categories Table Interface
export interface ServiceCategory {
  id: string;
  name: string;
  icon_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

// 4. Service Items Table Interface
export interface ServiceItem {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  base_price: number;
  estimated_mins: number;
  icon_url: string | null;
  is_active: boolean;
  created_at: string;
}

// 5. Bookings Table Interface
export interface Booking {
  id: string;
  customer_id: string;
  worker_id: string | null;
  service_item_id: string;
  booking_type: BookingType;
  payment_mode: PaymentMode;
  status: BookingStatus;
  address_line: string;
  lat: number;
  lng: number;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  total_amount: number;
  notes: string | null;
  otp: string | null;
  created_at: string;
  updated_at: string;
}

// 6. Payments Table Interface
export interface Payment {
  id: string;
  booking_id: string;
  customer_id: string;
  payment_mode: PaymentMode;
  status: PaymentStatus;
  amount: number;
  admin_commission: number | null;
  worker_share: number | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  paid_at: string | null;
  created_at: string;
}

// 7. Settlement Ledger Table Interface
export interface SettlementLedger {
  id: string;
  worker_id: string;
  payment_id: string;
  amount: number;
  status: SettlementStatus;
  razorpayx_payout_id: string | null;
  razorpayx_transfer_id: string | null;
  payout_initiated_at: string | null;
  payout_completed_at: string | null;
  week_end_date: string | null;
  created_at: string;
}

// 8. Commission Wallet Transactions Table Interface
export interface CommissionWalletTransaction {
  id: string;
  worker_id: string;
  booking_id: string | null;
  type: WalletTxnType;
  amount: number;
  balance_after: number;
  description: string | null;
  created_at: string;
}

// 9. Worker Location Logs Table Interface
export interface WorkerLocationLog {
  id: number;
  worker_id: string;
  booking_id: string | null;
  lat: number;
  lng: number;
  recorded_at: string;
}

// 10. Notifications Table Interface
export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  data: Record<string, any> | null;
  is_read: boolean;
  created_at: string;
}

// 11. Reviews Table Interface
export interface Review {
  id: string;
  booking_id: string;
  customer_id: string;
  worker_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

// Audit Action Enum
export enum AuditAction {
  ADMIN_LOGIN = 'ADMIN_LOGIN',
  WORKER_KYC_APPROVED = 'WORKER_KYC_APPROVED',
  WORKER_KYC_REJECTED = 'WORKER_KYC_REJECTED',
  WORKER_SUSPENDED = 'WORKER_SUSPENDED',
  WORKER_ACTIVATED = 'WORKER_ACTIVATED',
  MANUAL_ASSIGNMENT = 'MANUAL_ASSIGNMENT',
  MANUAL_REASSIGNMENT = 'MANUAL_REASSIGNMENT',
  SERVICE_CREATED = 'SERVICE_CREATED',
  SERVICE_UPDATED = 'SERVICE_UPDATED',
  SERVICE_DELETED = 'SERVICE_DELETED',
  SETTLEMENT_PROCESSED = 'SETTLEMENT_PROCESSED',
  SETTINGS_UPDATED = 'SETTINGS_UPDATED',
  CUSTOMER_DEACTIVATED = 'CUSTOMER_DEACTIVATED',
  CUSTOMER_ACTIVATED = 'CUSTOMER_ACTIVATED',
  BOOKING_CANCELLED = 'BOOKING_CANCELLED',
  BOOKING_REASSIGNED = 'BOOKING_REASSIGNED',
  ASSIGNMENT_STARTED = 'ASSIGNMENT_STARTED',
  ASSIGNMENT_BROADCAST = 'ASSIGNMENT_BROADCAST',
  ASSIGNMENT_ACCEPTED = 'ASSIGNMENT_ACCEPTED',
  ASSIGNMENT_REJECTED = 'ASSIGNMENT_REJECTED',
  ASSIGNMENT_FAILED = 'ASSIGNMENT_FAILED',
  ASSIGNMENT_MANUAL_REQUIRED = 'ASSIGNMENT_MANUAL_REQUIRED',
  MANUAL_ASSIGNMENT_CREATED = 'MANUAL_ASSIGNMENT_CREATED',
  MANUAL_ASSIGNMENT_ACCEPTED = 'MANUAL_ASSIGNMENT_ACCEPTED',
  MANUAL_ASSIGNMENT_REJECTED = 'MANUAL_ASSIGNMENT_REJECTED',
  MANUAL_ASSIGNMENT_REASSIGNED = 'MANUAL_ASSIGNMENT_REASSIGNED',
  MANUAL_ASSIGNMENT_COMPLETED = 'MANUAL_ASSIGNMENT_COMPLETED',
  MANUAL_ASSIGNMENT_EXPIRED = 'MANUAL_ASSIGNMENT_EXPIRED',
  WALLET_CREATED = 'WALLET_CREATED',
  WALLET_DEBIT = 'WALLET_DEBIT',
  WALLET_TOPUP = 'WALLET_TOPUP',
  WALLET_ADJUSTMENT = 'WALLET_ADJUSTMENT',
  COMMISSION_DEDUCTED = 'COMMISSION_DEDUCTED',
  PAYMENT_CREATED = 'PAYMENT_CREATED',
  PAYMENT_CAPTURED = 'PAYMENT_CAPTURED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_REFUNDED = 'PAYMENT_REFUNDED',
  BANK_ACCOUNT_ADDED = 'BANK_ACCOUNT_ADDED',
  BANK_ACCOUNT_UPDATED = 'BANK_ACCOUNT_UPDATED',
  BANK_ACCOUNT_VERIFIED = 'BANK_ACCOUNT_VERIFIED',
  SETTLEMENT_CREATED = 'SETTLEMENT_CREATED',
  SETTLEMENT_BATCH_CREATED = 'SETTLEMENT_BATCH_CREATED',
  SETTLEMENT_READY_FOR_PAYOUT = 'SETTLEMENT_READY_FOR_PAYOUT',
  SETTLEMENT_PAID = 'SETTLEMENT_PAID',
  SETTLEMENT_FAILED = 'SETTLEMENT_FAILED',
  PAYOUT_CREATED = 'PAYOUT_CREATED',
  PAYOUT_READY = 'PAYOUT_READY',
  PAYOUT_QUEUED = 'PAYOUT_QUEUED',
  PAYOUT_PROCESSING = 'PAYOUT_PROCESSING',
  PAYOUT_PAID = 'PAYOUT_PAID',
  PAYOUT_FAILED = 'PAYOUT_FAILED',
  PAYOUT_REVERSED = 'PAYOUT_REVERSED',
  PROVIDER_NOT_CONFIGURED = 'PROVIDER_NOT_CONFIGURED',
  LOCATION_UPDATED = 'LOCATION_UPDATED',
  TRACKING_STARTED = 'TRACKING_STARTED',
  TRACKING_STOPPED = 'TRACKING_STOPPED',
  ROUTE_STARTED = 'ROUTE_STARTED',
  WORKER_ARRIVED = 'WORKER_ARRIVED',
  DEVICE_REGISTERED = 'DEVICE_REGISTERED',
  DEVICE_REMOVED = 'DEVICE_REMOVED',
  PUSH_NOTIFICATION_SENT = 'PUSH_NOTIFICATION_SENT',
  PUSH_NOTIFICATION_FAILED = 'PUSH_NOTIFICATION_FAILED',
}

// 12. Audit Logs Table Interface
export interface AuditLog {
  id: string;
  admin_id: string;
  action: AuditAction;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, any> | null;
  ip_address: string | null;
  created_at: string;
}

// 13. Platform Settings Table Interface
export interface PlatformSettings {
  key: string;
  value: string;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
}

export type AssignmentQueueStatus =
  | 'QUEUED'
  | 'PROCESSING'
  | 'BROADCASTING'
  | 'ASSIGNED'
  | 'FAILED';

export interface AssignmentQueueWorker {
  worker_id:   string;
  distance_km: number;
}

export interface AssignmentQueue {
  id:                    string;
  booking_id:            string;
  current_group:         1 | 2 | 3;
  group_workers:         AssignmentQueueWorker[];
  all_notified_workers:  string[];
  status:                AssignmentQueueStatus;
  attempts:              number;
  group_expires_at:      string | null;
  started_at:            string | null;
  assigned_at:           string | null;
  created_at:            string;
  updated_at:            string;
}

export interface WorkerJobRejection {
  id:         string;
  booking_id: string;
  worker_id:  string;
  reason:     string | null;
  created_at: string;
}

export interface WorkerWallet {
  id: string;
  worker_id: string;
  balance: number;
  minimum_balance: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  worker_id: string;
  booking_id: string | null;
  type: string;
  amount: number | null;
  balance_before: number | null;
  balance_after: number | null;
  description: string | null;
  created_at: string;
}

export interface CommissionRule {
  id: string;
  service_category_id: string | null;
  commission_percent: number;
  is_active: boolean;
  created_at: string;
}

export interface PaymentAttempt {
  id: string;
  payment_id: string;
  status: string | null;
  response: Record<string, any> | null;
  created_at: string;
}

export interface SettlementBatch {
  id: string;
  batch_reference: string;
  batch_type: string;
  total_workers: number;
  total_transactions: number;
  gross_amount: number;
  commission_amount: number;
  net_amount: number;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkerBankAccount {
  id: string;
  worker_id: string;
  account_holder_name: string;
  bank_name: string;
  account_number_encrypted: string;
  account_last_four: string;
  ifsc_code: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}
