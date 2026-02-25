import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { BarInfo } from '../types';

const Settings: React.FC = () => {
    const { state, actions } = useContext(AppContext);
    const [barInfo, setBarInfo] = useState<BarInfo>(state.barInfo);
    const [showSuccess, setShowSuccess] = useState(false);

    const [isResetting, setIsResetting] = useState(false);

    useEffect(() => {
        setBarInfo(state.barInfo);
    }, [state.barInfo]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setBarInfo({ ...barInfo, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await actions.updateBarInfo(barInfo);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000); // Hide message after 3 seconds
    };

    const handleResetSales = async () => {
        console.log('Settings: handleResetSales clicked');
        if (window.confirm('Tem certeza que deseja APAGAR TODAS as vendas? Esta ação não pode ser desfeita.')) {
            console.log('Settings: Reset confirmed by user');
            setIsResetting(true);
            try {
                await actions.resetSales();
                console.log('Settings: Reset action successful');
                alert('Todas as vendas foram removidas com sucesso. O sistema será reiniciado.');
                window.location.reload();
            } catch (err: any) {
                console.error('Settings: Reset sales error:', err);
                alert('Erro ao resetar vendas: ' + (err.message || 'Erro desconhecido'));
            } finally {
                setIsResetting(false);
            }
        } else {
            console.log('Settings: Reset cancelled by user');
        }
    };

    return (
        <div className="p-4 md:p-6">
            <h1 className="text-3xl font-bold text-white mb-6">Configurações do Bar</h1>
            <div className="max-w-2xl mx-auto bg-gray-800 p-8 rounded-lg shadow-lg">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-300">Nome do Estabelecimento</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={barInfo.name || ''}
                            onChange={handleChange}
                            required
                            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email de Contato</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={barInfo.email || ''}
                            onChange={handleChange}
                            required
                            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-300">Telefone</label>
                        <input
                            type="tel"
                            id="phone"
                            name="phone"
                            value={barInfo.phone || ''}
                            onChange={handleChange}
                            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="address" className="block text-sm font-medium text-gray-300">Endereço</label>
                        <textarea
                            id="address"
                            name="address"
                            value={barInfo.address || ''}
                            onChange={handleChange}
                            rows={3}
                            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <div className="flex justify-end items-center gap-4 pt-2">
                         {showSuccess && <p className="text-green-400 text-sm">Informações salvas com sucesso!</p>}
                        <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                            Salvar Alterações
                        </button>
                    </div>
                </form>

                <div className="mt-12 pt-8 border-t border-gray-700">
                    <h3 className="text-xl font-bold text-red-400 mb-4">Zona de Perigo</h3>
                    <p className="text-gray-400 text-sm mb-6">
                        As ações abaixo são irreversíveis. Tenha cuidado ao prosseguir.
                    </p>
                    <button 
                        onClick={handleResetSales}
                        disabled={isResetting}
                        className={`w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors ${isResetting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isResetting ? 'Resetando...' : 'Resetar Todas as Vendas'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Settings;
