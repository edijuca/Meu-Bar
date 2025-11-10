import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { BarInfo } from '../types';

const Settings: React.FC = () => {
    const { state, dispatch } = useContext(AppContext);
    const [barInfo, setBarInfo] = useState<BarInfo>(state.barInfo);
    const [showSuccess, setShowSuccess] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setBarInfo({ ...barInfo, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        dispatch({ type: 'UPDATE_BAR_INFO', payload: barInfo });
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000); // Hide message after 3 seconds
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
                            value={barInfo.name}
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
                            value={barInfo.email}
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
                            value={barInfo.phone}
                            onChange={handleChange}
                            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="address" className="block text-sm font-medium text-gray-300">Endereço</label>
                        <textarea
                            id="address"
                            name="address"
                            value={barInfo.address}
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
            </div>
        </div>
    );
};

export default Settings;
