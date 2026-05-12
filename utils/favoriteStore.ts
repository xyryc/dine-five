
export interface Product {
    id: number | string;
    name: string;
    price: string;
    image: string;
    rating?: number;
    reviews?: number;
    calories?: number;
    time?: number;
    description?: string;
    isNew?: boolean;
    restaurantName?: string;
    restaurantProfile?: string;
}

interface FavoriteStore {
    favorites: Product[];
    toggleFavorite: (product: Product) => void;
    isFavorite: (id: number | string) => boolean;
}

// Since I cannot install zustand without permission and it is not in package.json, 
// I will use a simple custom hook/event system for this demo or just local state if sticking to single page. 
// But the user requested functionality across screens. 
// I will create a simple singleton for now.

class FavoriteStoreImpl {
    favorites: Product[] = [];
    listeners: (() => void)[] = [];

    getFavorites() {
        return this.favorites;
    }

    isFavorite(id: number | string) {
        return this.favorites.some(p => p.id === id);
    }

    toggleFavorite(product: Product) {
        if (this.isFavorite(product.id)) {
            this.favorites = this.favorites.filter(p => p.id !== product.id);
        } else {
            this.favorites.push(product);
        }
        this.notify();
    }

    subscribe(listener: () => void) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notify() {
        this.listeners.forEach(l => l());
    }
}

export const favoriteStore = new FavoriteStoreImpl();
