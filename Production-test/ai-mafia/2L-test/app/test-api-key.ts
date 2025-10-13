import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';

const apiKey = fs.readFileSync('.anthropic-key.txt', 'utf-8').trim();
const client = new Anthropic({ apiKey });

async function testKey() {
  console.log('Testing API key with Claude 4.5 Sonnet...');
  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 50,
    messages: [{ role: 'user', content: 'Say "API key works!"' }]
  });
  console.log('✓ Success:', response.content[0].type === 'text' ? response.content[0].text : '');
  console.log('✓ Model:', response.model);
  console.log('✓ Tokens:', response.usage);
}

testKey().catch(err => {
  console.error('✗ Error:', err.message);
  process.exit(1);
});
