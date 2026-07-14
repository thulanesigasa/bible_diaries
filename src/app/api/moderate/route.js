import { NextResponse } from 'next/server';

const apiKey = process.env.OPENAI_API_KEY;
const isApiKeyConfigured = apiKey && apiKey !== 'your-openai-api-key';

// Common sensitive/offensive keywords fallback dictionary
const PROFANITIES = [
  'fuck', 'shit', 'asshole', 'bitch', 'cunt', 'bastard', 'dick', 'pussy',
  'slut', 'whore', 'dumbass', 'faggot', 'nigger', 'kike', 'chink', 'retard',
  'vulgar_word_placeholder_1', 'vulgar_word_placeholder_2' // Standard filters
];

// Helper to check content locally if offline or no key
function localModerate(content) {
  const normalized = content.toLowerCase();
  const flaggedWords = [];
  
  for (const word of PROFANITIES) {
    if (normalized.includes(word)) {
      flaggedWords.push(word);
    }
  }

  const isFlagged = flaggedWords.length > 0;
  
  return {
    flagged: isFlagged,
    categories: {
      sexual: flaggedWords.some(w => ['pussy', 'cunt', 'whore', 'slut', 'dick'].includes(w)),
      hate: flaggedWords.some(w => ['nigger', 'kike', 'chink', 'faggot'].includes(w)),
      harassment: flaggedWords.some(w => ['bitch', 'retard', 'dumbass', 'bastard'].includes(w)),
      violence: false,
      profanity: isFlagged
    },
    flaggedWords: flaggedWords,
    reason: isFlagged 
      ? `Content contains prohibited terms: [${flaggedWords.join(', ')}]. Bible Diaries values respectful and uplifting communication.`
      : null
  };
}

export async function POST(request) {
  try {
    const { content } = await request.json();

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Invalid content format.' },
        { status: 400 }
      );
    }

    // Check if live OpenAI Moderation can be used
    if (isApiKeyConfigured) {
      try {
        console.log('Sending text to OpenAI Moderation API...');
        const response = await fetch('https://api.openai.com/v1/moderations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({ input: content })
        });

        if (response.ok) {
          const data = await response.json();
          const result = data.results[0];

          let reason = null;
          if (result.flagged) {
            const activeCategories = Object.entries(result.categories)
              .filter(([_, active]) => active)
              .map(([category]) => category);
            reason = `AI Moderation flagged this message for: ${activeCategories.join(', ')}. Please keep postings supportive, helpful, and free from vulgar or explicit details.`;
          }

          return NextResponse.json({
            flagged: result.flagged,
            categories: result.categories,
            category_scores: result.category_scores,
            reason: reason,
            source: 'OpenAI API'
          });
        } else {
          console.warn('OpenAI API responded with an error, falling back to local filtration.');
        }
      } catch (err) {
        console.error('Failed connecting to OpenAI endpoint, falling back to local filtration:', err);
      }
    }

    // Local moderation fallback
    console.log('Performing local rule-based content moderation...');
    const localResult = localModerate(content);
    return NextResponse.json({
      ...localResult,
      source: 'Local Rule Engine'
    });

  } catch (error) {
    console.error('Server error during moderation handler:', error);
    return NextResponse.json(
      { error: 'Server error during moderation.' },
      { status: 500 }
    );
  }
}
