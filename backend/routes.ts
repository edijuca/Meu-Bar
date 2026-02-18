import express, { Request, Response } from 'express';
import { pool } from './db';

const router = express.Router();

// --- Helpers ---
const query = (text: string, params?: any[]) => pool.query(text, params);

const toCamelCase = (row: any) => {
    const newRow: any = {};
    for (const key in row) {
        const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        newRow[camelKey] = row[key];
    }
    return newRow;
};

const mapSale = (sale: any, items: any[]) => ({
    ...toCamelCase(sale),
    items: items.map(toCamelCase).map((i: any) => ({ ...i, subtotal: parseFloat(i.subtotal) })),
    total: parseFloat(sale.total)
});

const mapHeldOrder = (order: any, items: any[]) => ({
    ...toCamelCase(order),
    items: items.map(toCamelCase).map((i: any) => ({ ...i, subtotal: parseFloat(i.subtotal) })),
    total: parseFloat(order.total)
});


// --- Auth ---
router.post('/auth/register', async (req: Request, res: Response): Promise<any> => {
    const { name, email, password } = req.body;
    try {
        const result = await query(
            'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *',
            [name, email, password]
        );
        res.json(toCamelCase(result.rows[0]));

    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/auth/login', async (req: Request, res: Response): Promise<any> => {
    const { email, password } = req.body;
    try {
        const result = await query('SELECT * FROM users WHERE email = $1 AND password = $2', [email, password]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        res.json(toCamelCase(result.rows[0]));

    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// --- Data Sync (Initial Load) ---
router.get('/data', async (req: Request, res: Response) => {
    try {
        const customers = await query('SELECT * FROM customers');
        const products = await query('SELECT * FROM products');
        const sales = await query('SELECT * FROM sales');
        const saleItems = await query('SELECT * FROM sale_items');
        const heldOrders = await query('SELECT * FROM held_orders');
        const heldOrderItems = await query('SELECT * FROM held_order_items');
        const barInfo = await query('SELECT * FROM bar_info LIMIT 1');

        // Stitch items to sales/orders
        const salesWithItems = sales.rows.map((s: any) => {
            const items = saleItems.rows.filter((i: any) => i.sale_id === s.id);
            return mapSale(s, items);
        });

        const heldOrdersWithItems = heldOrders.rows.map((h: any) => {
            const items = heldOrderItems.rows.filter((i: any) => i.held_order_id === h.id);
            return mapHeldOrder(h, items);
        });

        res.json({
            customers: customers.rows.map(toCamelCase),
            products: products.rows.map((p: any) => ({ ...toCamelCase(p), price: parseFloat(p.price) })),
            sales: salesWithItems,
            heldOrders: heldOrdersWithItems,
            barInfo: toCamelCase(barInfo.rows[0] || {}),
        });

    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// --- Customers ---
router.post('/customers', async (req: Request, res: Response) => {
    const { name, phone } = req.body;
    try {
        const result = await query('INSERT INTO customers (name, phone) VALUES ($1, $2) RETURNING *', [name, phone]);
        res.json(toCamelCase(result.rows[0]));
    } catch (err: any) {

        res.status(500).json({ error: err.message });
    }
});

router.put('/customers/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, phone } = req.body;
    try {
        const result = await query('UPDATE customers SET name = $1, phone = $2 WHERE id = $3 RETURNING *', [name, phone, id]);
        res.json(toCamelCase(result.rows[0]));
    } catch (err: any) {

        res.status(500).json({ error: err.message });
    }
});

router.delete('/customers/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await query('DELETE FROM customers WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// --- Products ---
router.post('/products', async (req: Request, res: Response) => {
    const { name, category, price, stock } = req.body;
    try {
        const result = await query(
            'INSERT INTO products (name, category, price, stock) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, category, price, stock]
        );
        res.json({ ...toCamelCase(result.rows[0]), price: parseFloat(result.rows[0].price) });
    } catch (err: any) {

        res.status(500).json({ error: err.message });
    }
});

router.put('/products/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, category, price, stock } = req.body;
    try {
        const result = await query(
            'UPDATE products SET name = $1, category = $2, price = $3, stock = $4 WHERE id = $5 RETURNING *',
            [name, category, price, stock, id]
        );
        res.json({ ...toCamelCase(result.rows[0]), price: parseFloat(result.rows[0].price) });
    } catch (err: any) {

        res.status(500).json({ error: err.message });
    }
});

router.delete('/products/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await query('DELETE FROM products WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// --- Sales ---
router.post('/sales', async (req: Request, res: Response) => {
    const { customerId, items, total, paymentMethod } = req.body;
    const paymentStatus = paymentMethod === 'Fiado' ? 'Fiado' : 'Pago';
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Insert Sale
        const saleRes = await client.query(
            'INSERT INTO sales (customer_id, total, payment_method, payment_status, date) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
            [customerId, total, paymentMethod, paymentStatus]
        );
        const sale = saleRes.rows[0];

        // Insert Items and Update Stock
        for (const item of items) {
            await client.query(
                'INSERT INTO sale_items (sale_id, product_id, quantity, subtotal) VALUES ($1, $2, $3, $4)',
                [sale.id, item.productId, item.quantity, item.subtotal]
            );

            await client.query(
                'UPDATE products SET stock = stock - $1 WHERE id = $2',
                [item.quantity, item.productId]
            );
        }

        await client.query('COMMIT');

        // Return full sale object with items (items provided in input should already be correct format, but let's be safe)
        // Adjust sale object to camelCase
        res.json({ ...toCamelCase(sale), items, total: parseFloat(sale.total) });
    } catch (err: any) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

router.post('/sales/pay-debt', async (req: Request, res: Response) => {
    const { saleIds } = req.body; // Array of sale IDs to mark as paid
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        for (const id of saleIds) {
            await client.query('UPDATE sales SET payment_status = $1 WHERE id = $2', ['Pago', id]);
        }
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err: any) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// --- Held Orders ---
router.post('/held-orders', async (req: Request, res: Response) => {
    const { customerId, items, total } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        const orderRes = await client.query(
            'INSERT INTO held_orders (customer_id, total, held_at) VALUES ($1, $2, NOW()) RETURNING *',
            [customerId, total]
        );
        const order = orderRes.rows[0];

        for (const item of items) {
            await client.query(
                'INSERT INTO held_order_items (held_order_id, product_id, quantity, subtotal) VALUES ($1, $2, $3, $4)',
                [order.id, item.productId, item.quantity, item.subtotal]
            );
        }
        await client.query('COMMIT');
        res.json({ ...toCamelCase(order), items, total: parseFloat(order.total) });
    } catch (err: any) {

        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

router.delete('/held-orders/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await query('DELETE FROM held_orders WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// --- Bar Info ---
router.put('/bar-info', async (req: Request, res: Response) => {
    const { name, email, phone, address } = req.body;
    try {
        // Assuming single row with ID 1, or update where something
        // Just update all (should actully be one)
        const result = await query(
            'UPDATE bar_info SET name = $1, email = $2, phone = $3, address = $4 RETURNING *',
            [name, email, phone, address]
        );
        res.json(toCamelCase(result.rows[0]));
    } catch (err: any) {

        res.status(500).json({ error: err.message });
    }
});

export default router;
