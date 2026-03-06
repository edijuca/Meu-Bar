
import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { Sale } from '../types';
import { BanknotesIcon, TrashIcon } from './icons';

const SalesHistory: React.FC = () => {
    const { state } = useContext(AppContext);
    const { sales, customers, products } = state;
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

    const sortedSales = useMemo(() => {
        return [...sales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [sales]);

    const filteredSales = useMemo(() => {
        return sortedSales.filter(sale => {
            const customer = customers.find(c => c.id === sale.customerId);
            const customerName = (customer?.name || '').toLowerCase();
            const saleId = (sale.id || '').toLowerCase();
            const search = searchTerm.toLowerCase();
            return customerName.includes(search) || saleId.includes(search);
        });
    }, [sortedSales, customers, searchTerm]);

    const getCustomerName = (customerId: string) => {
        return customers.find(c => c.id === customerId)?.name || 'Cliente Desconhecido';
    };

    const getProductName = (productId: string) => {
        return products.find(p => p.id === productId)?.name || 'Produto Desconhecido';
    };

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-3xl font-bold text-white">Histórico de Vendas</h1>
                <div className="w-full md:w-64">
                    <input
                        type="text"
                        placeholder="Buscar por cliente ou ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
            </div>

            <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-700 text-gray-300 uppercase text-xs font-semibold tracking-wider">
                                <th className="px-3 md:px-6 py-4">Data/Hora</th>
                                <th className="px-3 md:px-6 py-4">Cliente</th>
                                <th className="hidden sm:table-cell px-3 md:px-6 py-4">Método</th>
                                <th className="px-3 md:px-6 py-4">Status</th>
                                <th className="px-3 md:px-6 py-4 text-right">Total</th>
                                <th className="px-3 md:px-6 py-4 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {filteredSales.length > 0 ? (
                                filteredSales.map((sale) => (
                                    <tr key={sale.id} className="hover:bg-gray-700/50 transition-colors">
                                        <td className="px-3 md:px-6 py-4 text-xs md:text-sm text-gray-300">
                                            {new Date(sale.date).toLocaleDateString('pt-BR')}
                                            <span className="block text-[10px] md:text-xs text-gray-500">
                                                {new Date(sale.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </td>
                                        <td className="px-3 md:px-6 py-4 text-xs md:text-sm font-medium text-white truncate max-w-[100px] md:max-w-none">
                                            {getCustomerName(sale.customerId)}
                                        </td>
                                        <td className="hidden sm:table-cell px-3 md:px-6 py-4 text-xs md:text-sm text-gray-400">
                                            {sale.paymentMethod}
                                        </td>
                                        <td className="px-3 md:px-6 py-4 text-xs md:text-sm">
                                            <span className={`px-2 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-bold ${
                                                sale.paymentStatus === 'Pago' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                                            }`}>
                                                {sale.paymentStatus}
                                            </span>
                                        </td>
                                        <td className="px-3 md:px-6 py-4 text-xs md:text-sm font-bold text-white text-right">
                                            {sale.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </td>
                                        <td className="px-3 md:px-6 py-4 text-center">
                                            <button
                                                onClick={() => setSelectedSale(sale)}
                                                className="text-indigo-400 hover:text-indigo-300 font-medium text-xs md:text-sm"
                                            >
                                                Ver
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                                        Nenhuma venda encontrada.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Sale Details Modal */}
            {selectedSale && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-gray-700 px-6 py-4 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">Detalhes da Venda</h2>
                            <button onClick={() => setSelectedSale(null)} className="text-gray-400 hover:text-white transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-400 uppercase text-xs font-bold tracking-wider">Cliente</p>
                                    <p className="text-white font-medium">{getCustomerName(selectedSale.customerId)}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 uppercase text-xs font-bold tracking-wider">Data</p>
                                    <p className="text-white font-medium">{new Date(selectedSale.date).toLocaleString('pt-BR')}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 uppercase text-xs font-bold tracking-wider">Pagamento</p>
                                    <p className="text-white font-medium">{selectedSale.paymentMethod}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 uppercase text-xs font-bold tracking-wider">Status</p>
                                    <p className={`font-bold ${selectedSale.paymentStatus === 'Pago' ? 'text-green-400' : 'text-red-400'}`}>
                                        {selectedSale.paymentStatus}
                                    </p>
                                </div>
                            </div>

                            <div className="border-t border-gray-700 pt-4">
                                <p className="text-gray-400 uppercase text-xs font-bold tracking-wider mb-2">Itens</p>
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                    {selectedSale.items.map((item, index) => (
                                        <div key={index} className="flex justify-between items-center bg-gray-900/50 p-2 rounded-md">
                                            <div>
                                                <p className="text-white text-sm font-medium">{getProductName(item.productId)}</p>
                                                <p className="text-gray-400 text-xs">{item.quantity}x { (item.subtotal / item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }</p>
                                            </div>
                                            <p className="text-white font-bold text-sm">{item.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="border-t border-gray-700 pt-4 flex justify-between items-center">
                                <span className="text-xl font-bold text-white">Total</span>
                                <span className="text-2xl font-black text-indigo-400">
                                    {selectedSale.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                            </div>
                        </div>
                        <div className="bg-gray-700/50 px-6 py-4 flex justify-end">
                            <button
                                onClick={() => setSelectedSale(null)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md transition-colors"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalesHistory;
