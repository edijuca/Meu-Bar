import React, { createContext, useReducer, useEffect, ReactNode, Dispatch } from 'react';
import { Customer, Product, Sale, HeldOrder, BarInfo } from '../types';
import { PaymentMethod, PaymentStatus } from '../constants';

interface AppState {
  customers: Customer[];
  products: Product[];
  sales: Sale[];
  heldOrders: HeldOrder[];
  barInfo: BarInfo;
}

type Action =
  | { type: 'ADD_CUSTOMER'; payload: Customer }
  | { type: 'UPDATE_CUSTOMER'; payload: Customer }
  | { type: 'DELETE_CUSTOMER'; payload: string }
  | { type: 'ADD_PRODUCT'; payload: Product }
  | { type: 'UPDATE_PRODUCT'; payload: Product }
  | { type: 'DELETE_PRODUCT'; payload: string }
  | { type: 'ADD_SALE'; payload: Sale }
  | { type: 'PAY_DEBT'; payload: { customerId: string; amount: number } }
  | { type: 'HOLD_ORDER'; payload: HeldOrder }
  | { type: 'DELETE_HELD_ORDER'; payload: string }
  | { type: 'UPDATE_BAR_INFO', payload: BarInfo };


const initialState: AppState = {
  customers: [],
  products: [],
  sales: [],
  heldOrders: [],
  barInfo: { name: '', email: '', phone: '', address: '' },
};

const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'ADD_CUSTOMER':
      return { ...state, customers: [...state.customers, action.payload] };
    case 'UPDATE_CUSTOMER':
      return {
        ...state,
        customers: state.customers.map(c => c.id === action.payload.id ? action.payload : c),
      };
    case 'DELETE_CUSTOMER':
        // Also delete sales associated with this customer
        const salesToKeep = state.sales.filter(s => s.customerId !== action.payload);
        return {
          ...state,
          customers: state.customers.filter(c => c.id !== action.payload),
          sales: salesToKeep,
        };
    case 'ADD_PRODUCT':
      return { ...state, products: [...state.products, action.payload] };
    case 'UPDATE_PRODUCT':
      return {
        ...state,
        products: state.products.map(p => p.id === action.payload.id ? action.payload : p),
      };
    case 'DELETE_PRODUCT':
        return {
          ...state,
          products: state.products.filter(p => p.id !== action.payload),
        };
    case 'ADD_SALE':
      const newProducts = [...state.products];
      action.payload.items.forEach(item => {
        const productIndex = newProducts.findIndex(p => p.id === item.productId);
        if (productIndex !== -1) {
          newProducts[productIndex].stock -= item.quantity;
        }
      });
      return {
        ...state,
        sales: [...state.sales, action.payload],
        products: newProducts,
      };
    case 'PAY_DEBT':
        const customerSales = state.sales
            .filter(s => s.customerId === action.payload.customerId && s.paymentStatus === PaymentStatus.Fiado)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        let remainingAmount = action.payload.amount;
        const updatedSales = [...state.sales];

        for (const sale of customerSales) {
            if (remainingAmount <= 0) break;

            const saleIndex = updatedSales.findIndex(s => s.id === sale.id);
            if (saleIndex === -1) continue;

            if (remainingAmount >= sale.total) {
                updatedSales[saleIndex] = { ...sale, paymentStatus: PaymentStatus.Pago };
                remainingAmount -= sale.total;
            } 
            // Partial payment is not handled in this simplified version, we pay sale by sale.
        }
        return { ...state, sales: updatedSales };
    
    case 'HOLD_ORDER':
      return { ...state, heldOrders: [...state.heldOrders, action.payload] };

    case 'DELETE_HELD_ORDER':
      return {
        ...state,
        heldOrders: state.heldOrders.filter(o => o.id !== action.payload),
      };
      
    case 'UPDATE_BAR_INFO':
      return { ...state, barInfo: action.payload };

    default:
      return state;
  }
};

const getInitialState = (): AppState => {
  try {
    const storedState = localStorage.getItem('barAppState');
    if (storedState) {
      const parsed = JSON.parse(storedState);
      return {
        ...initialState,
        ...parsed,
        heldOrders: parsed.heldOrders || [], // Ensure heldOrders exists on load
        barInfo: parsed.barInfo || { name: 'Bar POS', email: '', phone: '', address: '' },
      };
    }
  } catch (error) {
    console.error('Could not load state from localStorage', error);
  }
  
  // Return initial data if nothing in local storage
  return {
    customers: [
      { id: 'c1', name: 'João Silva', phone: '11987654321' },
      { id: 'c2', name: 'Maria Oliveira', phone: '21912345678' },
    ],
    products: [
      { id: 'p1', name: 'Cerveja Brahma 600ml', category: 'Cervejas', price: 12.00, stock: 50 },
      { id: 'p2', name: 'Caipirinha de Limão', category: 'Drinks', price: 15.00, stock: 100 },
      { id: 'p3', name: 'Porção de Fritas', category: 'Porções', price: 25.00, stock: 30 },
      { id: 'p4', name: 'Coca-Cola Lata', category: 'Refrigerantes', price: 6.00, stock: 80 },
      { id: 'p5', name: 'Água Mineral', category: 'Bebidas', price: 4.00, stock: 120 },
      { id: 'p6', name: 'Suco de Laranja', category: 'Bebidas', price: 8.00, stock: 40 },
    ],
    sales: [
        {
          id: 's1',
          customerId: 'c1',
          items: [{ productId: 'p1', quantity: 2, subtotal: 24.00 }],
          date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
          total: 24.00,
          paymentMethod: PaymentMethod.Fiado,
          paymentStatus: PaymentStatus.Fiado,
        },
    ],
    heldOrders: [],
    barInfo: {
        name: 'Meu Bar Incrível',
        email: 'contato@meubar.com',
        phone: '(11) 99999-8888',
        address: 'Rua das Cervejas, 123 - Bairro Boêmio',
    },
  };
};

export const AppContext = createContext<{ state: AppState; dispatch: Dispatch<Action> }>({
  state: initialState,
  dispatch: () => null,
});

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, getInitialState());

  useEffect(() => {
    try {
      localStorage.setItem('barAppState', JSON.stringify(state));
    } catch (error) {
      console.error('Could not save state to localStorage', error);
    }
  }, [state]);

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
};
