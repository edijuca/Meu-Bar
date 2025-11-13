import { PaymentMethod, PaymentStatus } from './constants';

export interface Customer {
  id: string;
  name: string;
  phone?: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
}

export interface SaleItem {
  productId: string;
  quantity: number;
  subtotal: number;
}

export interface Sale {
  id:string;
  customerId: string;
  items: SaleItem[];
  date: string;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
}

export interface HeldOrder {
  id: string;
  customerId: string;
  items: SaleItem[];
  total: number;
  heldAt: string;
}

export interface BarInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // NOTE: In a real app, never store or handle plaintext passwords on the client.
}
