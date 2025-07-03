import type { BrandBook, BrandBooks } from '../types';

export class BrandDataService {
  private dbName = 'BrandComplianceDB';
  private storeName = 'brandBooks';
  private version = 1;
  private db: IDBDatabase | null = null;
  private cache: Map<string, BrandBook> = new Map();

  async init(): Promise<void> {
    await this.openDB();
    await this.loadBrandData();
  }

  private async openDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
    });
  }

  private async loadBrandData(): Promise<void> {
    try {
      // Check if data exists in IndexedDB
      const storedData = await this.getAllFromDB();
      
      if (storedData.length === 0) {
        // Load from remote/local source
        const response = await fetch('/data/brand-books.json');
        const data = await response.json();
        
        // Store in IndexedDB
        await this.saveToDB(data);
        
        // Cache in memory
        Object.entries(data.brandBooks).forEach(([key, value]) => {
          this.cache.set(key, value as BrandBook);
        });
      } else {
        // Load from IndexedDB to cache
        storedData.forEach(item => {
          this.cache.set(item.id, item.data);
        });
      }
    } catch (error) {
      // Fallback to default data if fetch fails
      const defaultData = this.getDefaultBrandBooks();
      Object.entries(defaultData).forEach(([key, value]) => {
        this.cache.set(key, value);
      });
    }
  }

  async getBrandBook(id: string): Promise<BrandBook | null> {
    return this.cache.get(id) || null;
  }

  async getAllBrandBooks(): Promise<BrandBooks> {
    const books: BrandBooks = {};
    this.cache.forEach((value, key) => {
      books[key] = value;
    });
    return books;
  }

  private async saveToDB(data: any): Promise<void> {
    if (!this.db) return;
    
    const transaction = this.db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    
    // Store version info
    await store.put({ id: '_version', version: data.version || 1 });
    
    // Store brand books
    Object.entries(data.brandBooks).forEach(([key, value]) => {
      store.put({ id: key, data: value });
    });
  }

  private async getAllFromDB(): Promise<any[]> {
    if (!this.db) return [];
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private getDefaultBrandBooks(): BrandBooks {
    return {
      'cbre': {
        name: 'CBRE - Full Brand Guidelines',
        size: '250MB',
        colors: ['#0073e6', '#ffffff', '#f5f5f5', '#333333'],
        fonts: ['Arial', 'Helvetica Neue', 'Calibri'],
        logoRequirements: { minWidth: 120, minHeight: 40 }
      },
      'osborne-clarke': {
        name: 'Osborne Clarke - Complete Templates',
        size: '180MB',
        colors: ['#e67e22', '#2c3e50', '#ffffff', '#ecf0f1'],
        fonts: ['ITC Lubalin', 'Aksidenz-Grotesk', 'Arial'],
        logoRequirements: { minWidth: 100, minHeight: 35 }
      },
      'hamilton-brown': {
        name: 'Hamilton Brown - Internal Standards',
        size: '45MB',
        colors: ['#3498db', '#2c3e50', '#27ae60', '#ffffff'],
        fonts: ['Segoe UI', 'Arial', 'Helvetica'],
        logoRequirements: { minWidth: 80, minHeight: 30 }
      }
    };
  }
}