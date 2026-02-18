import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
});

const createTables = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Users
        await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL
      );
    `);

        // Customers
        await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50)
      );
    `);

        // Products
        await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0
      );
    `);

        // Sales
        await client.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        total DECIMAL(10, 2) NOT NULL,
        payment_method VARCHAR(50),
        payment_status VARCHAR(50)
      );
    `);

        // Sale Items
        await client.query(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id SERIAL PRIMARY KEY,
        sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id),
        quantity INTEGER NOT NULL,
        subtotal DECIMAL(10, 2) NOT NULL
      );
    `);

        // Held Orders
        await client.query(`
      CREATE TABLE IF NOT EXISTS held_orders (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        total DECIMAL(10, 2) NOT NULL,
        held_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // Held Order Items
        await client.query(`
      CREATE TABLE IF NOT EXISTS held_order_items (
        id SERIAL PRIMARY KEY,
        held_order_id INTEGER REFERENCES held_orders(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id),
        quantity INTEGER NOT NULL,
        subtotal DECIMAL(10, 2) NOT NULL
      );
    `);

        // Bar Info
        await client.query(`
      CREATE TABLE IF NOT EXISTS bar_info (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT
      );
    `);

        // Seed Bar Info if empty
        const barInfoRes = await client.query('SELECT COUNT(*) FROM bar_info');
        if (parseInt(barInfoRes.rows[0].count) === 0) {
            await client.query(`
            INSERT INTO bar_info (name, email, phone, address)
            VALUES ('Meu Bar Incrível', 'contato@meubar.com', '(11) 99999-8888', 'Rua das Cervejas, 123 - Bairro Boêmio')
        `);
        }

        await client.query('COMMIT');
        console.log('Tables created successfully');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Error creating tables', e);
    } finally {
        client.release();
    }
};

export { pool, createTables };
