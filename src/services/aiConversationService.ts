import { AIConversation, AIConversationContext, AIMessage } from '../types/ai';

const DB_NAME = 'gudangv2_ai_db';
const DB_VERSION = 1;
const STORE_NAME = 'conversations';

class AIConversationService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    if (typeof window === 'undefined' || !window.indexedDB) {
      return Promise.reject(new Error('IndexedDB is not supported in this environment.'));
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };

      req.onsuccess = () => {
        resolve(req.result);
      };

      req.onerror = () => {
        reject(req.error || new Error('Failed to open IndexedDB'));
      };
    });

    return this.dbPromise;
  }

  /**
   * List all saved conversations ordered by updatedAt descending
   */
  public async listConversations(): Promise<AIConversation[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();

        req.onsuccess = () => {
          const items: AIConversation[] = req.result || [];
          items.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
          resolve(items);
        };

        req.onerror = () => {
          reject(req.error || new Error('Failed to list conversations'));
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * Get single conversation by ID
   */
  public async getConversation(id: string): Promise<AIConversation | null> {
    if (!id) return null;
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(id);

        req.onsuccess = () => {
          resolve(req.result || null);
        };

        req.onerror = () => {
          reject(req.error || new Error(`Failed to get conversation ${id}`));
        };
      });
    } catch {
      return null;
    }
  }

  /**
   * Save or update conversation
   */
  public async saveConversation(conversation: AIConversation): Promise<void> {
    if (!conversation || !conversation.id) return;

    // Safety: Ensure no API keys or secrets leak into conversation storage
    const sanitizedMessages: AIMessage[] = (conversation.messages || []).map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
      toolCalls: m.toolCalls,
      confirmation: m.confirmation,
      error: m.error,
    }));

    const record: AIConversation = {
      ...conversation,
      messages: sanitizedMessages,
      updatedAt: Date.now(),
    };

    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(record);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error || new Error('Failed to save conversation'));
      });
    } catch {
      // Ignore storage errors in restricted iframe
    }
  }

  /**
   * Delete conversation by ID
   */
  public async deleteConversation(id: string): Promise<void> {
    if (!id) return;
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error || new Error(`Failed to delete conversation ${id}`));
      });
    } catch {
      // Ignore delete errors
    }
  }

  /**
   * Clear all conversations
   */
  public async clearAllConversations(): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.clear();

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error || new Error('Failed to clear conversations'));
      });
    } catch {
      // Ignore clear errors
    }
  }

  /**
   * Generate a concise local title from user's first prompt without AI API call
   */
  public generateTitle(firstUserText: string): string {
    if (!firstUserText || !firstUserText.trim()) return 'Percakapan Baru';
    const clean = firstUserText.trim().replace(/\s+/g, ' ');

    // Capitalize first character
    const capitalized = clean.charAt(0).toUpperCase() + clean.slice(1);
    if (capitalized.length <= 40) return capitalized;

    // Truncate cleanly at word boundary
    const truncated = capitalized.substring(0, 37);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 20) {
      return `${truncated.substring(0, lastSpace)}...`;
    }
    return `${truncated}...`;
  }
}

export const aiConversationService = new AIConversationService();
