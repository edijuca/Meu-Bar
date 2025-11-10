import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import { Customer, Product, SaleItem, HeldOrder } from '../types';
import { PaymentMethod, PaymentStatus } from '../constants';
import Modal from './common/Modal';
import { PlusIcon, TrashIcon, CreditCardIcon, PauseIcon } from './icons';

const Sales: React.FC = () => {
    const { state, dispatch } = useContext(AppContext);
    const { customers, products, heldOrders } = state;

    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const [currentSaleItems, setCurrentSaleItems] = useState<SaleItem[]>([]);
    const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.Dinheiro);
    const [searchTerm, setSearchTerm] = useState('');

    const availableProducts = useMemo(() =>
        products.filter(p => p.stock > 0),
        [products]
    );

    const selectedCustomer = useMemo(() =>
        customers.find(c => c.id === selectedCustomerId),
        [customers, selectedCustomerId]
    );

    const saleTotal = useMemo(() =>
        currentSaleItems.reduce((sum, item) => sum + item.subtotal, 0),
        [currentSaleItems]
    );
    
    const filteredProducts = useMemo(() =>
        availableProducts.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())),
        [availableProducts, searchTerm]
    );

    const handleAddProduct = (product: Product) => {
        const existingItem = currentSaleItems.find(item => item.productId === product.id);
        const productInStock = products.find(p => p.id === product.id);
        
        if (!productInStock || productInStock.stock <= (existingItem?.quantity || 0)) {
            alert('Produto sem estoque suficiente.');
            return;
        }

        if (existingItem) {
            setCurrentSaleItems(currentSaleItems.map(item =>
                item.productId === product.id
                    ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * product.price }
                    : item
            ));
        } else {
            setCurrentSaleItems([...currentSaleItems, { productId: product.id, quantity: 1, subtotal: product.price }]);
        }
    };

    const handleUpdateQuantity = (productId: string, newQuantity: number) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;
        
        const productInStock = products.find(p => p.id === product.id);
        if (!productInStock || productInStock.stock < newQuantity) {
            alert('Produto sem estoque suficiente.');
            return;
        }
        
        if (newQuantity <= 0) {
            setCurrentSaleItems(currentSaleItems.filter(item => item.productId !== productId));
        } else {
            setCurrentSaleItems(currentSaleItems.map(item =>
                item.productId === productId
                    ? { ...item, quantity: newQuantity, subtotal: newQuantity * product.price }
                    : item
            ));
        }
    };

    const handleFinalizeSale = () => {
        if (!selectedCustomerId || currentSaleItems.length === 0) return;

        const newSale = {
            id: `s${Date.now()}`,
            customerId: selectedCustomerId,
            items: currentSaleItems,
            date: new Date().toISOString(),
            total: saleTotal,
            paymentMethod: paymentMethod,
            paymentStatus: paymentMethod === PaymentMethod.Fiado ? PaymentStatus.Fiado : PaymentStatus.Pago,
        };
        dispatch({ type: 'ADD_SALE', payload: newSale });
        resetSale();
    };

    const resetSale = () => {
        setSelectedCustomerId(null);
        setCurrentSaleItems([]);
        setIsFinalizeModalOpen(false);
        setPaymentMethod(PaymentMethod.Dinheiro);
    };
    
    const handleHoldOrder = () => {
        if (!selectedCustomerId || currentSaleItems.length === 0) return;
        const newHeldOrder: HeldOrder = {
            id: `h${Date.now()}`,
            customerId: selectedCustomerId,
            items: currentSaleItems,
            total: saleTotal,
            heldAt: new Date().toISOString(),
        };
        dispatch({ type: 'HOLD_ORDER', payload: newHeldOrder });
        resetSale();
    };
    
    const handleResumeOrder = (order: HeldOrder) => {
        setSelectedCustomerId(order.customerId);
        setCurrentSaleItems(order.items);
        dispatch({ type: 'DELETE_HELD_ORDER', payload: order.id });
    };

    const handleDeleteHeldOrder = (orderId: string) => {
        if (window.confirm('Tem certeza que deseja cancelar esta comanda pendente?')) {
            dispatch({ type: 'DELETE_HELD_ORDER', payload: orderId });
        }
    };


    if (!selectedCustomerId) {
        return (
            <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
                {/* Customer selection */}
                <div className="flex flex-col h-full">
                    <h1 className="text-2xl font-bold text-white text-center mb-4">Iniciar Nova Venda</h1>
                    <p className="text-center text-gray-400 mb-4">Selecione um cliente para começar.</p>
                    <div className="bg-gray-800 p-4 rounded-lg shadow-lg flex-grow overflow-y-auto">
                        <ul className="divide-y divide-gray-700">
                            {customers.map(customer => (
                                <li key={customer.id} onClick={() => setSelectedCustomerId(customer.id)} className="p-4 hover:bg-gray-700/50 transition-colors cursor-pointer">
                                    <p className="font-semibold text-white">{customer.name}</p>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Held Orders */}
                <div className="flex flex-col h-full">
                    <h1 className="text-2xl font-bold text-white text-center mb-4">Comandas Pendentes</h1>
                    <p className="text-center text-gray-400 mb-4">Retome uma venda pausada.</p>
                    <div className="bg-gray-800 p-4 rounded-lg shadow-lg flex-grow overflow-y-auto">
                        {heldOrders.length > 0 ? (
                            <ul className="space-y-3">
                                {heldOrders.map(order => {
                                    const customer = customers.find(c => c.id === order.customerId);
                                    return (
                                        <li key={order.id} className="bg-gray-700 p-3 rounded-md">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-semibold text-white">{customer?.name || 'Cliente desconhecido'}</p>
                                                    <p className="text-sm text-gray-400">{order.items.length} item(s)</p>
                                                    <p className="text-xs text-gray-500 mt-1">Aberta em: {new Date(order.heldAt).toLocaleTimeString('pt-BR')}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-lg">{order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                                </div>
                                            </div>
                                            <div className="flex justify-end gap-2 mt-2">
                                                <button onClick={() => handleDeleteHeldOrder(order.id)} className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-1 px-3 rounded-md transition-colors">
                                                    Cancelar
                                                </button>
                                                <button onClick={() => handleResumeOrder(order)} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-1 px-3 rounded-md transition-colors">
                                                    Retomar
                                                </button>
                                            </div>
                                        </li>
                                    )
                                })}
                            </ul>
                        ) : (
                            <div className="flex items-center justify-center h-full">
                               <p className="text-gray-500">Nenhuma comanda pendente.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            {/* Left side - Product List */}
            <div className="lg:col-span-2 bg-gray-800 p-4 rounded-lg shadow-lg flex flex-col">
                <h2 className="text-2xl font-bold text-white mb-4">Adicionar Produtos</h2>
                <input
                    type="text"
                    placeholder="Buscar produto..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-4 text-white mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex-grow overflow-y-auto pr-2">
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredProducts.map(product => (
                            <button key={product.id} onClick={() => handleAddProduct(product)} className="bg-gray-700 hover:bg-indigo-600 transition-colors rounded-lg p-4 text-center shadow-md flex flex-col justify-between">
                                <p className="font-semibold text-white">{product.name}</p>
                                <p className="text-sm text-gray-400 mt-2">{product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right side - Current Sale */}
            <div className="bg-gray-800 p-4 rounded-lg shadow-lg flex flex-col">
                <h2 className="text-2xl font-bold text-white mb-4">Comanda</h2>
                <div className="bg-gray-900/50 p-3 rounded-md mb-4">
                    <p className="text-gray-400">Cliente:</p>
                    <p className="text-xl font-semibold text-white">{selectedCustomer?.name}</p>
                </div>
                <div className="flex-grow overflow-y-auto space-y-2 pr-2 mb-4">
                    {currentSaleItems.map(item => {
                        const product = products.find(p => p.id === item.productId);
                        if (!product) return null;
                        return (
                            <div key={item.productId} className="flex items-center justify-between bg-gray-700 p-2 rounded-md">
                                <div className="flex-grow">
                                    <p className="text-white font-medium">{product.name}</p>
                                    <p className="text-gray-400 text-sm">{item.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="number" value={item.quantity} onChange={(e) => handleUpdateQuantity(item.productId, parseInt(e.target.value, 10) || 0)} className="w-16 bg-gray-800 text-white text-center rounded-md border border-gray-600 p-1"/>
                                    <button onClick={() => handleUpdateQuantity(item.productId, 0)} className="text-red-400 hover:text-red-300"><TrashIcon className="w-5 h-5"/></button>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="border-t border-gray-700 pt-4">
                    <div className="flex justify-between items-center text-2xl font-bold text-white mb-4">
                        <span>Total:</span>
                        <span>{saleTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <button onClick={resetSale} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-md transition-colors">Cancelar</button>
                        <button onClick={handleHoldOrder} disabled={currentSaleItems.length === 0} className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-4 rounded-md transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                            <PauseIcon className="w-5 h-5"/>
                            Pausar
                        </button>
                        <button onClick={() => setIsFinalizeModalOpen(true)} disabled={currentSaleItems.length === 0} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-md transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                            <CreditCardIcon className="w-5 h-5" />
                            Finalizar
                        </button>
                    </div>
                </div>
            </div>

            <Modal isOpen={isFinalizeModalOpen} onClose={() => setIsFinalizeModalOpen(false)} title="Finalizar Venda">
                <div className="space-y-6">
                    <div className="text-center">
                        <p className="text-gray-400">Total a Pagar</p>
                        <p className="text-4xl font-bold text-white my-2">{saleTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Forma de Pagamento</label>
                        <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)} className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            {Object.values(PaymentMethod).map(method => (
                                <option key={method} value={method}>{method}</option>
                            ))}
                        </select>
                    </div>
                    <button onClick={handleFinalizeSale} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-md transition-colors text-lg">
                        Confirmar Pagamento
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default Sales;
