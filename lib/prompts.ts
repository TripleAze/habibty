// Truth or Dare prompts library
// 30+ prompts for each type, categorized by tone

export type PromptCategory = 'funny' | 'romantic' | 'deep' | 'playful';

export interface Prompt {
  id: string;
  type: 'truth' | 'dare';
  text: string;
  category: PromptCategory;
}

// ────────────────────────────────────────────────────────────
// TRUTH PROMPTS (35+)
// ────────────────────────────────────────────────────────────
export const TRUTHS: Prompt[] = [
  // Romantic
  { id: 't1', type: 'truth', text: "What's the first thing you noticed about me?", category: 'romantic' },
  { id: 't2', type: 'truth', text: 'When did you first realize you had feelings for me?', category: 'romantic' },
  { id: 't3', type: 'truth', text: "What's your favorite memory of us together?", category: 'romantic' },
  { id: 't4', type: 'truth', text: 'What song makes you think of me?', category: 'romantic' },
  { id: 't5', type: 'truth', text: "What's one thing I do that always makes you smile?", category: 'romantic' },
  { id: 't6', type: 'truth', text: 'How would you describe our love in three words?', category: 'romantic' },
  { id: 't7', type: 'truth', text: "What's your idea of a perfect date with me?", category: 'romantic' },
  { id: 't8', type: 'truth', text: 'What do you miss most when we are apart?', category: 'romantic' },
  { id: 't9', type: 'truth', text: "What's one thing you've never told me about how you feel?", category: 'romantic' },
  { id: 't10', type: 'truth', text: 'What moment made you fall for me?', category: 'romantic' },
  { id: 't11', type: 'truth', text: "What's the most romantic thing you've ever done?", category: 'romantic' },
  { id: 't12', type: 'truth', text: 'What do you love most about our relationship?', category: 'romantic' },
  // Funny
  { id: 't13', type: 'truth', text: "What's the most embarrassing thing you've done for love?", category: 'funny' },
  { id: 't14', type: 'truth', text: 'Have you ever practiced kissing on your hand?', category: 'funny' },
  { id: 't15', type: 'truth', text: "What's the worst date you've ever been on?", category: 'funny' },
  { id: 't16', type: 'truth', text: 'Have you ever stalked an ex on social media?', category: 'funny' },
  { id: 't17', type: 'truth', text: "What's your most embarrassing texting mistake?", category: 'funny' },
  { id: 't18', type: 'truth', text: 'Have you ever pretended to like something to impress someone?', category: 'funny' },
  { id: 't19', type: 'truth', text: "What's the cheesiest pickup line you've ever used?", category: 'funny' },
  { id: 't20', type: 'truth', text: 'Have you ever had a crush on a fictional character?', category: 'funny' },
  { id: 't21', type: 'truth', text: "What's something you've googled about relationships?", category: 'funny' },
  { id: 't22', type: 'truth', text: 'Have you ever taken a selfie just to delete it?', category: 'funny' },
  { id: 't23', type: 'truth', text: "What's your guilty pleasure song?", category: 'funny' },
  { id: 't24', type: 'truth', text: 'Have you ever laughed at an inappropriate time?', category: 'funny' },
  // Deep
  { id: 't25', type: 'truth', text: "What's your biggest fear about relationships?", category: 'deep' },
  { id: 't26', type: 'truth', text: 'What does trust mean to you?', category: 'deep' },
  { id: 't27', type: 'truth', text: "What's something you've never forgiven yourself for?", category: 'deep' },
  { id: 't28', type: 'truth', text: 'What lesson did your last relationship teach you?', category: 'deep' },
  { id: 't29', type: 'truth', text: "What's your love language and why?", category: 'deep' },
  { id: 't30', type: 'truth', text: 'What does commitment mean to you?', category: 'deep' },
  { id: 't31', type: 'truth', text: "What's a boundary you wish more people respected?", category: 'deep' },
  { id: 't32', type: 'truth', text: 'What are you most insecure about?', category: 'deep' },
  { id: 't33', type: 'truth', text: "What's something you're afraid to tell me?", category: 'deep' },
  { id: 't34', type: 'truth', text: 'What does your ideal future look like?', category: 'deep' },
  { id: 't35', type: 'truth', text: "What's the hardest thing you've ever been through?", category: 'deep' },
  { id: 't36', type: 'truth', text: 'What do you need most in a relationship?', category: 'deep' },
  { id: 't37', type: 'truth', text: "What's a dealbreaker for you that others might not understand?", category: 'deep' },
  { id: 't38', type: 'truth', text: 'How do you show love when words are hard?', category: 'deep' },
];

// ────────────────────────────────────────────────────────────
// DARE PROMPTS (35+)
// ────────────────────────────────────────────────────────────
export const DARES: Prompt[] = [
  // Romantic
  { id: 'd1', type: 'dare', text: "Send me a voice note saying something you've never said out loud", category: 'romantic' },
  { id: 'd2', type: 'dare', text: 'Write me a short love letter (3 sentences minimum)', category: 'romantic' },
  { id: 'd3', type: 'dare', text: 'Describe your perfect kiss in detail', category: 'romantic' },
  { id: 'd4', type: 'dare', text: 'Tell me what you would do on our ideal date night', category: 'romantic' },
  { id: 'd5', type: 'dare', text: 'Share a fantasy you have about us', category: 'romantic' },
  { id: 'd6', type: 'dare', text: 'Look into my eyes for 30 seconds without looking away', category: 'romantic' },
  { id: 'd7', type: 'dare', text: 'Tell me three things you find attractive about me', category: 'romantic' },
  { id: 'd8', type: 'dare', text: 'Whisper something sweet in my ear', category: 'romantic' },
  { id: 'd9', type: 'dare', text: 'Describe the moment you knew you liked me', category: 'romantic' },
  { id: 'd10', type: 'dare', text: 'Give me a compliment that starts with "I love the way..."', category: 'romantic' },
  { id: 'd11', type: 'dare', text: 'Share what you think about when you miss me', category: 'romantic' },
  { id: 'd12', type: 'dare', text: 'Tell me what makes us different from other couples', category: 'romantic' },
  // Funny
  { id: 'd13', type: 'dare', text: 'Do your best impression of me', category: 'funny' },
  { id: 'd14', type: 'dare', text: 'Sing a love song in a funny voice', category: 'funny' },
  { id: 'd15', type: 'dare', text: 'Do 10 push-ups while saying "I love you" each time', category: 'funny' },
  { id: 'd16', type: 'dare', text: 'Make up a rap about us right now', category: 'funny' },
  { id: 'd17', type: 'dare', text: 'Talk in an accent for the next 2 rounds', category: 'funny' },
  { id: 'd18', type: 'dare', text: 'Let me post anything on your social media story', category: 'funny' },
  { id: 'd19', type: 'dare', text: 'Do your best sexy dance for 15 seconds', category: 'funny' },
  { id: 'd20', type: 'dare', text: 'Pretend to propose to me dramatically', category: 'funny' },
  { id: 'd21', type: 'dare', text: 'Make 5 funny faces and let me screenshot one', category: 'funny' },
  { id: 'd22', type: 'dare', text: 'Speak only in questions for the next 2 rounds', category: 'funny' },
  { id: 'd23', type: 'dare', text: 'Act like a monkey for 20 seconds', category: 'funny' },
  { id: 'd24', type: 'dare', text: 'Let me tickle you for 10 seconds', category: 'funny' },
  // Deep/Intimate
  { id: 'd25', type: 'dare', text: 'Share something vulnerable about yourself', category: 'deep' },
  { id: 'd26', type: 'dare', text: 'Tell me a secret you have never shared', category: 'deep' },
  { id: 'd27', type: 'dare', text: 'Describe what you need most from me right now', category: 'deep' },
  { id: 'd28', type: 'dare', text: 'Share a worry you have about our relationship', category: 'deep' },
  { id: 'd29', type: 'dare', text: 'Tell me something you appreciate about how I love you', category: 'deep' },
  { id: 'd30', type: 'dare', text: 'Share a hope you have for our future together', category: 'deep' },
  { id: 'd31', type: 'dare', text: 'Describe a moment when you felt truly loved by me', category: 'deep' },
  { id: 'd32', type: 'dare', text: 'Tell me one way I can love you better', category: 'deep' },
  // Playful
  { id: 'd33', type: 'dare', text: 'Let me send a text to anyone in your contacts', category: 'playful' },
  { id: 'd34', type: 'dare', text: 'Kiss me wherever I choose', category: 'playful' },
  { id: 'd35', type: 'dare', text: 'Let me give you a nickname and use it for a day', category: 'playful' },
  { id: 'd36', type: 'dare', text: 'Send me a photo of what you are wearing right now', category: 'playful' },
  { id: 'd37', type: 'dare', text: 'Let me choose your profile picture for 24 hours', category: 'playful' },
  { id: 'd38', type: 'dare', text: 'Do whatever I say for the next 2 minutes', category: 'playful' },
  { id: 'd39', type: 'dare', text: 'Let me look through your phone for 1 minute', category: 'playful' },
  { id: 'd40', type: 'dare', text: 'Share your screen time report with me', category: 'playful' },
];

// Combined export for easy access
export const ALL_PROMPTS: Prompt[] = [...TRUTHS, ...DARES];

// Helper functions
export function getTruths(category?: PromptCategory): Prompt[] {
  if (!category) return TRUTHS;
  return TRUTHS.filter(t => t.category === category);
}

export function getDares(category?: PromptCategory): Prompt[] {
  if (!category) return DARES;
  return DARES.filter(d => d.category === category);
}

export function getRandomTruth(): Prompt {
  const index = Math.floor(Math.random() * TRUTHS.length);
  return TRUTHS[index];
}

export function getRandomDare(): Prompt {
  const index = Math.floor(Math.random() * DARES.length);
  return DARES[index];
}

export function getRandomPrompt(): Prompt {
  return Math.random() > 0.5 ? getRandomTruth() : getRandomDare();
}

export function getPromptsByCategory(category: PromptCategory): Prompt[] {
  return ALL_PROMPTS.filter(p => p.category === category);
}
