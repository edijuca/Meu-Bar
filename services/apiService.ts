import { User, Customer, Product, Sale, HeldOrder, BarInfo } from '../types';
import { PaymentMethod, PaymentStatus } from '../constants';

const API_URL = '/api';

type AppData = {
    customers: Customer[];
    products: Product[];
    sales: Sale[];
    heldOrders: HeldOrder[];
    barInfo: BarInfo;
};

// Mock data is no longer needed but kept for type reference if needed, 
// though we will remove it from usage.
export const MOCK_INITIAL_DATA: AppData = {
    customers: [],
    products: [],
    sales: [],
    heldOrders: [],
    barInfo: {
        name: '',
        email: '',
        phone: '',
        address: '',
    },
};

class ApiService {
    private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
        const response = await fetch(`${API_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
            },
            ...options,
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Error ${response.status}: ${response.statusText}`);
        }
        return response.json();
    }

    async register(name: string, email: string, password: string): Promise<User> {
        return this.request<User>('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password }),
        });
    }

    async login(email: string, password: string): Promise<User> {
        const user = await this.request<User>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        localStorage.setItem('bar_session', JSON.stringify(user));
        return user;
    }

    async logout(): Promise<void> {
        localStorage.removeItem('bar_session');
        // Optional: Call logout endpoint if backend manages sessions
    }

    async checkSession(): Promise<User | null> {
        const session = localStorage.getItem('bar_session');
        return session ? JSON.parse(session) : null;
    }

    // Consolidated data fetch for initialization
    async getData(userEmail: string): Promise<AppData | null> {
        // userEmail is mostly unused in current backend design as we don't hold per-user data isolation yet,
        // but keeping signature for compatibility.
        return this.request<AppData>('/data');
    }

    // --- Granular Data Operations ---

    async saveData(userEmail: string, data: AppData): Promise<void> {
        // This method is deprecated with the new backend architecture.
        // We should move away from it. For now, it does nothing or logs a warning.
        console.warn('apiService.saveData is deprecated. Use granular methods instead.');
    }

    async addCustomer(customer: Omit<Customer, 'id'>): Promise<Customer> {
        return this.request<Customer>('/customers', {
            method: 'POST',
            body: JSON.stringify(customer),
        });
    }

    async updateCustomer(customer: Customer): Promise<Customer> {
        return this.request<Customer>(`/customers/${customer.id}`, {
            method: 'PUT',
            body: JSON.stringify(customer),
        });
    }

    async deleteCustomer(id: string): Promise<void> {
        await this.request(`/customers/${id}`, { method: 'DELETE' });
    }

    async addProduct(product: Omit<Product, 'id'>): Promise<Product> {
        return this.request<Product>('/products', {
            method: 'POST',
            body: JSON.stringify(product),
        });
    }

    async updateProduct(product: Product): Promise<Product> {
        return this.request<Product>(`/products/${product.id}`, {
            method: 'PUT',
            body: JSON.stringify(product),
        });
    }

    async deleteProduct(id: string): Promise<void> {
        await this.request(`/products/${id}`, { method: 'DELETE' });
    }

    async addSale(sale: Omit<Sale, 'id' | 'date' | 'paymentStatus'>): Promise<Sale> {
        return this.request<Sale>('/sales', {
            method: 'POST',
            body: JSON.stringify(sale),
        });
    }

    async payDebt(saleIds: string[]): Promise<void> {
        await this.request('/sales/pay-debt', {
            method: 'POST',
            body: JSON.stringify({ saleIds }),
        });
    }

    async holdOrder(order: Omit<HeldOrder, 'id' | 'heldAt'>): Promise<HeldOrder> {
        return this.request<HeldOrder>('/held-orders', {
            method: 'POST',
            body: JSON.stringify(order),
        });
    }

    async deleteHeldOrder(id: string): Promise<void> {
        await this.request(`/held-orders/${id}`, { method: 'DELETE' });
    }

    async updateBarInfo(info: BarInfo): Promise<BarInfo> {
        return this.request<BarInfo>('/bar-info', {
            method: 'PUT',
            body: JSON.stringify(info),
        });
    }
}

export const apiService = new ApiService();
