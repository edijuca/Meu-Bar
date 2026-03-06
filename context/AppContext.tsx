import React, { createContext, useReducer, useEffect, ReactNode, useMemo } from 'react';
import { Customer, Product, Sale, HeldOrder, BarInfo, User, SaleItem } from '../types';
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
  users: User[];
  currentView: 'dashboard' | 'sales' | 'customers' | 'products' | 'reports' | 'settings' | 'sales_history' | 'users';
  activeSale: {
    customerId: string | null;
    items: SaleItem[];
    clearingSaleIds: string[];
  };
}

type Action =
  | { type: 'INITIALIZE'; payload: { user: User; data: Omit<AppState, 'isAuthenticated' | 'user' | 'status' | 'users' | 'currentView' | 'activeSale'>; users: User[] } }
  | { type: 'LOGIN'; payload: { user: User; data: Omit<AppState, 'isAuthenticated' | 'user' | 'status' | 'users' | 'currentView' | 'activeSale'>; users: User[] } }
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
  | { type: 'UPDATE_BAR_INFO', payload: BarInfo }
  | { type: 'SET_USERS', payload: User[] }
  | { type: 'UPDATE_USER', payload: User }
  | { type: 'DELETE_USER', payload: string }
  | { type: 'SET_VIEW', payload: AppState['currentView'] }
  | { type: 'SET_ACTIVE_SALE', payload: AppState['activeSale'] }
  | { type: 'RESET_SALES' };

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
  users: [],
  currentView: 'dashboard',
  activeSale: {
    customerId: null,
    items: [],
    clearingSaleIds: [],
  },
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
        users: action.payload.users,
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
    case 'SET_USERS':
      return { ...state, users: action.payload };
    case 'UPDATE_USER':
      return { ...state, users: state.users.map(u => u.id === action.payload.id ? action.payload : u) };
    case 'DELETE_USER':
      return { ...state, users: state.users.filter(u => u.id !== action.payload) };
    case 'SET_VIEW':
      return { ...state, currentView: action.payload };
    case 'SET_ACTIVE_SALE':
      return { ...state, activeSale: action.payload };
    case 'RESET_SALES':
      return { ...state, sales: [], heldOrders: [] };
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
    updateUser: (user: User) => Promise<void>;
    deleteUser: (id: string) => Promise<void>;
    addUser: (name: string, email: string, password: string) => Promise<void>;
    setView: (view: AppState['currentView']) => void;
    setActiveSale: (customerId: string | null, items: SaleItem[], clearingSaleIds: string[]) => void;
    clearSpecificSales: (saleIds: string[]) => Promise<void>;
    resetSales: () => Promise<void>;
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
        const users = await apiService.getUsersList();
        dispatch({ type: 'INITIALIZE', payload: { user: sessionUser, data: data || MOCK_INITIAL_DATA, users } });
      } else {
        // No session, just mark as ready to show login screen
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
        const users = await apiService.getUsersList();
        dispatch({ type: 'LOGIN', payload: { user, data: data || MOCK_INITIAL_DATA, users } });
        return user;
      },
      register: async (name, email, password) => {
        const user = await apiService.register(name, email, password);
        const data = MOCK_INITIAL_DATA;
        const users = await apiService.getUsersList();
        dispatch({ type: 'LOGIN', payload: { user, data, users } });
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
          await apiService.updateCustomer(customer);
          dispatch({ type: 'UPDATE_CUSTOMER', payload: customer });
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
          await apiService.updateProduct(product);
          dispatch({ type: 'UPDATE_PRODUCT', payload: product });
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
        const customerSales = state.sales
            .filter(s => s.customerId === customerId && s.paymentStatus === PaymentStatus.Fiado)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        let remainingAmount = amount;
        const saleIdsToPay: string[] = [];
        const updatedSales = [...state.sales];

        for (const sale of customerSales) {
            if (remainingAmount <= 0) break;
            if (remainingAmount >= sale.total) {
                saleIdsToPay.push(sale.id);
                const saleIndex = updatedSales.findIndex(s => s.id === sale.id);
                if (saleIndex !== -1) {
                    updatedSales[saleIndex] = { ...sale, paymentStatus: PaymentStatus.Pago };
                }
                remainingAmount -= sale.total;
            } 
        }

        if (saleIdsToPay.length > 0) {
            await apiService.payDebt(saleIdsToPay);
            dispatch({ type: 'PAY_DEBT', payload: updatedSales });
        }
      },
      holdOrder: async (orderData: Omit<HeldOrder, 'id'|'heldAt'>) => {
        const newHeldOrder = await apiService.holdOrder(orderData);
        dispatch({ type: 'HOLD_ORDER', payload: newHeldOrder });
      },
      deleteHeldOrder: async (id: string) => {
        await apiService.deleteHeldOrder(id);
        dispatch({ type: 'DELETE_HELD_ORDER', payload: id });
      },
      updateBarInfo: async (info: BarInfo) => {
        await apiService.updateBarInfo(info);
        dispatch({ type: 'UPDATE_BAR_INFO', payload: info });
      },
      updateUser: async (user: User) => {
        await apiService.updateUser(user);
        dispatch({ type: 'UPDATE_USER', payload: user });
      },
      deleteUser: async (id: string) => {
        await apiService.deleteUser(id);
        dispatch({ type: 'DELETE_USER', payload: id });
      },
      addUser: async (name: string, email: string, password: string) => {
        const newUser = await apiService.addUser(name, email, password);
        // We add the new user to the local state immediately
        dispatch({ type: 'SET_USERS', payload: [...state.users, newUser] });
        alert('Usuário criado com sucesso! Se o login não funcionar, verifique se a confirmação de e-mail está desativada no Supabase.');
      },
      setView: (view: AppState['currentView']) => {
        dispatch({ type: 'SET_VIEW', payload: view });
      },
      setActiveSale: (customerId: string | null, items: SaleItem[], clearingSaleIds: string[]) => {
        dispatch({ type: 'SET_ACTIVE_SALE', payload: { customerId, items, clearingSaleIds } });
      },
      clearSpecificSales: async (saleIds: string[]) => {
        if (saleIds.length === 0) return;
        await apiService.payDebt(saleIds);
        const updatedSales = state.sales.map(s => 
          saleIds.includes(s.id) ? { ...s, paymentStatus: PaymentStatus.Pago } : s
        );
        dispatch({ type: 'PAY_DEBT', payload: updatedSales });
      },
      resetSales: async () => {
        console.log('AppContext: resetSales action triggered');
        try {
          await apiService.resetSales();
          dispatch({ type: 'RESET_SALES' });
          console.log('AppContext: resetSales action completed');
        } catch (err) {
          console.error('AppContext: resetSales action failed', err);
          throw err;
        }
      },
    };
  }, [state]);


  const contextValue = { state, actions };

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};
