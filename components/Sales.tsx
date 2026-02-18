import React, { useState, useContext, useMemo, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { Customer, Product, SaleItem, HeldOrder } from '../types';
import { PaymentMethod } from '../constants';
import Modal from './common/Modal';
import { CreditCardIcon, PauseIcon, TrashIcon, BanknotesIcon, ExclamationTriangleIcon } from './icons';

const Sales: React.FC = () => {
    const { state, actions } = useContext(AppContext);
    const { customers, products, heldOrders } = state;

    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const [currentSaleItems, setCurrentSaleItems] = useState<SaleItem[]>([]);
    const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.Dinheiro);
    const [searchTerm, setSearchTerm] = useState('');

    // Payment specific state
    const [amountPaid, setAmountPaid] = useState<string>('');
    const [change, setChange] = useState<number>(0);

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

    useEffect(() => {
        if (paymentMethod === PaymentMethod.Dinheiro && amountPaid) {
            const paid = parseFloat(amountPaid.replace(',', '.'));
            setChange(Math.max(0, paid - saleTotal));
        } else {
            setChange(0);
        }
    }, [amountPaid, saleTotal, paymentMethod]);

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

    const handleFinalizeSale = async () => {
        if (!selectedCustomerId || currentSaleItems.length === 0) return;

        if (paymentMethod === PaymentMethod.Dinheiro && parseFloat(amountPaid.replace(',', '.')) < saleTotal) {
            if (!window.confirm('Valor pago é menor que o total. Deseja confirmar mesmo assim? (A diferença não será registrada como dívida neste fluxo)')) {
                return;
            }
        }

        const newSaleData = {
            customerId: selectedCustomerId,
            items: currentSaleItems,
            total: saleTotal,
            paymentMethod: paymentMethod,
        };
        await actions.addSale(newSaleData);
        resetSale();
    };

    const resetSale = () => {
        setSelectedCustomerId(null);
        setCurrentSaleItems([]);
        setIsFinalizeModalOpen(false);
        setPaymentMethod(PaymentMethod.Dinheiro);
        setAmountPaid('');
        setChange(0);
    };

    const handleHoldOrder = async () => {
        if (!selectedCustomerId || currentSaleItems.length === 0) return;
        const newHeldOrderData = {
            customerId: selectedCustomerId,
            items: currentSaleItems,
            total: saleTotal,
        };
        await actions.holdOrder(newHeldOrderData);
        resetSale();
    };

    const handleResumeOrder = (order: HeldOrder) => {
        setSelectedCustomerId(order.customerId);
        setCurrentSaleItems(order.items);
        actions.deleteHeldOrder(order.id);
    };

    const handleDeleteHeldOrder = async (orderId: string) => {
        if (window.confirm('Tem certeza que deseja cancelar esta comanda pendente?')) {
            await actions.deleteHeldOrder(orderId);
        }
    };


    if (!selectedCustomerId) {
        return (
            <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
                {/* Customer selection */}
                <div className="flex flex-col h-full">
                    <h1 className="text-2xl font-bold text-white text-center mb-4">Novo Atendimento</h1>
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
            <div className="lg:col-span-2 bg-gray-800 p-4 rounded-lg shadow-lg flex flex-col h-[calc(100vh-100px)]">
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
                            <button key={product.id} onClick={() => handleAddProduct(product)} className="bg-gray-700 hover:bg-indigo-600 transition-colors rounded-lg p-4 text-center shadow-md flex flex-col justify-between min-h-[120px]">
                                <p className="font-semibold text-white line-clamp-2">{product.name}</p>
                                <p className="text-sm text-gray-400 mt-2 font-mono">{product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right side - Current Sale */}
            <div className="bg-gray-800 p-4 rounded-lg shadow-lg flex flex-col h-[calc(100vh-100px)]">
                <h2 className="text-2xl font-bold text-white mb-4">Comanda</h2>
                <div className="bg-gray-900/50 p-3 rounded-md mb-4 flex justify-between items-center">
                    <div>
                        <p className="text-gray-400 text-xs">Cliente</p>
                        <p className="text-lg font-semibold text-white">{selectedCustomer?.name}</p>
                    </div>
                    <button onClick={() => setSelectedCustomerId(null)} className="text-indigo-400 hover:text-indigo-300 text-sm">Trocar</button>
                </div>

                <div className="flex-grow overflow-y-auto space-y-2 pr-2 mb-4 bg-gray-900/30 rounded-md p-2">
                    {currentSaleItems.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-gray-500 italic">
                            Nenhum item adicionado
                        </div>
                    ) : (
                        currentSaleItems.map(item => {
                            const product = products.find(p => p.id === item.productId);
                            if (!product) return null;
                            return (
                                <div key={item.productId} className="flex items-center justify-between bg-gray-700 p-3 rounded-md animate-fade-in">
                                    <div className="flex-grow">
                                        <p className="text-white font-medium">{product.name}</p>
                                        <p className="text-gray-400 text-sm">
                                            {item.quantity} x {product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="font-bold text-white">
                                            {item.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <button onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)} className="text-gray-400 hover:text-white bg-gray-600 rounded px-1">+</button>
                                            <button onClick={() => handleUpdateQuantity(item.productId, item.quantity - 1)} className="text-gray-400 hover:text-white bg-gray-600 rounded px-1">-</button>
                                        </div>
                                        <button onClick={() => handleUpdateQuantity(item.productId, 0)} className="text-red-400 hover:text-red-300 ml-1"><TrashIcon className="w-5 h-5" /></button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="border-t border-gray-700 pt-4 mt-auto">
                    <div className="flex justify-between items-center text-3xl font-bold text-white mb-6">
                        <span>Total:</span>
                        <span>{saleTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <button onClick={resetSale} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-2 rounded-md transition-colors text-sm md:text-base">Cancelar</button>
                        <button onClick={handleHoldOrder} disabled={currentSaleItems.length === 0} className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-2 rounded-md transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm md:text-base">
                            <PauseIcon className="w-5 h-5 hidden md:block" />
                            Pausar
                        </button>
                        <button onClick={() => setIsFinalizeModalOpen(true)} disabled={currentSaleItems.length === 0} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-2 rounded-md transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm md:text-base">
                            <CreditCardIcon className="w-5 h-5 hidden md:block" />
                            Finalizar
                        </button>
                    </div>
                </div>
            </div>

            <Modal isOpen={isFinalizeModalOpen} onClose={() => setIsFinalizeModalOpen(false)} title="Finalizar Atendimento">
                <div className="space-y-6">
                    <div className="text-center bg-gray-900/50 p-4 rounded-lg">
                        <p className="text-gray-400 text-sm uppercase tracking-wide">Total a Pagar</p>
                        <p className="text-5xl font-bold text-white my-2 tracking-tight">{saleTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-3">Forma de Pagamento</label>
                        <div className="grid grid-cols-2 gap-3">
                            {Object.values(PaymentMethod).map(method => (
                                <button
                                    key={method}
                                    onClick={() => setPaymentMethod(method)}
                                    className={`py-3 px-4 rounded-lg font-medium border-2 transition-all ${paymentMethod === method
                                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg transform scale-105'
                                            : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                                        }`}
                                >
                                    {method}
                                </button>
                            ))}
                        </div>
                    </div>

                    {paymentMethod === PaymentMethod.Dinheiro && (
                        <div className="bg-gray-700 p-4 rounded-lg animate-fade-in">
                            <label className="block text-sm font-medium text-gray-300 mb-2">Valor Recebido</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-gray-400">R$</span>
                                <input
                                    type="text" // Using text to handle comma better
                                    value={amountPaid}
                                    onChange={(e) => setAmountPaid(e.target.value)}
                                    placeholder="0,00"
                                    className="w-full bg-gray-800 border border-gray-600 rounded-md py-2 pl-8 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-lg"
                                    autoFocus
                                />
                            </div>
                            {change > 0 && (
                                <div className="mt-3 flex justify-between items-center bg-green-900/30 p-2 rounded border border-green-800">
                                    <span className="text-green-200 font-medium">Troco:</span>
                                    <span className="text-xl font-bold text-green-400">{change.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {paymentMethod === PaymentMethod.Fiado && (
                        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 flex items-start gap-3 animate-fade-in">
                            <ExclamationTriangleIcon className="w-6 h-6 text-yellow-500 flex-shrink-0" />
                            <div>
                                <p className="text-yellow-200 font-medium">Atenção</p>
                                <p className="text-yellow-400 text-sm">Esta venda será registrada como <strong>Pendente</strong> na conta do cliente.</p>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleFinalizeSale}
                        className={`w-full font-bold py-4 px-4 rounded-lg transition-colors text-lg shadow-lg flex items-center justify-center gap-2 ${paymentMethod === PaymentMethod.Fiado
                                ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                                : 'bg-green-600 hover:bg-green-700 text-white'
                            }`}
                    >
                        {paymentMethod === PaymentMethod.Fiado ? 'Confirmar Fiado' : 'Confirmar Pagamento'}
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default Sales;
