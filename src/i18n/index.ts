import { vi } from './vi';
import { en } from './en';

export type Language = 'vi' | 'en';
export type TranslationKeys = typeof vi;

export const translations = {
  vi,
  en,
};

export const defaultLanguage: Language = 'vi';
