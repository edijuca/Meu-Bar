
import React, { useContext, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import { Sale, Product } from '../types';
import { PaymentMethod, PaymentStatus } from '../constants';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Dashboard: React.FC = () => {
    const { state } = useContext(AppContext);
    const { sales, customers } = state;

    const today = new Date().toISOString().split('T')[0];

    const todaySales = useMemo(() => sales.filter(sale => sale.date.startsWith(today)), [sales, today]);
    
    const totalSalesToday = useMemo(() => 
        todaySales.reduce((sum, sale) => sum + sale.total, 0), 
        [todaySales]
    );

    const customersToday = useMemo(() => 
        new Set(todaySales.map(sale => sale.customerId)).size, 
        [todaySales]
    );

    const totalFiado = useMemo(() =>
        sales.filter(s => s.paymentStatus === PaymentStatus.Fiado)
             .reduce((sum, sale) => sum + sale.total, 0),
        [sales]
    );

    const salesByPaymentMethod = useMemo(() => {
        const data = Object.values(PaymentMethod).map(method => ({ name: method, value: 0 }));
        sales.forEach(sale => {
            const entry = data.find(d => d.name === sale.paymentMethod);
            if (entry) {
                entry.value += sale.total;
            }
        });
        return data.filter(d => d.value > 0);
    }, [sales]);

    const topSellingProducts = useMemo(() => {
        const productCount: { [key: string]: { name: string, quantity: number } } = {};
        sales.forEach(sale => {
            sale.items.forEach(item => {
                const product = state.products.find(p => p.id === item.productId);
                if (product) {
                    if (!productCount[item.productId]) {
                        productCount[item.productId] = { name: product.name, quantity: 0 };
                    }
                    productCount[item.productId].quantity += item.quantity;
                }
            });
        });
        return Object.values(productCount)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);
    }, [sales, state.products]);

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];

    return (
        <div className="p-4 md:p-6 space-y-6">
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h2 className="text-gray-400 text-sm font-medium">Atendimentos de Hoje</h2>
                    <p className="text-3xl font-semibold text-white mt-1">
                        {totalSalesToday.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h2 className="text-gray-400 text-sm font-medium">Clientes Atendidos Hoje</h2>
                    <p className="text-3xl font-semibold text-white mt-1">{customersToday}</p>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h2 className="text-gray-400 text-sm font-medium">Total em Fiado</h2>
                    <p className="text-3xl font-semibold text-red-400 mt-1">
                        {totalFiado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h2 className="text-xl font-semibold mb-4 text-white">Atendimentos por Forma de Pagamento</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={salesByPaymentMethod}>
                            <XAxis dataKey="name" stroke="#9ca3af" tick={{ fill: '#d1d5db' }} />
                            <YAxis stroke="#9ca3af" tick={{ fill: '#d1d5db' }} tickFormatter={(value: number) => `R$${value}`} />
                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
                            <Legend wrapperStyle={{ color: '#d1d5db' }}/>
                            <Bar dataKey="value" fill="#4f46e5" name="Total (R$)"/>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h2 className="text-xl font-semibold mb-4 text-white">Produtos Mais Vendidos</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={topSellingProducts} dataKey="quantity" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                                {topSellingProducts.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
                            <Legend wrapperStyle={{ color: '#d1d5db' }}/>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
