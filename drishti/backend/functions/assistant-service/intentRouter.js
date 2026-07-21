/**
 * DRISHTI — assistant-service / intentRouter
 * Lightweight rule-based intent classification, backed by Zia NER for
 * entity extraction. Not an LLM — deliberately simple and auditable,
 * matching the "stay Catalyst-native" decision. Swap in a proper LLM/RAG
 * layer later if the demo needs richer free-text handling.
 */

const INTENTS = {
  CASE_LOOKUP: 'CASE_LOOKUP',
  HOTSPOT: 'HOTSPOT',
  TREND: 'TREND',
  NETWORK: 'NETWORK',
  UNKNOWN: 'UNKNOWN'
};

const KEYWORD_RULES = [
  { intent: INTENTS.CASE_LOOKUP, patterns: [/\bcase\b/i, /\bfir\b/i, /\bcrime no/i, /\bstatus of\b/i] },
  { intent: INTENTS.HOTSPOT, patterns: [/\bhotspot/i, /\bhigh.?crime area/i, /\bwhere.*crime/i, /\bmap\b/i] },
  { intent: INTENTS.TREND, patterns: [/\btrend/i, /\bover time\b/i, /\bthis month\b/i, /\bcompared to\b/i, /\bincreas|decreas/i] },
  { intent: INTENTS.NETWORK, patterns: [/\bconnection/i, /\bassociate/i, /\bnetwork\b/i, /\blinked to\b/i, /\bco.?accused/i] }
];

// FIR crime number format from schema-design.md: 1+4+4+4+5 digits = 18 digits
const CRIME_NO_REGEX = /\b\d{18}\b/;
const CASE_ID_REGEX = /\bcase\s*(?:id|no\.?|number)?\s*[:#]?\s*(\d+)\b/i;

function classifyIntent(text) {
  for (const rule of KEYWORD_RULES) {
    if (rule.patterns.some(p => p.test(text))) {
      return rule.intent;
    }
  }
  return INTENTS.UNKNOWN;
}

function extractCaseReference(text) {
  const crimeNoMatch = text.match(CRIME_NO_REGEX);
  if (crimeNoMatch) return { type: 'crimeNo', value: crimeNoMatch[0] };

  const caseIdMatch = text.match(CASE_ID_REGEX);
  if (caseIdMatch) return { type: 'caseId', value: caseIdMatch[1] };

  return null;
}

/**
 * Pulls out location/org entities via Zia NER, useful for hotspot/trend
 * filtering by district or crime-head name mentioned in free text.
 */
async function extractEntities(zia, text) {
  try {
    const result = await zia.getNERPrediction([text]);
    return result;
  } catch (err) {
    console.error('Zia NER failed, continuing without entities:', err.message);
    return null;
  }
}

module.exports = { INTENTS, classifyIntent, extractCaseReference, extractEntities };
