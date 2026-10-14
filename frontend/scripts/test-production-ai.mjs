/**
 * Checks that the AI keys used by AI Studio (/api/ai-studio) work.
 * Run: npm run test:ai   (reads OPENAI_API_KEY / GEMINI_API_KEY from the environment or ai-service/.env)
 */
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
for (const envPath of [join(__dir, '../.env'), join(__dir, '../../ai-service/.env')]) {
  if (!existsSync(envPath)) continue;
  readFileSync(envPath, 'utf8')
    .split('\n')
    .forEach((line) => {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    });
}

let working = 0;

if (process.env.OPENAI_API_KEY) {
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Reply with the single word: ready' }],
        max_tokens: 5,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      working += 1;
      console.log('✓ OpenAI key works:', data.choices?.[0]?.message?.content?.trim());
    } else {
      console.log('✗ OpenAI error:', data.error?.message || res.status);
    }
  } catch (err) {
    console.log('✗ OpenAI request failed:', err.message);
  }
} else {
  console.log('• OPENAI_API_KEY not set');
}

if (process.env.GEMINI_API_KEY) {
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Reply with the single word: ready' }] }] }),
      },
    );
    const data = await res.json();
    if (res.ok) {
      working += 1;
      console.log('✓ Gemini key works:', data.candidates?.[0]?.content?.parts?.[0]?.text?.trim());
    } else {
      console.log('✗ Gemini error:', data.error?.message || res.status);
    }
  } catch (err) {
    console.log('✗ Gemini request failed:', err.message);
  }
} else {
  console.log('• GEMINI_API_KEY not set');
}

if (!working) {
  console.log('\nAI Studio needs at least one working key (OPENAI_API_KEY or GEMINI_API_KEY) in Vercel.');
  process.exit(1);
}
console.log('\nAI Studio is ready.');
