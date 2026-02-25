import { User, Customer, Product, Sale, HeldOrder, BarInfo, SaleItem } from '../types';
import { PaymentMethod, PaymentStatus } from '../constants';
import { supabase } from './supabaseClient';

export interface AppData {
    customers: Customer[];
    products: Product[];
    sales: Sale[];
    heldOrders: HeldOrder[];
    barInfo: BarInfo;
}

export const MOCK_INITIAL_DATA: AppData = {
    customers: [],
    products: [],
    sales: [],
    heldOrders: [],
    barInfo: {
        name: 'Meu Bar',
        email: '',
        phone: '',
        address: '',
    },
};

class ApiService {
    async addUser(name: string, email: string, password: string): Promise<User> {
        // This is essentially the same as register for now
        return this.register(name, email, password);
    }

    async register(name: string, email: string, password: string): Promise<User> {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { name }
            }
        });

        if (error) throw error;
        if (!data.user) throw new Error('Falha ao criar usuário.');

        return {
            id: data.user.id,
            name: data.user.user_metadata.name || name,
            email: data.user.email || email
        };
    }
    
    async login(email: string, password: string): Promise<User> {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;
        if (!data.user) throw new Error('Usuário não encontrado.');

        return {
            id: data.user.id,
            name: data.user.user_metadata.name || '',
            email: data.user.email || ''
        };
    }
    
    async logout(): Promise<void> {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    }
    
    async checkSession(): Promise<User | null> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return null;

        return {
            id: session.user.id,
            name: session.user.user_metadata.name || '',
            email: session.user.email || ''
        };
    }

    async getData(userEmail: string): Promise<AppData | null> {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) return null;

        const [
            { data: customers, error: errC },
            { data: products, error: errP },
            { data: sales, error: errS },
            { data: heldOrders, error: errH },
            { data: barInfo, error: errB }
        ] = await Promise.all([
            supabase.from('customers').select('*').eq('user_id', user.id),
            supabase.from('products').select('*').eq('user_id', user.id),
            supabase.from('sales').select('*, sale_items(*)').eq('user_id', user.id),
            supabase.from('held_orders').select('*, held_order_items(*)').eq('user_id', user.id),
            supabase.from('bar_info').select('*').eq('user_id', user.id).maybeSingle()
        ]);

        if (errC || errP || errS || errH) {
            console.error('Error fetching data:', { errC, errP, errS, errH });
        }

        return {
            customers: (customers || []).map(c => ({ id: c.id, name: c.name, phone: c.phone })),
            products: (products || []).map(p => ({ id: p.id, name: p.name, category: p.category, price: Number(p.price), stock: p.stock })),
            sales: (sales || []).map(s => ({
                id: s.id,
                customerId: s.customer_id,
                date: s.date,
                total: Number(s.total),
                paymentMethod: s.payment_method as PaymentMethod,
                paymentStatus: s.payment_status as PaymentStatus,
                items: (s.sale_items || []).map((i: any) => ({ productId: i.product_id, quantity: i.quantity, subtotal: Number(i.subtotal) }))
            })),
            heldOrders: (heldOrders || []).map(o => ({
                id: o.id,
                customerId: o.customer_id,
                total: Number(o.total),
                heldAt: o.held_at,
                items: (o.held_order_items || []).map((i: any) => ({ productId: i.product_id, quantity: i.quantity, subtotal: Number(i.subtotal) }))
            })),
            barInfo: barInfo ? { 
                name: barInfo.name || '', 
                email: barInfo.email || '', 
                phone: barInfo.phone || '', 
                address: barInfo.address || '' 
            } : MOCK_INITIAL_DATA.barInfo
        };
    }

    async saveData(userEmail: string, data: AppData): Promise<void> {
        // In Supabase, we usually save individual items via specific actions.
        console.log('saveData called, but individual actions are preferred for Supabase.');
    }

    // Individual methods for better performance with Supabase
    async addCustomer(customer: Omit<Customer, 'id'>): Promise<Customer> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Você precisa estar logado para adicionar clientes.');

        const { data, error } = await supabase.from('customers').insert([{ ...customer, user_id: user.id }]).select().single();
        if (error) throw error;
        if (!data) throw new Error('Erro ao retornar dados do cliente após inserção.');

        return { id: data.id, name: data.name, phone: data.phone };
    }

    async updateCustomer(customer: Customer): Promise<void> {
        const { error } = await supabase.from('customers').update({ name: customer.name, phone: customer.phone }).eq('id', customer.id);
        if (error) throw error;
    }

    async deleteCustomer(id: string): Promise<void> {
        const { error } = await supabase.from('customers').delete().eq('id', id);
        if (error) throw error;
    }

    async addProduct(product: Omit<Product, 'id'>): Promise<Product> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Você precisa estar logado para adicionar produtos.');

        const { data, error } = await supabase.from('products').insert([{ ...product, user_id: user.id }]).select().single();
        if (error) throw error;
        if (!data) throw new Error('Erro ao retornar dados do produto após inserção.');

        return { id: data.id, name: data.name, category: data.category, price: Number(data.price), stock: data.stock };
    }

    async updateProduct(product: Product): Promise<void> {
        const { error } = await supabase.from('products').update({ name: product.name, category: product.category, price: product.price, stock: product.stock }).eq('id', product.id);
        if (error) throw error;
    }

    async deleteProduct(id: string): Promise<void> {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
    }

    async addSale(sale: Omit<Sale, 'id' | 'date' | 'paymentStatus'>): Promise<Sale> {
        const { data: { user } } = await supabase.auth.getUser();
        const paymentStatus = sale.paymentMethod === PaymentMethod.Fiado ? PaymentStatus.Fiado : PaymentStatus.Pago;
        
        const { data: saleData, error: saleError } = await supabase.from('sales').insert([{
            user_id: user?.id,
            customer_id: sale.customerId,
            total: sale.total,
            payment_method: sale.paymentMethod,
            payment_status: paymentStatus
        }]).select().single();

        if (saleError) throw saleError;

        const itemsToInsert = sale.items.map(item => ({
            sale_id: saleData.id,
            product_id: item.productId,
            quantity: item.quantity,
            subtotal: item.subtotal
        }));

        const { error: itemsError } = await supabase.from('sale_items').insert(itemsToInsert);
        if (itemsError) throw itemsError;

        // Update stock
        for (const item of sale.items) {
            await supabase.rpc('decrement_stock', { x: item.quantity, row_id: item.productId });
        }

        return {
            id: saleData.id,
            customerId: saleData.customer_id,
            date: saleData.date,
            total: Number(saleData.total),
            paymentMethod: saleData.payment_method as PaymentMethod,
            paymentStatus: saleData.payment_status as PaymentStatus,
            items: sale.items
        };
    }

    async payDebt(saleIds: string[]): Promise<void> {
        const { error } = await supabase.from('sales').update({ payment_status: PaymentStatus.Pago }).in('id', saleIds);
        if (error) throw error;
    }

    async deleteSale(id: string, items: SaleItem[]): Promise<void> {
        // Increment stock back
        for (const item of items) {
            await supabase.rpc('decrement_stock', { x: -item.quantity, row_id: item.productId });
        }
        const { error } = await supabase.from('sales').delete().eq('id', id);
        if (error) throw error;
    }

    async resetSales(): Promise<void> {
        console.log('ApiService: resetSales started');
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.error('ApiService: No user found for resetSales');
            throw new Error('Você precisa estar logado para resetar as vendas.');
        }
        
        try {
            // 1. Get all sale IDs first
            console.log('ApiService: Fetching sale IDs for user', user.id);
            const { data: sales, error: fetchSalesError } = await supabase
                .from('sales')
                .select('id')
                .eq('user_id', user.id);
            
            if (fetchSalesError) throw fetchSalesError;

            if (sales && sales.length > 0) {
                const saleIds = sales.map(s => s.id);
                console.log(`ApiService: Deleting ${saleIds.length} sales`);
                const { error: deleteSalesError } = await supabase
                    .from('sales')
                    .delete()
                    .in('id', saleIds);
                
                if (deleteSalesError) throw deleteSalesError;
            } else {
                console.log('ApiService: No sales found to delete');
            }

            // 2. Get all held order IDs
            console.log('ApiService: Fetching held order IDs for user', user.id);
            const { data: heldOrders, error: fetchHeldError } = await supabase
                .from('held_orders')
                .select('id')
                .eq('user_id', user.id);
            
            if (fetchHeldError) throw fetchHeldError;

            if (heldOrders && heldOrders.length > 0) {
                const heldIds = heldOrders.map(h => h.id);
                console.log(`ApiService: Deleting ${heldIds.length} held orders`);
                const { error: deleteHeldError } = await supabase
                    .from('held_orders')
                    .delete()
                    .in('id', heldIds);
                
                if (deleteHeldError) throw deleteHeldError;
            } else {
                console.log('ApiService: No held orders found to delete');
            }

            console.log('ApiService: resetSales completed successfully');
        } catch (error) {
            console.error('ApiService: Critical error in resetSales:', error);
            throw error;
        }
    }

    async holdOrder(order: Omit<HeldOrder, 'id' | 'heldAt'>): Promise<HeldOrder> {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: orderData, error: orderError } = await supabase.from('held_orders').insert([{
            user_id: user?.id,
            customer_id: order.customerId,
            total: order.total
        }]).select().single();

        if (orderError) throw orderError;

        const itemsToInsert = order.items.map(item => ({
            held_order_id: orderData.id,
            product_id: item.productId,
            quantity: item.quantity,
            subtotal: item.subtotal
        }));

        const { error: itemsError } = await supabase.from('held_order_items').insert(itemsToInsert);
        if (itemsError) throw itemsError;

        return {
            id: orderData.id,
            customerId: orderData.customer_id,
            total: Number(orderData.total),
            heldAt: orderData.held_at,
            items: order.items
        };
    }

    async deleteHeldOrder(id: string): Promise<void> {
        const { error } = await supabase.from('held_orders').delete().eq('id', id);
        if (error) throw error;
    }

    async updateBarInfo(info: BarInfo): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('bar_info').upsert({
            user_id: user?.id,
            ...info
        });
        if (error) throw error;
    }

    async getUsersList(): Promise<User[]> {
        const { data, error } = await supabase.from('profiles').select('*');
        if (error) throw error;
        return data.map(p => ({ id: p.id, name: p.name, email: p.email }));
    }

    async deleteUser(id: string): Promise<void> {
        // Note: auth.users deletion usually requires admin privileges or specific setup
        // For now we just delete the profile if RLS allows or handle it via a function
        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (error) throw error;
    }

    async updateUser(user: User): Promise<void> {
        const { error } = await supabase.from('profiles').update({ name: user.name }).eq('id', user.id);
        if (error) throw error;
    }
}

export const apiService = new ApiService();
