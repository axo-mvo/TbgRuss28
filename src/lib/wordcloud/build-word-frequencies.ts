const NORWEGIAN_STOP_WORDS = new Set([
  'og', 'er', 'det', 'i', 'at', 'en', 'et', 'til', 'for', 'pa', 'med',
  'har', 'som', 'av', 'de', 'den', 'var', 'vi', 'kan', 'om', 'fra',
  'ikke', 'sa', 'seg', 'men', 'ble', 'da', 'skal', 'vil', 'nar', 'ut',
  'sin', 'han', 'hun', 'hva', 'alle', 'noe', 'noen', 'dette', 'disse',
  'oss', 'dem', 'jeg', 'du', 'meg', 'deg', 'min', 'din', 'man',
  'bare', 'her', 'der', 'over', 'under', 'etter', 'ved', 'hadde',
  'ham', 'sine', 'sitt', 'vart', 'bli', 'blitt', 'ma', 'far', 'mot',
  'jo', 'ja', 'nei', 'ganske', 'veldig', 'svart', 'litt', 'fordi',
  'hvis', 'eller', 'enten', 'bade', 'mens', 'siden', 'hvor', 'hvordan',
  'hvilke', 'hvilket', 'hvilken', 'kunne', 'skulle', 'ville', 'burde',
  'matte', 'ha', 'vaere', 'vare', 'fa', 'fikk', 'fatt', 'ga', 'gatt',
  'nok', 'enda', 'opp', 'inn', 'gjennom', 'hele', 'hver', 'andre',
  'annet', 'anna', 'selv', 'kanskje', 'derfor', 'dessuten',
  // With Norwegian characters
  'på', 'så', 'når', 'må', 'få', 'gå', 'både', 'være', 'vårt', 'være',
  'fått', 'gått', 'måtte', 'svært',
])

export interface WordFrequency {
  word: string
  count: number
}

export function buildWordFrequencies(texts: string[]): WordFrequency[] {
  const joined = texts.join(' ').toLowerCase()

  // Remove punctuation but keep Norwegian characters (a-z, 0-9, aeoeaa, spaces)
  const cleaned = joined.replace(/[^a-zA-Z0-9\u00E6\u00F8\u00E5\u00C6\u00D8\u00C5\s]/g, ' ')

  const words = cleaned.split(/\s+/).filter(Boolean)

  const counts = new Map<string, number>()

  for (const word of words) {
    if (word.length < 3) continue
    if (NORWEGIAN_STOP_WORDS.has(word)) continue

    counts.set(word, (counts.get(word) ?? 0) + 1)
  }

  const sorted = Array.from(counts.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 80)

  return sorted
}
