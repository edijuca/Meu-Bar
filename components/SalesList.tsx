import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { PaymentStatus } from '../constants';

const SalesList: React.FC = () => {
    const { state } = useContext(AppContext);
    const { sales, customers } = state;
    const [searchTerm, setSearchTerm] = useState('');

    const filteredSales = useMemo(() => {
        return sales.filter(sale => {
            const customer = customers.find(c => c.id === sale.customerId);
            const customerName = customer ? customer.name.toLowerCase() : '';
            return customerName.includes(searchTerm.toLowerCase());
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [sales, customers, searchTerm]);

    return (
        <div className="p-4 md:p-6 space-y-6">
            <h1 className="text-3xl font-bold text-white">Histórico de Vendas</h1>

            <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="Buscar por cliente..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full md:w-1/3 bg-gray-700 border border-gray-600 rounded-md py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-gray-300">
                        <thead className="bg-gray-700 text-gray-100 uppercase text-xs">
                            <tr>
                                <th className="py-3 px-4">Data</th>
                                <th className="py-3 px-4">Cliente</th>
                                <th className="py-3 px-4">Total</th>
                                <th className="py-3 px-4">Pagamento</th>
                                <th className="py-3 px-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {filteredSales.length > 0 ? (
                                filteredSales.map(sale => {
                                    const customer = customers.find(c => c.id === sale.customerId);
                                    return (
                                        <tr key={sale.id} className="hover:bg-gray-700/50 transition-colors">
                                            <td className="py-3 px-4">{new Date(sale.date).toLocaleString('pt-BR')}</td>
                                            <td className="py-3 px-4 font-medium text-white">{customer?.name || 'Cliente Desconhecido'}</td>
                                            <td className="py-3 px-4">{sale.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                            <td className="py-3 px-4">{sale.paymentMethod}</td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${sale.paymentStatus === PaymentStatus.Pago
                                                        ? 'bg-green-900 text-green-300'
                                                        : 'bg-red-900 text-red-300'
                                                    }`}>
                                                    {sale.paymentStatus}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-gray-500">
                                        Nenhuma venda encontrada.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SalesList;
