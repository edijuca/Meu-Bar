
-- Enable RLS
-- Profiles table (linked to Auth)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Customers table
CREATE TABLE customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own customers" ON customers FOR ALL USING (auth.uid() = user_id);

-- Products table
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own products" ON products FOR ALL USING (auth.uid() = user_id);

-- Sales table
CREATE TABLE sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES customers ON DELETE SET NULL,
  date TIMESTAMPTZ DEFAULT now(),
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own sales" ON sales FOR ALL USING (auth.uid() = user_id);

-- Sale Items table
CREATE TABLE sale_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID REFERENCES sales ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0
);

ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own sale items" ON sale_items FOR ALL USING (
  EXISTS (SELECT 1 FROM sales WHERE sales.id = sale_id AND sales.user_id = auth.uid())
);

-- Held Orders table
CREATE TABLE held_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES customers ON DELETE SET NULL,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  held_at TIMESTAMPTZ DEFAULT now(),
  clearing_sale_ids UUID[] DEFAULT '{}',
  initial_items JSONB DEFAULT '[]'
);

ALTER TABLE held_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own held orders" ON held_orders FOR ALL USING (auth.uid() = user_id);

-- Held Order Items table
CREATE TABLE held_order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  held_order_id UUID REFERENCES held_orders ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0
);

ALTER TABLE held_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own held order items" ON held_order_items FOR ALL USING (
  EXISTS (SELECT 1 FROM held_orders WHERE held_orders.id = held_order_id AND held_orders.user_id = auth.uid())
);

-- Bar Info table
CREATE TABLE bar_info (
  user_id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT
);

ALTER TABLE bar_info ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own bar info" ON bar_info FOR ALL USING (auth.uid() = user_id);

-- Function to handle new user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (new.id, new.raw_user_meta_data->>'name', new.email);
  
  INSERT INTO public.bar_info (user_id, name, email)
  VALUES (new.id, 'Meu Bar', new.email);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to decrement stock
CREATE OR REPLACE FUNCTION decrement_stock(row_id UUID, x INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE products
  SET stock = stock - x
  WHERE id = row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
