import type { Module } from '@/store/moduleStore';

export const MODULES: Module[] = [];

export const isModuleUnlocked = (_moduleId: string, _completedIds: string[]): boolean => true;
