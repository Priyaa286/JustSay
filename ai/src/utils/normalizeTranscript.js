/**
 * Transcript normalization utility for Tamil, Tanglish, and English code-switched speech.
 * Designed for street vendor and Kirana shopkeeper speech patterns.
 */

// Common Tamil number word mappings in Tanglish & formal Tamil
const NUMBER_WORD_MAP = {
  'oru': '1',
  'onnu': '1',
  'rendu': '2',
  'irandu': '2',
  'moonu': '3',
  'moondru': '3',
  'naalu': '4',
  'naangu': '4',
  'anju': '5',
  'aindhu': '5',
  'aaru': '6',
  'yezhu': '7',
  'yelu': '7',
  'yettu': '8',
  'ombodhu': '9',
  'onbadhu': '9',
  'pathu': '10',
  'iruvadhu': '20',
  'muppadhu': '30',
  'naappadhu': '40',
  'aimbadhu': '50',
  'arubadhu': '60',
  'ezhubadhu': '70',
  'enbhadhu': '80',
  'thonnooru': '90',
  'nooru': '100',
  'ainnooru': '500',
  'aayiram': '1000'
};

// Common Tamil speech fillers to clean up
const FILLER_WORDS = [
  'uh', 'um', 'ah', 'er', 'mm', 'hmm',
  'anda', 'inga', 'paaru', 'seri', 'kelu'
];

/**
 * Normalizes vendor transcript for downstream LLM extraction
 * @param {string} transcript - Raw transcript from speech-to-text
 * @returns {string} Normalized transcript
 */
export function normalizeTranscript(transcript) {
  if (!transcript || typeof transcript !== 'string') {
    return '';
  }

  let text = transcript.trim();

  // 1. Lowercase for consistent parsing (preserving casing for names will be handled by LLM)
  // Clean multiple spaces, control characters, tabs
  text = text.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ');

  // 2. Clean leading/trailing quotes and redundant punctuation
  text = text.replace(/^["'“”‘’]+|["'“”‘’]+$/g, '').trim();

  // 3. Normalize currency markers: "rs", "rs.", "inr", "rooba", "roobai", "rubai" -> "rupees"
  text = text.replace(/\b(rs|inr|rooba|roobai|rubai|roo)\b\.?/gi, 'rupees');

  // 4. Normalize hyphenated suffixes e.g. "Ravi-ku" -> "Ravi ku", "account-la" -> "account la", "add-pannu" -> "add pannu"
  text = text.replace(/([a-zA-Z\u0B80-\u0BFF]+)-(ku|ukku|la|oda|kitta|pannu|podu)\b/gi, '$1 $2');

  // 5. Clean common repetitive filler stutters if isolated
  const words = text.split(/\s+/);
  const cleanedWords = words.filter((w, idx) => {
    const lower = w.toLowerCase().replace(/[^a-z\u0B80-\u0BFF]/g, '');
    if (FILLER_WORDS.includes(lower) && idx === 0) {
      return false; // remove filler at start
    }
    return true;
  });

  return cleanedWords.join(' ').trim();
}

/**
 * Extracts and maps spoken Tamil number phrases if present
 * e.g., "rendu tea" -> "2 tea"
 * @param {string} text
 * @returns {string}
 */
export function normalizeTamilNumbers(text) {
  if (!text) return '';
  let result = text;
  for (const [word, digit] of Object.entries(NUMBER_WORD_MAP)) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    result = result.replace(regex, digit);
  }
  return result;
}

export default {
  normalizeTranscript,
  normalizeTamilNumbers
};
