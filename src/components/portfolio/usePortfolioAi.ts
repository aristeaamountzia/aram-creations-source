import { useState } from 'react';
import { hasPortfolioAiContext, portfolioContextMessage } from '../../lib/portfolio-ai-context';
import { requestBackofficeAi } from '../../lib/backoffice-ai-client';
import { prepareAiImages } from '../../lib/ai-images';
import { auth } from '../../firebase';

import type { PortfolioWorkspace } from './usePortfolioWorkspace';
import type { PortfolioCatalog } from './usePortfolioCatalog';

type Dependencies = Pick<PortfolioWorkspace, 'form'> &
  Pick<PortfolioCatalog, 'setError'>;

export function usePortfolioAi(dependencies: Dependencies) {
  const { form, setError } = dependencies;

  const [aiPrompt, setAiPrompt] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState<{ title?: string; description?: string } | null>(
    null
  );

  const [aiWorking, setAiWorking] = useState(false);

  const generateAiSuggestion = async (task: 'full' | 'title' | 'description') => {
    if (!form) return;
    setAiSuggestion(null);
    if (!hasPortfolioAiContext(form, aiPrompt, form.mediaList.some(media => media.type !== 'video' && Boolean(media.url)))) {
      setError(portfolioContextMessage);
      return;
    }
    setAiWorking(true);
    setError('');
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Συνδέσου ξανά ως διαχειριστής.');
      const imageDataUrls = await prepareAiImages(form.mediaList);
      const data = await requestBackofficeAi({
          mode: 'portfolio_item',
          task,
          prompt: aiPrompt,
          imageDataUrls,
          product: {
            name: form.title,
            category: form.category,
            year: form.year,
            medium: form.medium,
            dimensions: form.dimensions,
            description: form.description
          }
      }, { Authorization: `Bearer ${token}` });
      setAiSuggestion({ title: data.title, description: data.description });
    } catch (err: any) {
      setError(`AI: ${err.message}`);
    } finally {
      setAiWorking(false);
    }
  };

  return { aiPrompt, setAiPrompt, aiSuggestion, setAiSuggestion, aiWorking, generateAiSuggestion };
}

export type PortfolioAi = ReturnType<typeof usePortfolioAi>;
