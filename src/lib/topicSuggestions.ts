// Predefined topic suggestions organized by content type / style
export interface TopicSuggestion {
  topic: string;
  category: string; // maps loosely to content type or style
}

const TOPICS: TopicSuggestion[] = [
  // Story
  { topic: "The man who sold his house to buy Bitcoin in 2013", category: "story" },
  { topic: "How a janitor secretly became a millionaire", category: "story" },
  { topic: "The pilot who landed a plane with no engines", category: "story" },
  { topic: "A student who built a $1M app in 30 days", category: "story" },
  { topic: "The woman who faked her own death to escape debt", category: "story" },
  { topic: "How a homeless man became a tech CEO", category: "story" },
  { topic: "The spy who lived a double life for 20 years", category: "story" },
  { topic: "A teacher who accidentally went viral overnight", category: "story" },

  // Educational
  { topic: "Why you forget 90% of what you read", category: "educational" },
  { topic: "How your phone is rewiring your brain", category: "educational" },
  { topic: "The science behind why we procrastinate", category: "educational" },
  { topic: "5 psychological tricks marketers use on you", category: "educational" },
  { topic: "Why cold showers actually change your body", category: "educational" },
  { topic: "How AI will replace 80% of jobs by 2030", category: "educational" },
  { topic: "The real reason coffee makes you tired", category: "educational" },
  { topic: "Why billionaires wake up at 4 AM", category: "educational" },

  // Entertainment
  { topic: "Things that only happen at 3 AM", category: "entertainment" },
  { topic: "What your birth month says about your personality", category: "entertainment" },
  { topic: "The creepiest unsolved mystery on the internet", category: "entertainment" },
  { topic: "If historical figures had social media", category: "entertainment" },
  { topic: "The dumbest world records that actually exist", category: "entertainment" },
  { topic: "Foods that are illegal in other countries", category: "entertainment" },

  // Selling
  { topic: "Why 99% of people fail at online business", category: "selling" },
  { topic: "The $0 marketing strategy that makes millions", category: "selling" },
  { topic: "How to sell anything to anyone in 60 seconds", category: "selling" },
  { topic: "The product launch formula that never fails", category: "selling" },

  // Personal brand
  { topic: "How to build a personal brand from zero followers", category: "personal-brand" },
  { topic: "The content strategy that got me 100K followers", category: "personal-brand" },
  { topic: "Why most creators quit before making money", category: "personal-brand" },
  { topic: "How to stand out in a saturated niche", category: "personal-brand" },

  // Viral / trending
  { topic: "Things the internet is not ready to hear", category: "viral" },
  { topic: "Unpopular opinions that are actually facts", category: "viral" },
  { topic: "What happens to your body when you stop eating sugar", category: "viral" },
  { topic: "The dark side of being famous", category: "viral" },
  { topic: "Things your teacher never told you", category: "viral" },
  { topic: "Why the smartest people are usually the loneliest", category: "viral" },

  // Suspense / curiosity
  { topic: "The experiment that proved we live in a simulation", category: "suspense" },
  { topic: "Why NASA deleted this photo", category: "suspense" },
  { topic: "The island where no one is allowed to go", category: "curiosity" },
  { topic: "What really happens when you die for 7 minutes", category: "curiosity" },

  // Emotional
  { topic: "The last letter a soldier wrote before dying", category: "emotional" },
  { topic: "A dog that waited 10 years for its owner", category: "emotional" },
  { topic: "The mother who sacrificed everything so her son could succeed", category: "emotional" },
];

/**
 * Get topic suggestions filtered by relevance.
 * @param count Number of suggestions to return
 * @param contentType Current content type selection
 * @param style Current style selection
 */
export function getTopicSuggestions(
  count: number,
  contentType?: string,
  style?: string,
): TopicSuggestion[] {
  // Try to match by content type or style
  const relevant = TOPICS.filter(
    (t) => t.category === contentType || t.category === style,
  );

  // Shuffle helper
  const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  if (relevant.length >= count) {
    return shuffle(relevant).slice(0, count);
  }

  // Fill with random from the rest
  const rest = TOPICS.filter((t) => !relevant.includes(t));
  return shuffle([...relevant, ...shuffle(rest)]).slice(0, count);
}

/** Get a single random topic */
export function getRandomTopic(contentType?: string, style?: string): string {
  const suggestions = getTopicSuggestions(1, contentType, style);
  return suggestions[0]?.topic || "The secret nobody talks about";
}
