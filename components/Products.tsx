import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import { Product } from '../types';
import Modal from './common/Modal';
import { PlusIcon, PencilIcon, TrashIcon } from './icons';
import { LOW_STOCK_THRESHOLD } from '../constants';

const ProductForm: React.FC<{ product?: Product; onSave: (product: Omit<Product, 'id'>) => void; onCancel: () => void }> = ({ product, onSave, onCancel }) => {
    const [name, setName] = useState(product?.name || '');
    const [category, setCategory] = useState(product?.category || '');
    const [price, setPrice] = useState(product?.price.toString() || '');
    const [stock, setStock] = useState(product?.stock.toString() || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !price || !stock) return;
        onSave({
            name,
            category,
            price: parseFloat(price),
            stock: parseInt(stock, 10),
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="prod-name" className="block text-sm font-medium text-gray-300">Nome do Produto</label>
                <input type="text" id="prod-name" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
                <label htmlFor="prod-category" className="block text-sm font-medium text-gray-300">Categoria</label>
                <input type="text" id="prod-category" value={category} onChange={e => setCategory(e.target.value)} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
                <label htmlFor="prod-price" className="block text-sm font-medium text-gray-300">Preço (R$)</label>
                <input type="number" step="0.01" id="prod-price" value={price} onChange={e => setPrice(e.target.value)} required className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
                <label htmlFor="prod-stock" className="block text-sm font-medium text-gray-300">Quantidade em Estoque</label>
                <input type="number" id="prod-stock" value={stock} onChange={e => setStock(e.target.value)} required className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div className="flex justify-end space-x-3 pt-2">
                <button type="button" onClick={onCancel} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition-colors">Cancelar</button>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors">Salvar</button>
            </div>
        </form>
    );
};

const Products: React.FC = () => {
    const { state, actions } = useContext(AppContext);
    const { products } = state;

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');

    const categories = useMemo(() => ['Todos', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))], [products]);

    const filteredProducts = useMemo(() =>
        products.filter(product =>
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
            (categoryFilter === 'Todos' || categoryFilter === '' || product.category === categoryFilter)
        ), [products, searchTerm, categoryFilter]
    );

    const handleSaveProduct = async (productData: Omit<Product, 'id'>) => {
        try {
            if (editingProduct) {
                await actions.updateProduct({ ...productData, id: editingProduct.id });
            } else {
                await actions.addProduct(productData);
            }
            setIsModalOpen(false);
            setEditingProduct(undefined);
        } catch (error: any) {
            alert(error.message || 'Erro ao salvar produto. Verifique sua conexão e se o banco de dados está configurado.');
        }
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este produto?')) {
            await actions.deleteProduct(id);
        }
    };

    return (
        <div className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-white">Produtos e Estoque</h1>
                <button onClick={() => { setEditingProduct(undefined); setIsModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md flex items-center gap-2 transition-colors w-full md:w-auto">
                    <PlusIcon className="w-5 h-5" />
                    Novo Produto
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <input
                    type="text"
                    placeholder="Buscar produto pelo nome..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <select
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                    className="w-full md:w-1/4 bg-gray-800 border border-gray-700 rounded-md py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
            </div>

            <div className="bg-gray-800 rounded-lg shadow-lg overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-900/50">
                        <tr>
                            <th className="p-4 font-semibold">Nome</th>
                            <th className="p-4 font-semibold">Categoria</th>
                            <th className="p-4 font-semibold">Preço</th>
                            <th className="p-4 font-semibold">Estoque</th>
                            <th className="p-4 font-semibold">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {filteredProducts.map(product => (
                            <tr key={product.id} className="hover:bg-gray-700/50 transition-colors">
                                <td className="p-4">{product.name}</td>
                                <td className="p-4 text-gray-400">{product.category}</td>
                                <td className="p-4">{product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                <td className={`p-4 font-semibold ${product.stock <= LOW_STOCK_THRESHOLD ? 'text-red-400' : 'text-green-400'}`}>
                                    {product.stock}
                                    {product.stock <= LOW_STOCK_THRESHOLD && <span className="text-xs ml-2">(Baixo)</span>}
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center space-x-3">
                                        <button onClick={() => handleEdit(product)} className="text-gray-400 hover:text-indigo-400 transition-colors"><PencilIcon className="w-5 h-5" /></button>
                                        <button onClick={() => handleDelete(product.id)} className="text-gray-400 hover:text-red-400 transition-colors"><TrashIcon className="w-5 h-5" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProduct ? "Editar Produto" : "Novo Produto"}>
                    <ProductForm product={editingProduct} onSave={handleSaveProduct} onCancel={() => setIsModalOpen(false)} />
                </Modal>
            )}
        </div>
    );
};

export default Products;
