import { User, Customer, Product, Sale, HeldOrder, BarInfo } from '../types';
import { PaymentMethod, PaymentStatus } from '../constants';

type AppData = Omit<any, 'isAuthenticated' | 'user' | 'status'>; // Usando 'any' temporariamente para simplificar

export const MOCK_INITIAL_DATA: AppData = {
    customers: [
      { id: 'c1', name: 'João Silva', phone: '11987654321' },
      { id: 'c2', name: 'Maria Oliveira', phone: '21912345678' },
    ],
    products: [
      { id: 'p1', name: 'Cerveja Brahma 600ml', category: 'Cervejas', price: 12.00, stock: 50 },
      { id: 'p2', name: 'Caipirinha de Limão', category: 'Drinks', price: 15.00, stock: 100 },
      { id: 'p3', name: 'Porção de Fritas', category: 'Porções', price: 25.00, stock: 30 },
      { id: 'p4', name: 'Coca-Cola Lata', category: 'Refrigerantes', price: 6.00, stock: 80 },
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


// --- API Service Simulation ---

const FAKE_LATENCY = 300;

const simulateApi = <T>(data: T, errorMsg?: string): Promise<T> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (errorMsg) {
                reject(new Error(errorMsg));
            } else {
                resolve(data);
            }
        }, FAKE_LATENCY);
    });
};

class ApiService {
    private getUsers(): User[] {
        const users = localStorage.getItem('bar_users');
        return users ? JSON.parse(users) : [];
    }

    private saveUsers(users: User[]) {
        localStorage.setItem('bar_users', JSON.stringify(users));
    }

    async register(name: string, email: string, password: string): Promise<User> {
        const users = this.getUsers();
        if (users.some(u => u.email === email)) {
            return simulateApi(null as any, 'Este email já está em uso.');
        }
        const newUser: User = { id: `u${Date.now()}`, name, email, password };
        this.saveUsers([...users, newUser]);
        
        localStorage.setItem('bar_session', JSON.stringify(newUser));
        return simulateApi(newUser);
    }
    
    async login(email: string, password: string): Promise<User> {
        const users = this.getUsers();
        const user = users.find(u => u.email === email);
        if (!user || user.password !== password) {
            return simulateApi(null as any, 'Email ou senha inválidos.');
        }
        localStorage.setItem('bar_session', JSON.stringify(user));
        return simulateApi(user);
    }
    
    async logout(): Promise<void> {
        localStorage.removeItem('bar_session');
        return simulateApi(undefined);
    }
    
    async checkSession(): Promise<User | null> {
        const session = localStorage.getItem('bar_session');
        const user = session ? JSON.parse(session) : null;
        return simulateApi(user);
    }

    async getData(userEmail: string): Promise<AppData | null> {
        const data = localStorage.getItem(`bar_data_${userEmail}`);
        return simulateApi(data ? JSON.parse(data) : null);
    }

    async saveData(userEmail: string, data: AppData): Promise<void> {
        localStorage.setItem(`bar_data_${userEmail}`, JSON.stringify(data));
        return simulateApi(undefined);
    }
}

export const apiService = new ApiService();
