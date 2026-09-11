import { config } from 'dotenv';
config();
import { geminiGenerate } from './netlify/functions/_lib/ai/providers.ts';

const NL = String.fromCharCode(10);
const DELIM = '###';

async function testPrompt(items) {
  const flat = items.map((t) => t.replace(/[\r\n]+/g, ' ').trim());
  const prompt =
    'Terjemahkan teks berikut ke bahasa Jepang untuk keperluan formulir biodata (CV) kerja.' +
    NL + 'ATURAN:' +
    NL + '- Terjemahkan baris demi baris, dan pertahankan urutannya.' +
    NL + '- JANGAN menambahkan teks lain selain terjemahan.' +
    NL + '- Pisahkan setiap hasil terjemahan dengan baris yang HANYA berisi delimiter "###".' +
    NL + '- Teks mungkin berisi kalimat atau hanya satu kata.' +
    NL + NL +
    'INPUT TEKS UNTUK DITERJEMAHKAN:' + NL +
    flat.join(NL + DELIM + NL);
    
  console.log('--- PROMPT ---');
  console.log(prompt);
  console.log('--------------');
  
  const r = await geminiGenerate(prompt, []);
  console.log('--- RAW GEMINI RESPONSE ---');
  console.log(r.reply);
  console.log('---------------------------');
}

testPrompt(['Saya ingin bekerja keras di Jepang', 'Saya adalah orang yang disiplin']);
