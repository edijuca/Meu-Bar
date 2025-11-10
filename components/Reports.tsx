import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import { Sale } from '../types';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';

const Reports: React.FC = () => {
    const { state } = useContext(AppContext);
    const { sales, products } = state;

    const [period, setPeriod] = useState<'7d' | 'month' | 'year' | 'custom'>('7d');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (!startDate && !endDate) {
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 6); // Include today
        setStartDate(sevenDaysAgo.toISOString().split('T')[0]);
        setEndDate(todayStr);
    }
    
    const handlePeriodChange = (newPeriod: '7d' | 'month' | 'year' | 'custom') => {
        setPeriod(newPeriod);
        const today = new Date();
        let start = new Date(today);

        switch (newPeriod) {
            case '7d':
                start.setDate(today.getDate() - 6);
                setStartDate(start.toISOString().split('T')[0]);
                setEndDate(today.toISOString().split('T')[0]);
                break;
            case 'month':
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                setStartDate(start.toISOString().split('T')[0]);
                setEndDate(today.toISOString().split('T')[0]);
                break;
            case 'year':
                start = new Date(today.getFullYear(), 0, 1);
                setStartDate(start.toISOString().split('T')[0]);
                setEndDate(today.toISOString().split('T')[0]);
                break;
            case 'custom':
                 // Let user select dates
                break;
        }
    };
    
    const filteredSales = useMemo(() => {
        if (!startDate || !endDate) return [];
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        
        return sales.filter(sale => {
            const saleDate = new Date(sale.date);
            return saleDate >= start && saleDate <= end;
        });
    }, [sales, startDate, endDate]);

    const reportData = useMemo(() => {
        const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
        const totalSalesCount = filteredSales.length;
        const averageSaleValue = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;
        
        const productCount: { [key: string]: { name: string, quantity: number } } = {};
        filteredSales.forEach(sale => {
            sale.items.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                if (product) {
                    if (!productCount[item.productId]) {
                        productCount[item.productId] = { name: product.name, quantity: 0 };
                    }
                    productCount[item.productId].quantity += item.quantity;
                }
            });
        });
        const topSellingProducts = Object.values(productCount)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);
            
        const salesByDay: { [key: string]: number } = {};
        filteredSales.forEach(sale => {
            const day = new Date(sale.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            if (!salesByDay[day]) {
                salesByDay[day] = 0;
            }
            salesByDay[day] += sale.total;
        });

        const chartData = Object.entries(salesByDay)
            .map(([date, total]) => ({ date, total }))
            .sort((a, b) => {
                const [dayA, monthA] = a.date.split('/');
                const [dayB, monthB] = b.date.split('/');
                return new Date(`${monthA}/${dayA}/2000`).getTime() - new Date(`${monthB}/${dayB}/2000`).getTime();
            });

        return { totalRevenue, totalSalesCount, averageSaleValue, topSellingProducts, chartData };
    }, [filteredSales, products]);
    
    const PeriodButton: React.FC<{ label: string; value: typeof period; }> = ({ label, value }) => (
        <button
            onClick={() => handlePeriodChange(value)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                period === value ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="p-4 md:p-6 space-y-6">
            <h1 className="text-3xl font-bold text-white">Relatório de Vendas</h1>

            <div className="bg-gray-800 p-4 rounded-lg shadow-lg flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex items-center gap-2 flex-wrap">
                    <PeriodButton label="Últimos 7 dias" value="7d" />
                    <PeriodButton label="Este Mês" value="month" />
                    <PeriodButton label="Este Ano" value="year" />
                    <PeriodButton label="Customizado" value="custom" />
                </div>
                {period === 'custom' && (
                    <div className="flex items-center gap-2 flex-wrap">
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-indigo-500"/>
                        <span className="text-gray-400">até</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-indigo-500"/>
                    </div>
                )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h2 className="text-gray-400 text-sm font-medium">Faturamento Total</h2>
                    <p className="text-3xl font-semibold text-white mt-1">
                        {reportData.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h2 className="text-gray-400 text-sm font-medium">Total de Vendas</h2>
                    <p className="text-3xl font-semibold text-white mt-1">{reportData.totalSalesCount}</p>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h2 className="text-gray-400 text-sm font-medium">Ticket Médio</h2>
                    <p className="text-3xl font-semibold text-white mt-1">
                         {reportData.averageSaleValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h2 className="text-xl font-semibold mb-4 text-white">Vendas por Dia</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={reportData.chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
                            <XAxis dataKey="date" stroke="#9ca3af" tick={{ fill: '#d1d5db' }} />
                            <YAxis stroke="#9ca3af" tick={{ fill: '#d1d5db' }} tickFormatter={(value: number) => `R$${value}`} />
                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
                            <Legend wrapperStyle={{ color: '#d1d5db' }}/>
                            <Line type="monotone" dataKey="total" stroke="#818cf8" strokeWidth={2} name="Total (R$)"/>
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h2 className="text-xl font-semibold mb-4 text-white">Produtos Mais Vendidos</h2>
                    {reportData.topSellingProducts.length > 0 ? (
                        <ul className="space-y-3">
                            {reportData.topSellingProducts.map((product, index) => (
                                <li key={index} className="flex justify-between items-center bg-gray-700/50 p-3 rounded-md">
                                    <span className="font-medium text-gray-300">{product.name}</span>
                                    <span className="font-bold text-white bg-indigo-600 px-2 py-1 text-sm rounded-md">{product.quantity}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                           <p className="text-gray-500">Nenhum produto vendido no período.</p>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};

export default Reports;