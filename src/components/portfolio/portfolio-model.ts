import React from 'react';
import { ArtItem, CategoryId } from '../../types';

export type PortfolioRecord = ArtItem & {
  isDeleted?: boolean;
  name?: string;
  imageUrl?: string;
  deletedAt?: unknown;
};

export type Media = { url: string; type: 'image' | 'video'; title?: string; originalUrl?: string };

export type EditorTab = 'basics' | 'details' | 'media' | 'ai';

export type StatsFilter = 'active' | 'archived' | 'featured' | 'all';

export type SortOption = 'portfolio_order' | 'year_desc' | 'year_asc' | 'title_asc' | 'title_desc';

export const emptyForm = () => ({
  id: '',
  title: '',
  category: 'handcrafted-memories' as CategoryId,
  year: String(new Date().getFullYear()),
  medium: '',
  dimensions: '',
  origin: '',
  status: 'Διαθέσιμο',
  description: '',
  detailsText: '',
  featured: false,
  inquiryOnly: true,
  mediaList: [] as Media[]
});

export type Form = ReturnType<typeof emptyForm>;

export type Draft = { form: Form | null; past: Media[][]; future: Media[][] };

export type DraftAction = { update: React.SetStateAction<Form | null> } | 'undo' | 'redo';

export function editDraft(state: Draft, action: DraftAction): Draft {
  if (action === 'undo' || action === 'redo') {
    const undo = action === 'undo';
    const list = (undo ? state.past : state.future).at(-1);
    if (!list || !state.form) return state;
    return {
      form: { ...state.form, mediaList: list },
      past: undo ? state.past.slice(0, -1) : [...state.past, state.form.mediaList],
      future: undo ? [...state.future, state.form.mediaList] : state.future.slice(0, -1)
    };
  }
  const form = typeof action.update === 'function' ? action.update(state.form) : action.update;
  if (!form || !state.form || form.id !== state.form.id) return { form, past: [], future: [] };
  if (form.mediaList === state.form.mediaList) return { ...state, form };
  return { form, past: [...state.past, state.form.mediaList].slice(-30), future: [] };
}

export interface PortfolioManagerProps {
  history?: any[];
  onBack: () => void;
  onNavigateOrders?: () => void;
  onOpenSettings?: () => void;
  currentUser?: any;
  onSignOut?: () => void;
}
