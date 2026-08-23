import { useLocalSearchParams } from 'expo-router';
import { CategoryForm } from '@/features/categories/components/category-form';
import type { CategoryType } from '@/features/categories/category.types';
export default function CategoryFormRoute() { const { id, type, parentId } = useLocalSearchParams<{ id?: string; type?: CategoryType; parentId?: string }>(); return <CategoryForm categoryId={id} initialParentId={parentId} initialType={type === 'income' ? 'income' : 'expense'} />; }
