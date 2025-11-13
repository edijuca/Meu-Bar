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
          const item = action.payload.items.find(i => i.productId === p.id);
          return item ? { ...p, stock: p.stock - item.quantity } : p;
      });
      return { ...state, sales: [...state.sales, action.payload], products: newProducts };
    case 'PAY_DEBT':
      return { ...state, sales: action.payload };
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
      const sessionUser = await apiService.checkSession();
      if (sessionUser) {
        const data = await apiService.getData(sessionUser.email);
        dispatch({ type: 'INITIALIZE', payload: { user: sessionUser, data: data || MOCK_INITIAL_DATA } });
      } else {
        // No session, just mark as ready to show login screen
        dispatch({ type: 'LOGOUT' });
      }
    };
    initializeApp();
  }, []);

  const actions = useMemo(() => {
    const saveData = async (newState: Partial<AppState>) => {
        if (state.user) {
            const currentData = {
                customers: newState.customers ?? state.customers,
                products: newState.products ?? state.products,
                sales: newState.sales ?? state.sales,
                heldOrders: newState.heldOrders ?? state.heldOrders,
                barInfo: newState.barInfo ?? state.barInfo,
            };
            await apiService.saveData(state.user.email, currentData);
        }
    };
    
    return {
      login: async (email, password) => {
        const user = await apiService.login(email, password);
        const data = await apiService.getData(user.email);
        dispatch({ type: 'LOGIN', payload: { user, data: data || MOCK_INITIAL_DATA } });
        return user;
      },
      register: async (name, email, password) => {
        const user = await apiService.register(name, email, password);
        const data = MOCK_INITIAL_DATA;
        await apiService.saveData(user.email, data);
        dispatch({ type: 'LOGIN', payload: { user, data } });
        return user;
      },
      logout: async () => {
        await apiService.logout();
        dispatch({ type: 'LOGOUT' });
      },
      addCustomer: async (customerData: Omit<Customer, 'id'>) => {
          const newCustomer = { ...customerData, id: `c${Date.now()}` };
          const newCustomers = [...state.customers, newCustomer];
          await saveData({ customers: newCustomers });
          dispatch({ type: 'ADD_CUSTOMER', payload: newCustomer });
      },
      updateCustomer: async (customer: Customer) => {
          const newCustomers = state.customers.map(c => c.id === customer.id ? customer : c);
          await saveData({ customers: newCustomers });
          dispatch({ type: 'UPDATE_CUSTOMER', payload: customer });
      },
      deleteCustomer: async (id: string) => {
          const newCustomers = state.customers.filter(c => c.id !== id);
          const newSales = state.sales.filter(s => s.customerId !== id);
          await saveData({ customers: newCustomers, sales: newSales });
          dispatch({ type: 'DELETE_CUSTOMER', payload: id });
          dispatch({ type: 'SET_STATE', payload: { sales: newSales, customers: newCustomers, products: state.products, heldOrders: state.heldOrders, barInfo: state.barInfo } });
      },
      addProduct: async (productData: Omit<Product, 'id'>) => {
          const newProduct = { ...productData, id: `p${Date.now()}`};
          const newProducts = [...state.products, newProduct];
          await saveData({ products: newProducts });
          dispatch({ type: 'ADD_PRODUCT', payload: newProduct });
      },
      updateProduct: async (product: Product) => {
          const newProducts = state.products.map(p => p.id === product.id ? product : p);
          await saveData({ products: newProducts });
          dispatch({ type: 'UPDATE_PRODUCT', payload: product });
      },
      deleteProduct: async (id: string) => {
          const newProducts = state.products.filter(p => p.id !== id);
          await saveData({ products: newProducts });
          dispatch({ type: 'DELETE_PRODUCT', payload: id });
      },
      addSale: async (saleData: Omit<Sale, 'id' | 'date' | 'paymentStatus'>) => {
          const newSale = {
              ...saleData,
              id: `s${Date.now()}`,
              date: new Date().toISOString(),
              paymentStatus: saleData.paymentMethod === PaymentMethod.Fiado ? PaymentStatus.Fiado : PaymentStatus.Pago,
          };
          const newSales = [...state.sales, newSale];
          const newProducts = state.products.map(p => {
              const item = newSale.items.find(i => i.productId === p.id);
              return item ? { ...p, stock: p.stock - item.quantity } : p;
          });
          await saveData({ sales: newSales, products: newProducts });
          dispatch({ type: 'ADD_SALE', payload: newSale });
      },
      payDebt: async (customerId: string, amount: number) => {
        const customerSales = state.sales
            .filter(s => s.customerId === customerId && s.paymentStatus === PaymentStatus.Fiado)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        let remainingAmount = amount;
        const updatedSales = [...state.sales];

        for (const sale of customerSales) {
            if (remainingAmount <= 0) break;
            const saleIndex = updatedSales.findIndex(s => s.id === sale.id);
            if (saleIndex === -1) continue;
            if (remainingAmount >= sale.total) {
                updatedSales[saleIndex] = { ...sale, paymentStatus: PaymentStatus.Pago };
                remainingAmount -= sale.total;
            } 
        }
        await saveData({ sales: updatedSales });
        dispatch({ type: 'PAY_DEBT', payload: updatedSales });
      },
      holdOrder: async (orderData: Omit<HeldOrder, 'id'|'heldAt'>) => {
        const newHeldOrder = { ...orderData, id: `h${Date.now()}`, heldAt: new Date().toISOString() };
        const newHeldOrders = [...state.heldOrders, newHeldOrder];
        await saveData({ heldOrders: newHeldOrders });
        dispatch({ type: 'HOLD_ORDER', payload: newHeldOrder });
      },
      deleteHeldOrder: async (id: string) => {
        const newHeldOrders = state.heldOrders.filter(o => o.id !== id);
        await saveData({ heldOrders: newHeldOrders });
        dispatch({ type: 'DELETE_HELD_ORDER', payload: id });
      },
      updateBarInfo: async (info: BarInfo) => {
        await saveData({ barInfo: info });
        dispatch({ type: 'UPDATE_BAR_INFO', payload: info });
      },
    };
  }, [state]);

  const contextValue = { state, actions };

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};
