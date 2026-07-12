import { useLocalSearchParams } from 'expo-router';
import { CategoriesScreen } from '@/features/categories/components/categories-screen';
import type { CategoryType } from '@/features/categories/category.types';
export default function CategoriesRoute() { const { type } = useLocalSearchParams<{ type?: CategoryType }>(); return <CategoriesScreen initialType={type === 'income' ? 'income' : 'expense'} />; }
