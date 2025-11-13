import React, { useState, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { ChartBarIcon } from '../icons';

const LoginScreen: React.FC = () => {
    const [isLoginView, setIsLoginView] = useState(true);
    const { actions } = useContext(AppContext);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!isLoginView && password !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }

        setIsLoading(true);
        try {
            if (isLoginView) {
                await actions.login(email, password);
            } else {
                await actions.register(name, email, password);
            }
        } catch (err: any) {
            setError(err.message || 'Ocorreu um erro.');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleView = () => {
        setIsLoginView(!isLoginView);
        setError(null);
        setName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
    };

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col justify-center items-center p-4">
            <div className="max-w-md w-full mx-auto">
                <div className="flex justify-center items-center mb-6">
                    <ChartBarIcon className="w-10 h-10 text-indigo-500" />
                    <h1 className="text-3xl font-bold text-white ml-2">Bar POS</h1>
                </div>
                <div className="bg-gray-800 p-8 rounded-lg shadow-lg">
                    <h2 className="text-2xl font-bold text-center text-white mb-6">
                        {isLoginView ? 'Acessar Sistema' : 'Criar Nova Conta'}
                    </h2>
                    
                    {error && (
                        <div className="bg-red-500/20 border border-red-500/30 text-red-300 text-sm p-3 rounded-md mb-4">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {!isLoginView && (
                            <div>
                                <label htmlFor="name" className="text-sm font-bold text-gray-300 block mb-2">Nome</label>
                                <input
                                    type="text"
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    className="w-full p-3 bg-gray-700 rounded-md text-white border border-gray-600 focus:border-indigo-500 focus:outline-none"
                                />
                            </div>
                        )}
                        <div>
                            <label htmlFor="email" className="text-sm font-bold text-gray-300 block mb-2">Email</label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full p-3 bg-gray-700 rounded-md text-white border border-gray-600 focus:border-indigo-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label htmlFor="password"className="text-sm font-bold text-gray-300 block mb-2">Senha</label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full p-3 bg-gray-700 rounded-md text-white border border-gray-600 focus:border-indigo-500 focus:outline-none"
                            />
                        </div>
                        {!isLoginView && (
                             <div>
                                <label htmlFor="confirmPassword"className="text-sm font-bold text-gray-300 block mb-2">Confirmar Senha</label>
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    className="w-full p-3 bg-gray-700 rounded-md text-white border border-gray-600 focus:border-indigo-500 focus:outline-none"
                                />
                            </div>
                        )}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-md transition-colors disabled:bg-indigo-800 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Carregando...' : (isLoginView ? 'Entrar' : 'Criar Conta')}
                        </button>
                    </form>
                    <p className="text-center text-gray-400 mt-6 text-sm">
                        {isLoginView ? 'Não tem uma conta?' : 'Já tem uma conta?'}
                        <button onClick={toggleView} className="text-indigo-400 hover:text-indigo-300 font-semibold ml-1 focus:outline-none">
                            {isLoginView ? 'Crie uma agora' : 'Faça login'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;