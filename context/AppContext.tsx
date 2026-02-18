import React, { createContext, useReducer, useEffect, ReactNode, useMemo } from 'react';
import { Customer, Product, Sale, HeldOrder, BarInfo, User } from '../types';
import { PaymentMethod, PaymentStatus } from '../constants';
import { apiService, MOCK_INITIAL_DATA } from '../services/apiService';

// --- State and Action Types ---

interface AppState {
  isAuthenticated: boolean;
  user: User | null;
  status: 'idle' | 'loading' | 'ready';
  customers: Customer[];
  products: Product[];
  sales: Sale[];
  heldOrders: HeldOrder[];
  barInfo: BarInfo;
}

type Action =
  | { type: 'INITIALIZE'; payload: { user: User; data: Omit<AppState, 'isAuthenticated' | 'user' | 'status'> } }
  | { type: 'LOGIN'; payload: { user: User; data: Omit<AppState, 'isAuthenticated' | 'user' | 'status'> } }
  | { type: 'LOGOUT' }
  | { type: 'SET_STATE'; payload: Omit<AppState, 'isAuthenticated' | 'user' | 'status'> }
  | { type: 'ADD_CUSTOMER'; payload: Customer }
  | { type: 'UPDATE_CUSTOMER'; payload: Customer }
  | { type: 'DELETE_CUSTOMER'; payload: string }
  | { type: 'ADD_PRODUCT'; payload: Product }
  | { type: 'UPDATE_PRODUCT'; payload: Product }
  | { type: 'DELETE_PRODUCT'; payload: string }
  | { type: 'ADD_SALE'; payload: Sale }
  | { type: 'PAY_DEBT'; payload: Sale[] }
  | { type: 'HOLD_ORDER'; payload: HeldOrder }
  | { type: 'DELETE_HELD_ORDER'; payload: string }
  | { type: 'UPDATE_BAR_INFO', payload: BarInfo };

// --- Initial State ---

const initialState: AppState = {
  isAuthenticated: false,
  user: null,
  status: 'idle',
  customers: [],
  products: [],
  sales: [],
  heldOrders: [],
  barInfo: { name: '', email: '', phone: '', address: '' },
};

// --- Reducer ---

const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'INITIALIZE':
    case 'LOGIN':
      return {
        ...state,
        isAuthenticated: true,
        status: 'ready',
        user: action.payload.user,
        ...action.payload.data,
      };
    case 'LOGOUT':
      return { ...initialState, status: 'ready' };
    case 'SET_STATE':
      return { ...state, ...action.payload };
    case 'ADD_CUSTOMER':
      return { ...state, customers: [...state.customers, action.payload] };
    case 'UPDATE_CUSTOMER':
      return { ...state, customers: state.customers.map(c => c.id === action.payload.id ? action.payload : c) };
    case 'DELETE_CUSTOMER':
      return { ...state, customers: state.customers.filter(c => c.id !== action.payload) };
    case 'ADD_PRODUCT':
      return { ...state, products: [...state.products, action.payload] };
    case 'UPDATE_PRODUCT':
      return { ...state, products: state.products.map(p => p.id === action.payload.id ? action.payload : p) };
    case 'DELETE_PRODUCT':
      return { ...state, products: state.products.filter(p => p.id !== action.payload) };
    case 'ADD_SALE':
      const newProducts = state.products.map(p => {
        const item = action.payload.items.find((i: any) => i.productId === p.id);
        return item ? { ...p, stock: p.stock - item.quantity } : p;
      });
      return { ...state, sales: [...state.sales, action.payload], products: newProducts };
    case 'PAY_DEBT':
      // Optimistic update for paid sales
      const updatedSalesMap = new Map(action.payload.map(s => [s.id, s]));
      const newSalesList = state.sales.map(s => updatedSalesMap.get(s.id) || s);
      return { ...state, sales: newSalesList };
    case 'HOLD_ORDER':
      return { ...state, heldOrders: [...state.heldOrders, action.payload] };
    case 'DELETE_HELD_ORDER':
      return { ...state, heldOrders: state.heldOrders.filter(o => o.id !== action.payload) };
    case 'UPDATE_BAR_INFO':
      return { ...state, barInfo: action.payload };
    default:
      return state;
  }
};

// --- Context Definition ---

interface AppContextType {
  state: AppState;
  actions: {
    login: (email: string, password: string) => Promise<User>;
    register: (name: string, email: string, password: string) => Promise<User>;
    logout: () => Promise<void>;
    addCustomer: (customer: Omit<Customer, 'id'>) => Promise<void>;
    updateCustomer: (customer: Customer) => Promise<void>;
    deleteCustomer: (id: string) => Promise<void>;
    addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
    updateProduct: (product: Product) => Promise<void>;
    deleteProduct: (id: string) => Promise<void>;
    addSale: (sale: Omit<Sale, 'id' | 'date' | 'paymentStatus'>) => Promise<void>;
    payDebt: (customerId: string, amount: number) => Promise<void>;
    holdOrder: (order: Omit<HeldOrder, 'id' | 'heldAt'>) => Promise<void>;
    deleteHeldOrder: (id: string) => Promise<void>;
    updateBarInfo: (info: BarInfo) => Promise<void>;
  };
}

export const AppContext = createContext<AppContextType>({
  state: initialState,
  actions: {} as any, // Will be populated by the provider
});

// --- Provider Component ---

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Just check if we can fetch data, simple session check
        const sessionUser = await apiService.checkSession();
        if (sessionUser) {
          const data = await apiService.getData(sessionUser.email);
          if (data) {
            dispatch({ type: 'INITIALIZE', payload: { user: sessionUser, data: data } });
          } else {
            // If data fetch fails but user exists, maybe DB is empty or error
            console.error("Failed to fetch data");
            dispatch({ type: 'LOGOUT' });
          }
        } else {
          dispatch({ type: 'LOGOUT' });
        }
      } catch (e) {
        console.error("Initialization error", e);
        dispatch({ type: 'LOGOUT' });
      }
    };
    initializeApp();
  }, []);

  const actions = useMemo(() => {
    return {
      login: async (email, password) => {
        const user = await apiService.login(email, password);
        const data = await apiService.getData(user.email);
        dispatch({ type: 'LOGIN', payload: { user, data: data || { customers: [], products: [], sales: [], heldOrders: [], barInfo: { name: '', email: '', phone: '', address: '' } } } });
        return user;
      },
      register: async (name, email, password) => {
        const user = await apiService.register(name, email, password);
        // On register, data is empty
        dispatch({ type: 'LOGIN', payload: { user, data: { customers: [], products: [], sales: [], heldOrders: [], barInfo: { name: '', email: '', phone: '', address: '' } } } });
        return user;
      },
      logout: async () => {
        await apiService.logout();
        dispatch({ type: 'LOGOUT' });
      },
      addCustomer: async (customerData: Omit<Customer, 'id'>) => {
        const newCustomer = await apiService.addCustomer(customerData);
        dispatch({ type: 'ADD_CUSTOMER', payload: newCustomer });
      },
      updateCustomer: async (customer: Customer) => {
        const updatedCustomer = await apiService.updateCustomer(customer);
        dispatch({ type: 'UPDATE_CUSTOMER', payload: updatedCustomer });
      },
      deleteCustomer: async (id: string) => {
        await apiService.deleteCustomer(id);
        dispatch({ type: 'DELETE_CUSTOMER', payload: id });
      },
      addProduct: async (productData: Omit<Product, 'id'>) => {
        const newProduct = await apiService.addProduct(productData);
        dispatch({ type: 'ADD_PRODUCT', payload: newProduct });
      },
      updateProduct: async (product: Product) => {
        const updatedProduct = await apiService.updateProduct(product);
        dispatch({ type: 'UPDATE_PRODUCT', payload: updatedProduct });
      },
      deleteProduct: async (id: string) => {
        await apiService.deleteProduct(id);
        dispatch({ type: 'DELETE_PRODUCT', payload: id });
      },
      addSale: async (saleData: Omit<Sale, 'id' | 'date' | 'paymentStatus'>) => {
        const newSale = await apiService.addSale(saleData);
        dispatch({ type: 'ADD_SALE', payload: newSale });
      },
      payDebt: async (customerId: string, amount: number) => {
        // Logic to calculate which sales are paid is moved to backend or we do it here.
        // Current backend expects specific sale IDs to pay.
        // So we need to calculate locally which sales to pay, then send IDs to backend.

        const customerSales = state.sales
          .filter(s => s.customerId === customerId && s.paymentStatus === 'Fiado') // String match!
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let remainingAmount = amount;
        const salesToPay: Sale[] = [];

        for (const sale of customerSales) {
          if (remainingAmount <= 0) break;
          if (remainingAmount >= sale.total) {
            salesToPay.push({ ...sale, paymentStatus: PaymentStatus.Pago });
            remainingAmount -= sale.total;
          }
        }

        if (salesToPay.length > 0) {
          await apiService.payDebt(salesToPay.map(s => s.id));
          dispatch({ type: 'PAY_DEBT', payload: salesToPay });
        }
      },
      holdOrder: async (orderData: Omit<HeldOrder, 'id' | 'heldAt'>) => {
        const newHeldOrder = await apiService.holdOrder(orderData);
        dispatch({ type: 'HOLD_ORDER', payload: newHeldOrder });
      },
      deleteHeldOrder: async (id: string) => {
        await apiService.deleteHeldOrder(id);
        dispatch({ type: 'DELETE_HELD_ORDER', payload: id });
      },
      updateBarInfo: async (info: BarInfo) => {
        const updatedInfo = await apiService.updateBarInfo(info);
        dispatch({ type: 'UPDATE_BAR_INFO', payload: updatedInfo });
      },
    };
  }, [state.sales, state.customers, state.products, state.heldOrders]);

  const contextValue = { state, actions };

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};
