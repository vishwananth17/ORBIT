import assert from 'node:assert/strict';
import { config } from '../src/config';
import { groqTurn, toGroqMessages, GroqProviderError } from '../src/agent/groq';

async function main() {
  config.GROQ_API_KEY = 'unit-test-placeholder';
  config.GROQ_ZDR_VERIFIED = true;
  const converted = toGroqMessages('system', [
    { role: 'user', content: 'hello' },
    { role: 'assistant', content: [{ type: 'tool_use', id: 't1', name: 'test_read', input: { value: 1 } }] },
    { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: '{"ok":true}' }] },
  ]);
  assert.equal(converted[2].tool_calls[0].function.arguments, '{"value":1}');
  assert.equal(converted[3].role, 'tool');
  assert.equal(converted[3].tool_call_id, 't1');
  const tools: any[] = [{ name: 'test_read', description: 'Read', input_schema: { type: 'object' } }];
  let streamed = '', requests = 0;
  const streamFetch: typeof fetch = async (_url, options) => {
    requests++;
    const body = JSON.parse(options!.body as string);
    assert.equal(body.model, 'openai/gpt-oss-120b');
    assert.equal(body.parallel_tool_calls, false);
    assert.equal(body.max_completion_tokens, 1024);
    return new Response([
      'data: {"choices":[{"delta":{"content":"hello"}}]}',
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"t1","function":{"name":"test_read","arguments":"{\\\"value\\\":"}}]}}]}',
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"1}"}}]},"finish_reason":"tool_calls"}]}',
      'data: [DONE]', '',
    ].join('\n'), { status: 200 });
  };
  const input = { system: 'system', messages: [{ role: 'user' as const, content: 'harmless' }], tools,
    onText: (text: string) => { streamed += text; } };
  const result = await groqTurn(input, streamFetch);
  assert.equal(streamed, 'hello');
  assert.deepEqual(result[1], { type: 'tool_use', id: 't1', name: 'test_read', input: { value: 1 } });
  const failure = async (fetcher: typeof fetch, code: string) => {
    await assert.rejects(() => groqTurn(input, fetcher), (e: any) => e instanceof GroqProviderError && e.code === code);
  };
  await failure(async () => new Response('{}', { status: 429 }), 'PROVIDER_RATE_LIMIT');
  await failure(async () => new Response('data: {"choices":[{"delta":{"content":"partial"}}]}\n'), 'INCOMPLETE_RESPONSE');
  await failure(async () => new Response('data: {"choices":[{"delta":{},"finish_reason":"length"}]}\ndata: [DONE]\n'), 'INCOMPLETE_RESPONSE');
  config.GROQ_ZDR_VERIFIED = false;
  await failure(streamFetch, 'PROVIDER_NOT_READY');
  assert.equal(requests, 1, 'No network call without ZDR verification');
  config.GROQ_ZDR_VERIFIED = true;
  await assert.rejects(() => groqTurn({ ...input, system: 'x'.repeat(13000) }, streamFetch), (e: any) => e.code === 'CONTEXT_BUDGET');
  assert.equal(requests, 1);
  console.log('Groq adapter: message conversion, fragmented local tool calls, ZDR gate, budget gate, 429/no retry, incomplete responses passed.');
}
main().catch(e => { console.error(e); process.exit(1); });
