import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';

// Local tools only. No hosted search, code execution, or provider-side connectors.
export function toGroqMessages(system: string, messages: Anthropic.MessageParam[]) {
  const converted: any[] = [{ role: 'system', content: system }];
  for (const message of messages) {
    if (typeof message.content === 'string') {
      converted.push({ role: message.role, content: message.content });
      continue;
    }
    const text = message.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n');
    const calls = message.content.filter((b: any) => b.type === 'tool_use');
    if (message.role === 'assistant') {
      converted.push({ role: 'assistant', content: text || null,
        ...(calls.length ? { tool_calls: calls.map((b: any) => ({ id: b.id, type: 'function',
          function: { name: b.name, arguments: JSON.stringify(b.input) } })) } : {}) });
    } else {
      if (text) converted.push({ role: 'user', content: text });
      for (const result of message.content.filter((b: any) => b.type === 'tool_result')) {
        converted.push({ role: 'tool', tool_call_id: (result as any).tool_use_id,
          content: typeof (result as any).content === 'string' ? (result as any).content : JSON.stringify((result as any).content) });
      }
    }
  }
  return converted;
}

export class GroqProviderError extends Error {
  constructor(message: string, public code: string) { super(message); }
}

export async function groqTurn(input: {
  system: string; messages: Anthropic.MessageParam[]; tools: Anthropic.Tool[];
  onText: (text: string) => void; signal?: AbortSignal;
}, fetcher: typeof fetch = fetch): Promise<Anthropic.ContentBlock[]> {
  if (!config.GROQ_API_KEY || !config.GROQ_ZDR_VERIFIED) {
    throw new GroqProviderError('Groq chat is not ready. A server-side key and verified zero data retention are required.', 'PROVIDER_NOT_READY');
  }
  const body: any = {
    model: config.GROQ_MODEL, messages: toGroqMessages(input.system, input.messages),
    stream: true, max_completion_tokens: 1024, reasoning_effort: 'low',
    ...(input.tools.length ? { tools: input.tools.map(t => ({ type: 'function', function: {
      name: t.name, description: t.description, parameters: t.input_schema } })),
      parallel_tool_calls: false } : {}),
  };
  // Conservative local bound, not an exact tokenizer. Never silently discard context.
  if (Buffer.byteLength(JSON.stringify(body), 'utf8') > 12000) {
    throw new GroqProviderError('This chat is too long for the free preview budget. Start a new shorter conversation. No new tool ran.', 'CONTEXT_BUDGET');
  }
  const response = await fetcher('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST', headers: { Authorization: `Bearer ${config.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: input.signal ? AbortSignal.any([input.signal, AbortSignal.timeout(60000)]) : AbortSignal.timeout(60000),
  });
  if (!response.ok) {
    if (response.status === 429) throw new GroqProviderError('Groq Free reached its usage limit. Wait before trying again. No automatic retry or paid upgrade occurred; earlier tool results, if any, still apply.', 'PROVIDER_RATE_LIMIT');
    throw new GroqProviderError(`Groq chat failed (HTTP ${response.status}). Earlier tool results, if any, still apply.`, 'PROVIDER_ERROR');
  }
  if (!response.body) throw new GroqProviderError('Groq returned no response stream.', 'PROVIDER_ERROR');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = '', text = '', finished = false, finishReason = '';
  const calls = new Map<number, { id: string; name: string; args: string }>();
  try {
    while (!finished) {
      const chunk = await reader.read();
      if (chunk.done) break;
      pending += decoder.decode(chunk.value, { stream: true });
      if (pending.length > 1000000) throw new GroqProviderError('Provider response exceeded the safe limit.', 'PROVIDER_ERROR');
      const lines = pending.split('\n'); pending = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        if (line.trim() === 'data: [DONE]') { finished = true; break; }
        const event = JSON.parse(line.slice(6));
        if (event.error) throw new GroqProviderError('Groq interrupted the response.', 'PROVIDER_ERROR');
        const choice = event.choices?.[0];
        if (choice?.finish_reason) finishReason = choice.finish_reason;
        const delta = choice?.delta;
        if (typeof delta?.content === 'string') { text += delta.content; input.onText(delta.content); }
        for (const part of delta?.tool_calls || []) {
          const call = calls.get(part.index) || { id: '', name: '', args: '' };
          call.id += part.id || ''; call.name += part.function?.name || ''; call.args += part.function?.arguments || '';
          if (call.args.length > 32000) throw new GroqProviderError('Tool arguments exceeded the safe limit.', 'INVALID_TOOL_CALL');
          calls.set(part.index, call);
        }
      }
    }
  } finally { await reader.cancel().catch(() => {}); }
  if (!finished || !finishReason || finishReason === 'length') {
    throw new GroqProviderError('Groq returned an incomplete answer. No proposed tool from this response ran.', 'INCOMPLETE_RESPONSE');
  }
  const blocks: Anthropic.ContentBlock[] = text ? [{ type: 'text', text }] : [];
  for (const call of calls.values()) {
    if (!call.id || !input.tools.some(t => t.name === call.name)) throw new GroqProviderError('Groq proposed an unavailable tool. No proposed tool from this response ran.', 'INVALID_TOOL_CALL');
    let args: unknown;
    try { args = JSON.parse(call.args); } catch { throw new GroqProviderError('Groq returned invalid tool arguments. No proposed tool from this response ran.', 'INVALID_TOOL_CALL'); }
    if (!args || typeof args !== 'object' || Array.isArray(args)) throw new GroqProviderError('Groq returned invalid tool arguments.', 'INVALID_TOOL_CALL');
    blocks.push({ type: 'tool_use', id: call.id, name: call.name, input: args });
  }
  if (!blocks.length) throw new GroqProviderError('Groq returned an empty answer.', 'PROVIDER_ERROR');
  return blocks;
}
