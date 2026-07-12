import { randomUUID } from 'expo-crypto';
import { CategoryService } from './category.service';
import { SQLiteCategoryRepository } from './sqlite-category.repository';

export const categoryService = new CategoryService(new SQLiteCategoryRepository(), randomUUID);
