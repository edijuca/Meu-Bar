import React, { useState, useContext, useMemo, useEffect } from 'react';
import { AppProvider, AppContext } from './context/AppContext';
import Dashboard from './components/Dashboard';
import Sales from './components/Sales';
import Customers from './components/Customers';
import Products from './components/Products';
import Settings from './components/Settings';
import Reports from './components/Reports';
import { ChartBarIcon, ShoppingCartIcon, UsersIcon, CubeIcon, Cog6ToothIcon, DocumentChartBarIcon, ExclamationTriangleIcon, XMarkIcon } from './components/icons';
import { LOW_STOCK_THRESHOLD } from './constants';
import { Product } from './types';

// --- Low Stock Notification Component ---
interface LowStockNotificationProps {
  lowStockProducts: Product[];
}

const LowStockNotification: React.FC<LowStockNotificationProps> = ({ lowStockProducts }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (lowStockProducts.length > 0) {
            setIsVisible(true);
        }
    }, [lowStockProducts]);

    if (!isVisible || lowStockProducts.length === 0) {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 w-80 bg-yellow-600 border border-yellow-500 text-white p-4 rounded-lg shadow-2xl z-50">
            <div className="flex items-start">
                <div className="flex-shrink-0">
                    <ExclamationTriangleIcon className="w-6 h-6 text-yellow-200" />
                </div>
                <div className="ml-3 w-0 flex-1">
                    <p className="text-sm font-bold text-white">Alerta de Estoque Baixo</p>
                    <ul className="mt-1 text-sm list-disc list-inside space-y-1 max-h-40 overflow-y-auto pr-2">
                        {lowStockProducts.map(p => (
                            <li key={p.id}>{p.name} <span className="font-semibold">({p.stock})</span></li>
                        ))}
                    </ul>
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                    <button onClick={() => setIsVisible(false)} className="inline-flex text-yellow-200 hover:text-white transition-colors">
                        <span className="sr-only">Fechar</span>
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};


type View = 'dashboard' | 'sales' | 'customers' | 'products' | 'reports' | 'settings';

const NavItem: React.FC<{ icon: React.ReactNode; label: string; isActive: boolean; onClick: () => void; }> = ({ icon, label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center space-y-1 w-full py-2 px-1 text-xs md:flex-row md:justify-start md:space-y-0 md:space-x-3 md:px-4 md:py-3 md:text-sm rounded-lg transition-colors ${
            isActive ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'
        }`}
    >
        {icon}
        <span>{label}</span>
    </button>
);

const AppLayout: React.FC = () => {
    const [currentView, setCurrentView] = useState<View>('dashboard');
    const { state } = useContext(AppContext);

    const lowStockProducts = useMemo(
        () => state.products.filter(p => p.stock <= LOW_STOCK_THRESHOLD),
        [state.products]
    );
    
    const lowStockCount = lowStockProducts.length;

    const renderView = () => {
        switch (currentView) {
            case 'dashboard':
                return <Dashboard />;
            case 'sales':
                return <Sales />;
            case 'customers':
                return <Customers />;
            case 'products':
                return <Products />;
            case 'reports':
                return <Reports />;
            case 'settings':
                return <Settings />;
            default:
                return <Dashboard />;
        }
    };
    
    return (
        <div className="flex flex-col md:flex-row h-screen font-sans">
            <nav className="bg-gray-800 w-full md:w-56 p-2 md:p-4 order-last md:order-first flex md:flex-col justify-around md:justify-start md:space-y-2">
                <div className="hidden md:block mb-6">
                    <h1 className="text-2xl font-bold text-white text-center">{state.barInfo.name || 'Bar POS'}</h1>
                </div>
                <NavItem
                    icon={<ChartBarIcon className="w-6 h-6" />}
                    label="Dashboard"
                    isActive={currentView === 'dashboard'}
                    onClick={() => setCurrentView('dashboard')}
                />
                <NavItem
                    icon={<ShoppingCartIcon className="w-6 h-6" />}
                    label="Vendas"
                    isActive={currentView === 'sales'}
                    onClick={() => setCurrentView('sales')}
                />
                <NavItem
                    icon={<UsersIcon className="w-6 h-6" />}
                    label="Clientes"
                    isActive={currentView === 'customers'}
                    onClick={() => setCurrentView('customers')}
                />
                <div className="relative w-full">
                    <NavItem
                        icon={<CubeIcon className="w-6 h-6" />}
                        label="Produtos"
                        isActive={currentView === 'products'}
                        onClick={() => setCurrentView('products')}
                    />
                    {lowStockCount > 0 && (
                        <span className="absolute top-1 right-1 md:top-2 md:right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white shadow-md" aria-label={`${lowStockCount} products with low stock`}>
                            {lowStockCount}
                        </span>
                    )}
                </div>
                 <NavItem
                    icon={<DocumentChartBarIcon className="w-6 h-6" />}
                    label="Relatórios"
                    isActive={currentView === 'reports'}
                    onClick={() => setCurrentView('reports')}
                />
                 <NavItem
                    icon={<Cog6ToothIcon className="w-6 h-6" />}
                    label="Configurações"
                    isActive={currentView === 'settings'}
                    onClick={() => setCurrentView('settings')}
                />
            </nav>
            <main className="flex-1 bg-gray-900 overflow-y-auto">
                {renderView()}
            </main>
            <LowStockNotification lowStockProducts={lowStockProducts} />
        </div>
    );
};


const App: React.FC = () => {
    return (
        <AppProvider>
            <AppLayout />
        </AppProvider>
    );
}

export default App;