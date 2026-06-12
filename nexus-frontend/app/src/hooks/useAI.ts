import { useState, useCallback } from 'react';

export interface AIConfig {
  apiKey: string;
  endpoint: string;
  model: string;
  maxTokens: number;
}

export function getAIConfig(): AIConfig {
  return {
    apiKey: localStorage.getItem('nexus_ai_key') || '',
    endpoint: localStorage.getItem('nexus_ai_endpoint') || 'https://integrate.api.nvidia.com/v1/chat/completions',
    model: localStorage.getItem('nexus_ai_model') || 'claude-sonnet-4-20250514',
    maxTokens: parseInt(localStorage.getItem('nexus_ai_tokens') || '8192', 10),
  };
}

export function saveAIConfig(cfg: Partial<AIConfig>) {
  if (cfg.apiKey !== undefined) localStorage.setItem('nexus_ai_key', cfg.apiKey);
  if (cfg.endpoint !== undefined) localStorage.setItem('nexus_ai_endpoint', cfg.endpoint);
  if (cfg.model !== undefined) localStorage.setItem('nexus_ai_model', cfg.model);
  if (cfg.maxTokens !== undefined) localStorage.setItem('nexus_ai_tokens', String(cfg.maxTokens));
}

export function useAI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useCallback(async (
    system: string,
    userContent: string,
  ): Promise<string> => {
    const cfg = getAIConfig();
    if (!cfg.apiKey) {
      setError('Configura una API key primero');
      return '';
    }

    setLoading(true);
    setError(null);

    try {
      const r = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: cfg.apiKey,
          api_endpoint: cfg.endpoint,
          model: cfg.model,
          max_tokens: cfg.maxTokens,
          system,
          messages: [{ role: 'user', content: userContent }],
        }),
      });

      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error || 'Error de API');
      }

      const data = await r.json();
      const text = data.content?.[0]?.text
        || data.choices?.[0]?.message?.content
        || JSON.stringify(data);

      return text;
    } catch (e: any) {
      setError(e.message);
      return '';
    } finally {
      setLoading(false);
    }
  }, []);

  return { query, loading, error, clearError: () => setError(null) };
}
