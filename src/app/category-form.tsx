import { useLocalSearchParams } from 'expo-router';
import { CategoryForm } from '@/features/categories/components/category-form';
import type { CategoryType } from '@/features/categories/category.types';
export default function CategoryFormRoute() { const { id, type } = useLocalSearchParams<{ id?: string; type?: CategoryType }>(); return <CategoryForm categoryId={id} initialType={type === 'income' ? 'income' : 'expense'} />; }
