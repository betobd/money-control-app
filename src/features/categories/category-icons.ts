import type { SymbolViewProps } from 'expo-symbols';

export const categoryIconGroupNames = ['Food', 'Home & utilities', 'Transportation', 'Shopping', 'Health', 'Education', 'Entertainment', 'Travel', 'Finance', 'Work & income', 'Family & pets', 'Other'] as const;
export type CategoryIconGroup = (typeof categoryIconGroupNames)[number];

type CategoryIconDefinition = { label: string; group: CategoryIconGroup; keywords: string; symbol: SymbolViewProps['name'] };
export const categoryIconCatalog = {
  food: { label: 'Food', group: 'Food', keywords: 'meal dining', symbol: { ios: 'fork.knife', android: 'restaurant', web: 'restaurant' } },
  groceries: { label: 'Groceries', group: 'Food', keywords: 'market food basket', symbol: { ios: 'basket.fill', android: 'grocery', web: 'grocery' } },
  restaurant: { label: 'Restaurant', group: 'Food', keywords: 'dinner lunch', symbol: { ios: 'takeoutbag.and.cup.and.straw.fill', android: 'local_dining', web: 'local_dining' } },
  coffee: { label: 'Coffee', group: 'Food', keywords: 'cafe drink', symbol: { ios: 'cup.and.saucer.fill', android: 'local_cafe', web: 'local_cafe' } },
  bills: { label: 'Bills', group: 'Home & utilities', keywords: 'receipt utilities', symbol: { ios: 'doc.text.fill', android: 'receipt_long', web: 'receipt_long' } },
  home: { label: 'Home', group: 'Home & utilities', keywords: 'house household', symbol: { ios: 'house.fill', android: 'home', web: 'home' } },
  rent: { label: 'Rent', group: 'Home & utilities', keywords: 'lease apartment', symbol: { ios: 'building.2.fill', android: 'apartment', web: 'apartment' } },
  electricity: { label: 'Electricity', group: 'Home & utilities', keywords: 'power energy light', symbol: { ios: 'bolt.fill', android: 'bolt', web: 'bolt' } },
  water: { label: 'Water', group: 'Home & utilities', keywords: 'utility drop', symbol: { ios: 'drop.fill', android: 'water_drop', web: 'water_drop' } },
  internet: { label: 'Internet', group: 'Home & utilities', keywords: 'wifi broadband', symbol: { ios: 'wifi', android: 'wifi', web: 'wifi' } },
  phone: { label: 'Phone', group: 'Home & utilities', keywords: 'mobile cellular', symbol: { ios: 'iphone', android: 'smartphone', web: 'smartphone' } },
  transport: { label: 'Car', group: 'Transportation', keywords: 'transport vehicle', symbol: { ios: 'car.fill', android: 'directions_car', web: 'directions_car' } },
  bus: { label: 'Public transit', group: 'Transportation', keywords: 'bus train metro', symbol: { ios: 'bus.fill', android: 'directions_bus', web: 'directions_bus' } },
  bike: { label: 'Bike', group: 'Transportation', keywords: 'bicycle cycling', symbol: { ios: 'bicycle', android: 'pedal_bike', web: 'pedal_bike' } },
  fuel: { label: 'Fuel', group: 'Transportation', keywords: 'gas petrol', symbol: { ios: 'fuelpump.fill', android: 'local_gas_station', web: 'local_gas_station' } },
  parking: { label: 'Parking', group: 'Transportation', keywords: 'car garage', symbol: { ios: 'parkingsign.circle.fill', android: 'local_parking', web: 'local_parking' } },
  shopping: { label: 'Shopping', group: 'Shopping', keywords: 'bag purchases', symbol: { ios: 'bag.fill', android: 'shopping_bag', web: 'shopping_bag' } },
  cart: { label: 'Shopping cart', group: 'Shopping', keywords: 'store buy', symbol: { ios: 'cart.fill', android: 'shopping_cart', web: 'shopping_cart' } },
  clothing: { label: 'Clothing', group: 'Shopping', keywords: 'fashion apparel', symbol: { ios: 'tshirt.fill', android: 'checkroom', web: 'checkroom' } },
  health: { label: 'Health', group: 'Health', keywords: 'medical doctor', symbol: { ios: 'cross.case.fill', android: 'medical_services', web: 'medical_services' } },
  pharmacy: { label: 'Pharmacy', group: 'Health', keywords: 'medicine prescription', symbol: { ios: 'pills.fill', android: 'medication', web: 'medication' } },
  fitness: { label: 'Fitness', group: 'Health', keywords: 'gym exercise', symbol: { ios: 'dumbbell.fill', android: 'fitness_center', web: 'fitness_center' } },
  dental: { label: 'Dental', group: 'Health', keywords: 'dentist teeth', symbol: { ios: 'mouth.fill', android: 'dentistry', web: 'dentistry' } },
  education: { label: 'Education', group: 'Education', keywords: 'school study', symbol: { ios: 'graduationcap.fill', android: 'school', web: 'school' } },
  books: { label: 'Books', group: 'Education', keywords: 'reading library', symbol: { ios: 'books.vertical.fill', android: 'menu_book', web: 'menu_book' } },
  entertainment: { label: 'Games', group: 'Entertainment', keywords: 'gaming fun', symbol: { ios: 'gamecontroller.fill', android: 'sports_esports', web: 'sports_esports' } },
  movies: { label: 'Movies', group: 'Entertainment', keywords: 'cinema film', symbol: { ios: 'film.fill', android: 'movie', web: 'movie' } },
  music: { label: 'Music', group: 'Entertainment', keywords: 'audio concert', symbol: { ios: 'music.note', android: 'music_note', web: 'music_note' } },
  sports: { label: 'Sports', group: 'Entertainment', keywords: 'ball recreation', symbol: { ios: 'soccerball', android: 'sports_soccer', web: 'sports_soccer' } },
  travel: { label: 'Travel', group: 'Travel', keywords: 'trip vacation world', symbol: { ios: 'globe.americas.fill', android: 'travel_explore', web: 'travel_explore' } },
  flight: { label: 'Flights', group: 'Travel', keywords: 'plane airline', symbol: { ios: 'airplane', android: 'flight', web: 'flight' } },
  hotel: { label: 'Hotel', group: 'Travel', keywords: 'lodging stay', symbol: { ios: 'bed.double.fill', android: 'hotel', web: 'hotel' } },
  luggage: { label: 'Luggage', group: 'Travel', keywords: 'suitcase baggage', symbol: { ios: 'suitcase.fill', android: 'luggage', web: 'luggage' } },
  bank: { label: 'Bank', group: 'Finance', keywords: 'financial institution', symbol: { ios: 'building.columns.fill', android: 'account_balance', web: 'account_balance' } },
  'credit-card': { label: 'Credit card', group: 'Finance', keywords: 'payment debt', symbol: { ios: 'creditcard.fill', android: 'credit_card', web: 'credit_card' } },
  savings: { label: 'Savings', group: 'Finance', keywords: 'piggy bank money', symbol: { ios: 'banknote.fill', android: 'savings', web: 'savings' } },
  investment: { label: 'Investment', group: 'Finance', keywords: 'stocks growth chart', symbol: { ios: 'chart.line.uptrend.xyaxis', android: 'trending_up', web: 'trending_up' } },
  refund: { label: 'Refund', group: 'Finance', keywords: 'return reimbursement', symbol: { ios: 'arrow.uturn.backward.circle.fill', android: 'currency_exchange', web: 'currency_exchange' } },
  salary: { label: 'Salary', group: 'Work & income', keywords: 'paycheck wages', symbol: { ios: 'banknote.fill', android: 'payments', web: 'payments' } },
  freelance: { label: 'Freelance', group: 'Work & income', keywords: 'work business', symbol: { ios: 'briefcase.fill', android: 'work', web: 'work' } },
  bonus: { label: 'Bonus', group: 'Work & income', keywords: 'income award', symbol: { ios: 'star.circle.fill', android: 'workspace_premium', web: 'workspace_premium' } },
  family: { label: 'Family', group: 'Family & pets', keywords: 'people household', symbol: { ios: 'person.3.fill', android: 'family_restroom', web: 'family_restroom' } },
  childcare: { label: 'Childcare', group: 'Family & pets', keywords: 'children baby', symbol: { ios: 'figure.and.child.holdinghands', android: 'child_care', web: 'child_care' } },
  pets: { label: 'Pets', group: 'Family & pets', keywords: 'dog cat animal', symbol: { ios: 'pawprint.fill', android: 'pets', web: 'pets' } },
  gift: { label: 'Gift', group: 'Family & pets', keywords: 'present celebration', symbol: { ios: 'gift.fill', android: 'redeem', web: 'redeem' } },
  charity: { label: 'Charity', group: 'Other', keywords: 'donation giving', symbol: { ios: 'heart.fill', android: 'volunteer_activism', web: 'volunteer_activism' } },
  other: { label: 'Other', group: 'Other', keywords: 'miscellaneous category', symbol: { ios: 'square.grid.2x2.fill', android: 'category', web: 'category' } },
} satisfies Record<string, CategoryIconDefinition>;

export type CategoryIcon = keyof typeof categoryIconCatalog;
export const categoryIconKeys = Object.keys(categoryIconCatalog) as CategoryIcon[];
export const categoryIcons = Object.fromEntries(categoryIconKeys.map((id) => [id, categoryIconCatalog[id].symbol])) as Record<CategoryIcon, SymbolViewProps['name']>;
export const fallbackCategoryIcon: CategoryIcon = 'other';
export function isCategoryIcon(value: string): value is CategoryIcon { return value in categoryIconCatalog; }
export function getCategoryIcon(value: string): SymbolViewProps['name'] { return isCategoryIcon(value) ? categoryIconCatalog[value].symbol : categoryIconCatalog[fallbackCategoryIcon].symbol; }
export function searchCategoryIcons(query: string) { const normalized = query.trim().toLocaleLowerCase('en'); return categoryIconKeys.filter((id) => { const item = categoryIconCatalog[id]; return !normalized || `${id} ${item.label} ${item.group} ${item.keywords}`.toLocaleLowerCase('en').includes(normalized); }); }
