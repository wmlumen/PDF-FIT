/**
 * Cliente NVIDIA AI - Integración con API Nemotron/Llama/Mistral vía NVIDIA NGC
 * Compatible con OpenAI SDK format (chat.completions)
 * 
 * Configuración: .env → NVIDIA_API_KEY, NVIDIA_BASE_URL
 */

import { ENV } from '../config.env.js';

export class NVIDIAClient {
  constructor() {
    this.baseURL = ENV.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
    this.apiKey = ENV.NVIDIA_API_KEY || '';
  }

  /**
   * Chat completion simple (no streaming)
   * @param {Array} messages - [{role, content}, ...]
   * @param {Object} options - {model, maxTokens, temperature, stream}
   * @returns {Promise<Object>} Respuesta completa
   */
  async chat(messages, options = {}) {
    if (!this.apiKey) {
      throw new Error('NVIDIA_API_KEY no configurada. Agregá NVIDIA_API_KEY a tu .env');
    }

    const response = await fetch(`${ENV.NVIDIA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model || 'meta/llama-3.1-70b-instruct',
        messages,
        max_tokens: options.maxTokens || 1024,
        temperature: options.temperature ?? 0.7,
        stream: options.stream ?? false,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`NVIDIA API ${response.status}: ${err.error?.message || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Chat con streaming (generador asíncrono)
   * @yields {string} Chunks de texto en tiempo real
   */
  async *chatStream(messages, options = {}) {
    if (!this.apiKey) {
      throw new Error('NVIDIA_API_KEY no configurada. Agregá NVIDIA_API_KEY a tu .env');
    }

    const response = await fetch(`${ENV.NVIDIA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model || 'meta/llama-3.1-70b-instruct',
        messages,
        max_tokens: options.maxTokens || 1024,
        temperature: options.temperature ?? 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`NVIDIA API ${response.status}: ${err.error?.message || response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

      for (const line of lines) {
        const data = line.slice(6).trim();
        if (data === '[DONE]') return;
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch {}
      }
    }
  }

  /**
   * Lista modelos disponibles (si la API lo soporta)
   */
  async listModels() {
    const response = await fetch(`${ENV.NVIDIA_BASE_URL}/models`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` },
    });
    return response.json();
  }
}

// Singleton listo para importar
export const nvidiaClient = new NVIDIAClient();

// Helper rápido para uso directo
export async function askNVIDIA(prompt, options = {}) {
  const resp = await nvidiaClient.chat([
    { role: 'system', content: options.system || 'Sos un asistente experto en catastro y normativa paraguaya (Ley 3966/2010, SNC 551/2023).' },
    { role: 'user', content: prompt }
  ], options);
  return resp.choices?.[0]?.message?.content || '';
}

// Streaming helper
export async function* streamNVIDIA(prompt, options = {}) {
  yield* nvidiaClient.chatStream([
    { role: 'system', content: options.system || 'Sos un asistente experto en catastro y normativa paraguaya.' },
    { role: 'user', content: prompt }
  ], options);
}

export default nvidiaClient;