const OpenAI = require('openai');
const WebSocket = require('ws');
const { Readable } = require('stream');

// Shopify AI Proxy configuration
const PROXY_BASE_URL = 'https://proxy-shopify-ai.local.shop.dev';
const PROXY_WS_URL = 'wss://proxy-shopify-ai.local.shop.dev';
// Read dynamically so keys saved during onboarding are picked up immediately
function getProxyToken() { return process.env.SHOPIFY_PROXY_TOKEN || ''; }


class OpenAIProvider {
    static async validateApiKey(key) {
        // Always valid — we use the hardcoded proxy token
        return { success: true };
    }
}


/**
 * Creates an OpenAI-compatible STT session via Shopify proxy
 */
async function createSTT({ apiKey, language = 'en', callbacks = {}, ...config }) {
  const wsUrl = `${PROXY_WS_URL}/v1/realtime?intent=transcription`;

  const headers = {
    'Authorization': `Bearer ${getProxyToken()}`,
    'OpenAI-Beta': 'realtime=v1',
  };

  const ws = new WebSocket(wsUrl, { headers });

  return new Promise((resolve, reject) => {
    ws.onopen = () => {
      console.log("[OpenAI STT] WebSocket session opened via proxy.");

      const sessionConfig = {
        type: 'transcription_session.update',
        session: {
          input_audio_format: 'pcm16',
          input_audio_transcription: {
            model: 'gpt-4o-mini-transcribe',
            prompt: config.prompt || '',
            language: language || 'en'
          },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 200,
            silence_duration_ms: 100,
          },
          input_audio_noise_reduction: {
            type: 'near_field'
          }
        }
      };
      
      ws.send(JSON.stringify(sessionConfig));

      const keepAlive = () => {
        try {
          if (ws.readyState === WebSocket.OPEN) {
            ws.ping();
          }
        } catch (err) {
          console.error('[OpenAI STT] keepAlive error:', err.message);
        }
      };

      resolve({
        sendRealtimeInput: (audioData) => {
          if (ws.readyState === WebSocket.OPEN) {
            const message = {
              type: 'input_audio_buffer.append',
              audio: audioData
            };
            ws.send(JSON.stringify(message));
          }
        },
        keepAlive,
        close: () => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'session.close' }));
            ws.onmessage = ws.onerror = () => {};
            ws.close(1000, 'Client initiated close.');
          }
        }
      });
    };

    ws.onmessage = (event) => {
      if (!event.data || event.data === 'null' || event.data === '[DONE]') return;

      let msg;
      try { msg = JSON.parse(event.data); }
      catch { return; }

      if (!msg || typeof msg !== 'object') return;

      msg.provider = 'openai';
      callbacks.onmessage?.(msg);
    };

    ws.onerror = (error) => {
      console.error('[OpenAI STT] WebSocket error:', error.message);
      if (callbacks && callbacks.onerror) {
        callbacks.onerror(error);
      }
      reject(error);
    };

    ws.onclose = (event) => {
      console.log(`[OpenAI STT] WebSocket closed: ${event.code} ${event.reason}`);
      if (callbacks && callbacks.onclose) {
        callbacks.onclose(event);
      }
    };
  });
}

/**
 * Creates an OpenAI-compatible LLM instance via Shopify proxy
 */
function createLLM({ apiKey, model = 'gpt-4.1', temperature = 0.7, maxTokens = 2048, ...config }) {
  const client = new OpenAI({
    apiKey: getProxyToken(),
    baseURL: `${PROXY_BASE_URL}/v1`,
  });
  
  const callApi = async (messages) => {
    const response = await client.chat.completions.create({
      model: model,
      messages: messages,
      temperature: temperature,
      max_tokens: maxTokens
    });
    return {
      content: response.choices[0].message.content.trim(),
      raw: response
    };
  };

  return {
    generateContent: async (parts) => {
      const messages = [];
      let systemPrompt = '';
      let userContent = [];
      
      for (const part of parts) {
        if (typeof part === 'string') {
          if (systemPrompt === '' && part.includes('You are')) {
            systemPrompt = part;
          } else {
            userContent.push({ type: 'text', text: part });
          }
        } else if (part.inlineData) {
          userContent.push({
            type: 'image_url',
            image_url: { url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` }
          });
        }
      }
      
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
      if (userContent.length > 0) messages.push({ role: 'user', content: userContent });
      
      const result = await callApi(messages);

      return {
        response: {
          text: () => result.content
        },
        raw: result.raw
      };
    },
    
    chat: async (messages) => {
      return await callApi(messages);
    }
  };
}

/** 
 * Creates an OpenAI-compatible streaming LLM instance via Shopify proxy
 */
function createStreamingLLM({ apiKey, model = 'gpt-4.1', temperature = 0.7, maxTokens = 2048, ...config }) {
  return {
    streamChat: async (messages) => {
      const fetchUrl = `${PROXY_BASE_URL}/v1/chat/completions`;
      
      const headers = {
        Authorization: `Bearer ${getProxyToken()}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: model,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      return response;
    }
  };
}

module.exports = {
    OpenAIProvider,
    createSTT,
    createLLM,
    createStreamingLLM
};
