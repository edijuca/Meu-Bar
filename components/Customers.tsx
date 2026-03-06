import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import { Customer, Sale } from '../types';
import { PaymentStatus } from '../constants';
import Modal from './common/Modal';
import { PlusIcon, PencilIcon, TrashIcon, BanknotesIcon } from './icons';

const CustomerForm: React.FC<{ customer?: Customer; onSave: (customer: Omit<Customer, 'id'>) => void; onCancel: () => void }> = ({ customer, onSave, onCancel }) => {
    const [name, setName] = useState(customer?.name || '');
    const [phone, setPhone] = useState(customer?.phone || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSave({ name, phone });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300">Nome</label>
                <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-300">Telefone</label>
                <input type="tel" id="phone" value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div className="flex justify-end space-x-3 pt-2">
                <button type="button" onClick={onCancel} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition-colors">Cancelar</button>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors">Salvar</button>
            </div>
        </form>
    );
};

const CustomerDetailsModal: React.FC<{ customer: Customer; sales: Sale[]; onClose: () => void; onPay: (customerId: string, amount: number) => void }> = ({ customer, sales, onClose, onPay }) => {
    const { state } = useContext(AppContext);
    const customerSales = sales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const totalDebt = customerSales.filter(s => s.paymentStatus === PaymentStatus.Fiado).reduce((sum, s) => sum + s.total, 0);

    return (
        <Modal isOpen={true} onClose={onClose} title={`Detalhes de ${customer.name}`} size="lg">
            <div className="space-y-4">
                <p><span className="font-semibold">Telefone:</span> {customer.phone || 'Não informado'}</p>
                {totalDebt > 0 && (
                    <div className="bg-red-900/50 p-4 rounded-md flex justify-between items-center">
                        <div>
                            <p className="font-semibold text-red-300">Dívida Total</p>
                            <p className="text-xl text-red-200 font-bold">{totalDebt.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        </div>
                        <button onClick={() => onPay(customer.id, totalDebt)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition-colors">Quitar Dívida</button>
                    </div>
                )}
                <h3 className="text-lg font-semibold border-t border-gray-700 pt-4 mt-4">Histórico de Compras</h3>
                <div className="max-h-64 overflow-y-auto pr-2">
                    {customerSales.length > 0 ? (
                        <ul className="space-y-3">
                            {customerSales.map(sale => {
                                const productsInSale = sale.items.map(item => {
                                    const product = state.products.find(p => p.id === item.productId);
                                    return `${item.quantity}x ${product?.name || 'Produto desconhecido'}`;
                                }).join(', ');
                                return (
                                    <li key={sale.id} className="bg-gray-700 p-3 rounded-md">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold">{new Date(sale.date).toLocaleDateString('pt-BR')}</p>
                                                <p className="text-sm text-gray-400">{productsInSale}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold">{sale.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${sale.paymentStatus === PaymentStatus.Pago ? 'bg-green-500 text-green-900' : 'bg-yellow-500 text-yellow-900'}`}>
                                                    {sale.paymentStatus}
                                                </span>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <p className="text-gray-400">Nenhuma compra registrada.</p>
                    )}
                </div>
            </div>
        </Modal>
    );
};


const Customers: React.FC = () => {
    const { state, actions } = useContext(AppContext);
    const { customers, sales } = state;

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>(undefined);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

    const customerDebts = useMemo(() => {
        const debts = new Map<string, number>();
        sales.forEach(sale => {
            if (sale.paymentStatus === PaymentStatus.Fiado) {
                const currentDebt = debts.get(sale.customerId) || 0;
                // FIX: Ensure both operands are treated as numbers to avoid type errors.
                debts.set(sale.customerId, currentDebt + Number(sale.total));
            }
        });
        return debts;
    }, [sales]);

    const totalOutstandingDebt = useMemo(() => {
        return Array.from(customerDebts.values()).reduce((sum: number, debt: number) => sum + debt, 0);
    }, [customerDebts]);

    const filteredCustomers = useMemo(() => 
        customers.filter(customer =>
            (customer.name || '').toLowerCase().includes(searchTerm.toLowerCase())
        ), [customers, searchTerm]
    );

    const handleSaveCustomer = async (customerData: Omit<Customer, 'id'>) => {
        try {
            if (editingCustomer) {
                await actions.updateCustomer({ ...customerData, id: editingCustomer.id });
            } else {
                await actions.addCustomer(customerData);
            }
            setIsModalOpen(false);
            setEditingCustomer(undefined);
        } catch (error: any) {
            alert(error.message || 'Erro ao salvar cliente. Verifique sua conexão e se o banco de dados está configurado.');
        }
    };

    const handleEdit = (customer: Customer) => {
        setEditingCustomer(customer);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este cliente? Todas as suas vendas também serão removidas.')) {
            await actions.deleteCustomer(id);
        }
    };
    
    const handlePayDebt = async (customerId: string, amount: number) => {
        const unpaidSales = sales.filter(s => s.customerId === customerId && s.paymentStatus === PaymentStatus.Fiado);
        
        // Consolidate all items from unpaid sales
        const consolidatedItemsMap = new Map<string, { productId: string, quantity: number, subtotal: number }>();
        
        unpaidSales.forEach(sale => {
            sale.items.forEach(item => {
                const existing = consolidatedItemsMap.get(item.productId);
                if (existing) {
                    existing.quantity += item.quantity;
                    existing.subtotal += item.subtotal;
                } else {
                    consolidatedItemsMap.set(item.productId, { ...item });
                }
            });
        });
        
        const allItems = Array.from(consolidatedItemsMap.values());
        const unpaidSaleIds = unpaidSales.map(s => s.id);
        
        // Set active sale in context and switch to sales view
        actions.setActiveSale(customerId, allItems, unpaidSaleIds);
        actions.setView('sales');
        
        setSelectedCustomer(null);
    };


    return (
        <div className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h1 className="text-2xl md:text-3xl font-bold text-white">Clientes</h1>
                <button onClick={() => { setEditingCustomer(undefined); setIsModalOpen(true); }} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md flex items-center justify-center gap-2 transition-colors">
                    <PlusIcon className="w-5 h-5" />
                    Novo Cliente
                </button>
            </div>
            
            {totalOutstandingDebt > 0 && (
                <div className="bg-red-800/60 border border-red-700/80 p-4 rounded-lg shadow-md mb-6 flex items-center gap-3 md:gap-4">
                    <div className="flex-shrink-0">
                        <BanknotesIcon className="h-6 w-6 md:h-8 md:w-8 text-red-300" />
                    </div>
                    <div className="flex-grow flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                        <div>
                            <h2 className="text-sm md:text-lg font-semibold text-red-200 leading-tight">Total em Aberto (Fiado)</h2>
                            <p className="hidden sm:block text-[10px] md:text-xs text-red-300">Soma de todas as dívidas de clientes.</p>
                        </div>
                        <p className="text-xl md:text-2xl font-bold text-white">
                            {totalOutstandingDebt.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    </div>
                </div>
            )}

            <input
                type="text"
                placeholder="Buscar cliente pelo nome..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-4 text-white mb-6 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                <ul className="divide-y divide-gray-700">
                    {filteredCustomers.map(customer => {
                        const debt = customerDebts.get(customer.id);
                        return (
                            <li key={customer.id} className="p-4 hover:bg-gray-700/50 transition-colors flex items-center justify-between gap-4">
                                <div className="cursor-pointer flex-grow min-w-0" onClick={() => setSelectedCustomer(customer)}>
                                    <p className="font-semibold text-white truncate">{customer.name}</p>
                                    <p className="text-xs md:text-sm text-gray-400 truncate">{customer.phone}</p>
                                    {debt && <p className="text-xs md:text-sm text-red-400 font-semibold">Débito: {debt.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>}
                                </div>
                                <div className="flex items-center space-x-2 md:space-x-3 flex-shrink-0">
                                    <button onClick={() => handleEdit(customer)} className="p-1 text-gray-400 hover:text-indigo-400 transition-colors"><PencilIcon className="w-5 h-5" /></button>
                                    <button onClick={() => handleDelete(customer.id)} className="p-1 text-gray-400 hover:text-red-400 transition-colors"><TrashIcon className="w-5 h-5" /></button>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </div>

            {isModalOpen && (
                <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCustomer ? "Editar Cliente" : "Novo Cliente"}>
                    <CustomerForm customer={editingCustomer} onSave={handleSaveCustomer} onCancel={() => setIsModalOpen(false)} />
                </Modal>
            )}

            {selectedCustomer && (
                <CustomerDetailsModal 
                    customer={selectedCustomer} 
                    sales={sales.filter(s => s.customerId === selectedCustomer.id)} 
                    onClose={() => setSelectedCustomer(null)}
                    onPay={handlePayDebt}
                />
            )}
        </div>
    );
};

export default Customers;