import { Capacitor } from '@capacitor/core';
import type { Repository } from './repository';
import { SqliteRepository } from './sqliteRepository';
import { WebRepository } from './webRepository';

let instance: Repository | null = null;

/** SQLite on Android; localStorage when running in a desktop browser for development. */
export function getRepository(): Repository {
  if (!instance) {
    instance = Capacitor.isNativePlatform() ? new SqliteRepository() : new WebRepository();
  }
  return instance;
}

export { StorageError } from './repository';
export type { Repository } from './repository';
