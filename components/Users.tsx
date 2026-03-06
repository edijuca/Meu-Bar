
import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import { User } from '../types';
import Modal from './common/Modal';
import { TrashIcon, PencilIcon, PlusIcon } from './icons';

const Users: React.FC = () => {
    const { state, actions } = useContext(AppContext);
    const { users, user: currentUser } = state;

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
    });

    const filteredUsers = useMemo(() => 
        users.filter(u => 
            (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
            (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
        ), [users, searchTerm]
    );

    const [isSaving, setIsSaving] = useState(false);

    const handleOpenModal = (user?: User) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                name: user.name || '',
                email: user.email || '',
                password: '', // Clear password when editing
            });
        } else {
            setEditingUser(null);
            setFormData({ name: '', email: '', password: '' });
        }
        setIsModalOpen(true);
    };

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (editingUser) {
                await actions.updateUser({ ...editingUser, name: formData.name, email: formData.email });
            } else {
                if (!formData.password) {
                    throw new Error('A senha é obrigatória para novos usuários.');
                }
                await actions.addUser(formData.name, formData.email, formData.password);
            }
            setIsModalOpen(false);
        } catch (error: any) {
            alert(error.message || 'Erro ao salvar usuário');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (id === currentUser?.id) {
            alert('Você não pode remover o seu próprio usuário enquanto está logado.');
            return;
        }
        if (window.confirm('Tem certeza que deseja remover este usuário?')) {
            await actions.deleteUser(id);
        }
    };

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-3xl font-bold text-white">Gerenciamento de Usuários</h1>
                <div className="flex gap-4 w-full md:w-auto">
                    <div className="w-full md:w-64">
                        <input
                            type="text"
                            placeholder="Buscar usuários..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <button 
                        onClick={() => handleOpenModal()} 
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md flex items-center gap-2 transition-colors whitespace-nowrap"
                    >
                        <PlusIcon className="w-5 h-5" />
                        Novo Usuário
                    </button>
                </div>
            </div>

            <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-700 text-gray-300 uppercase text-xs font-semibold tracking-wider">
                                <th className="px-6 py-4">Nome</th>
                                <th className="px-6 py-4">Email</th>
                                <th className="px-6 py-4">ID</th>
                                <th className="px-6 py-4 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {filteredUsers.map((u) => (
                                <tr key={u.id} className="hover:bg-gray-700/50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-medium text-white">
                                        {u.name} {u.id === currentUser?.id && <span className="ml-2 text-xs bg-indigo-600 px-2 py-0.5 rounded-full">Você</span>}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-400">
                                        {u.email}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                                        {u.id}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex justify-center gap-3">
                                            <button onClick={() => handleOpenModal(u)} className="text-indigo-400 hover:text-indigo-300 transition-colors" title="Editar">
                                                <PencilIcon className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => handleDeleteUser(u.id)} className="text-red-400 hover:text-red-300 transition-colors" title="Remover">
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                title={editingUser ? 'Editar Usuário' : 'Novo Usuário'}
            >
                <form onSubmit={handleSaveUser} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Nome</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                        <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        {editingUser && (
                            <p className="mt-1 text-xs text-yellow-500">
                                Nota: Alterar o e-mail aqui atualiza apenas o perfil. O login continuará usando o e-mail original do Auth.
                            </p>
                        )}
                    </div>
                    {!editingUser && (
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Senha</label>
                            <input
                                type="password"
                                required={!editingUser}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    )}
                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                            disabled={isSaving}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className={`bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md transition-colors flex items-center gap-2 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isSaving ? 'Salvando...' : editingUser ? 'Salvar Alterações' : 'Criar Usuário'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Users;
