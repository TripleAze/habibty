// Questions for Rapid Fire and Would You Rather games
// 50+ questions each, tagged by category

export type Category = 'funny' | 'romantic' | 'deep' | 'random';

export interface Question {
  id: string;
  text: string;
  category: Category;
}

// ────────────────────────────────────────────────────────────
// RAPID FIRE QUESTIONS (50+)
// Quick binary choice questions for rapid-fire gameplay
// ────────────────────────────────────────────────────────────
export const RAPID_FIRE_QUESTIONS: Question[] = [
  // Funny
  { id: 'rf1', text: 'Coffee or Tea?', category: 'random' },
  { id: 'rf2', text: 'Morning person or Night owl?', category: 'random' },
  { id: 'rf3', text: 'Sweet or Savory?', category: 'random' },
  { id: 'rf4', text: 'Beach or Mountains?', category: 'random' },
  { id: 'rf5', text: 'City or Countryside?', category: 'random' },
  { id: 'rf6', text: 'Dogs or Cats?', category: 'random' },
  { id: 'rf7', text: 'Call or Text?', category: 'random' },
  { id: 'rf8', text: 'Plan ahead or Go with the flow?', category: 'random' },
  { id: 'rf9', text: 'Save money or Spend freely?', category: 'random' },
  { id: 'rf10', text: 'Cook at home or Eat out?', category: 'random' },
  { id: 'rf11', text: 'Movies or Series?', category: 'random' },
  { id: 'rf12', text: 'Action movies or Rom-coms?', category: 'random' },
  { id: 'rf13', text: 'Pop music or Hip-hop?', category: 'random' },
  { id: 'rf14', text: 'Summer or Winter?', category: 'random' },
  { id: 'rf15', text: 'Rainy days or Sunny days?', category: 'random' },
  { id: 'rf16', text: 'Books or Audiobooks?', category: 'random' },
  { id: 'rf17', text: 'Gym or Home workout?', category: 'random' },
  { id: 'rf18', text: 'Shower or Bath?', category: 'random' },
  { id: 'rf19', text: 'Pancakes or Waffles?', category: 'random' },
  { id: 'rf20', text: 'Chocolate or Vanilla?', category: 'random' },
  { id: 'rf21', text: 'Pizza or Burger?', category: 'random' },
  { id: 'rf22', text: 'iOS or Android?', category: 'random' },
  { id: 'rf23', text: 'Instagram or TikTok?', category: 'random' },
  { id: 'rf24', text: 'YouTube or Netflix?', category: 'random' },
  { id: 'rf25', text: 'Public transport or Drive?', category: 'random' },
  { id: 'rf26', text: 'Big party or Small gathering?', category: 'random' },
  { id: 'rf27', text: 'Surprise or Planned gift?', category: 'random' },
  { id: 'rf28', text: 'Handwritten letter or Text message?', category: 'random' },
  { id: 'rf29', text: 'Compliments or Acts of service?', category: 'random' },
  { id: 'rf30', text: 'Lead or Follow?', category: 'random' },
  { id: 'rf31', text: 'Talk or Listen?', category: 'random' },
  { id: 'rf32', text: 'Adventure or Comfort?', category: 'random' },
  { id: 'rf33', text: 'Fame or Fortune?', category: 'random' },
  { id: 'rf34', text: 'Past or Future?', category: 'random' },
  { id: 'rf35', text: 'Logic or Emotion?', category: 'random' },
  { id: 'rf36', text: 'Truth or Kindness?', category: 'random' },
  { id: 'rf37', text: 'Work hard or Play hard?', category: 'random' },
  { id: 'rf38', text: 'Quality or Quantity?', category: 'random' },
  { id: 'rf39', text: 'Style or Comfort?', category: 'random' },
  { id: 'rf40', text: 'Give gifts or Receive gifts?', category: 'random' },
  { id: 'rf41', text: 'Forgive easily or Hold grudges?', category: 'random' },
  { id: 'rf42', text: 'Trust quickly or Trust slowly?', category: 'random' },
  { id: 'rf43', text: 'Express feelings or Keep them inside?', category: 'random' },
  { id: 'rf44', text: 'Need alone time or Need people time?', category: 'random' },
  { id: 'rf45', text: 'Focus on details or See big picture?', category: 'random' },
  { id: 'rf46', text: 'Make first move or Wait to be approached?', category: 'romantic' },
  { id: 'rf47', text: 'Love letters or Love songs?', category: 'romantic' },
  { id: 'rf48', text: 'Cuddle or Hold hands?', category: 'romantic' },
  { id: 'rf49', text: 'Date night in or Date night out?', category: 'romantic' },
  { id: 'rf50', text: 'Long relationship or Short fling?', category: 'romantic' },
  { id: 'rf51', text: 'Love at first sight or Grow on you?', category: 'romantic' },
  { id: 'rf52', text: 'Soulmates or Make your own luck?', category: 'deep' },
  { id: 'rf53', text: 'Change for love or Stay yourself?', category: 'deep' },
  { id: 'rf54', text: 'Forgive betrayal or Never forgive?', category: 'deep' },
  { id: 'rf55', text: 'Love deeply or Love safely?', category: 'deep' },
];

// ────────────────────────────────────────────────────────────
// WOULD YOU RATHER QUESTIONS (50+)
// Thought-provoking dilemmas with two options
// ────────────────────────────────────────────────────────────
export interface WouldYouRatherQuestion {
  id: string;
  optionA: string;
  optionB: string;
  category: Category;
}

export const WOULD_YOU_RATHER_QUESTIONS: WouldYouRatherQuestion[] = [
  // Romantic
  { id: 'wyr1', optionA: 'Have a long-distance relationship', optionB: 'Be with someone locally but incompatible', category: 'romantic' },
  { id: 'wyr2', optionA: 'Never say "I love you" again', optionB: 'Never hear "I love you" again', category: 'romantic' },
  { id: 'wyr3', optionA: 'Date someone with no friends', optionB: 'Date someone whose friends hate you', category: 'romantic' },
  { id: 'wyr4', optionA: 'Be with someone who loves you more', optionB: 'Love someone more than they love you', category: 'romantic' },
  { id: 'wyr5', optionA: 'Have a partner who is always late', optionB: 'Have a partner who is always early', category: 'funny' },
  { id: 'wyr6', optionA: 'Never be able to lie to your partner', optionB: 'Never be able to tell if your partner is lying', category: 'deep' },
  { id: 'wyr7', optionA: 'Know when you will die', optionB: 'Know when your relationship will end', category: 'deep' },
  { id: 'wyr8', optionA: 'Lose all your memories of your partner', optionB: 'Have your partner lose all memories of you', category: 'romantic' },
  { id: 'wyr9', optionA: 'Be together but never travel', optionB: 'Travel the world together but never settle', category: 'romantic' },
  { id: 'wyr10', optionA: 'Partner reads your thoughts daily', optionB: 'Partner reads your texts daily', category: 'deep' },
  { id: 'wyr11', optionA: 'Marry for love with no money', optionB: 'Marry for money with no love', category: 'deep' },
  { id: 'wyr12', optionA: 'Partner always agrees with you', optionB: 'Partner always challenges you', category: 'deep' },
  { id: 'wyr13', optionA: 'Live in a world without music', optionB: 'Live in a world without movies', category: 'funny' },
  { id: 'wyr14', optionA: 'Be the funniest person in the room', optionB: 'Be the smartest person in the room', category: 'random' },
  { id: 'wyr15', optionA: 'Have unlimited free food anywhere', optionB: 'Have unlimited free travel anywhere', category: 'random' },
  { id: 'wyr16', optionA: 'Always know when someone is lying', optionB: 'Always get away with lying', category: 'deep' },
  { id: 'wyr17', optionA: 'Be famous for something embarrassing', optionB: 'Be unknown but extremely wealthy', category: 'random' },
  { id: 'wyr18', optionA: 'Talk to animals', optionB: 'Speak all human languages', category: 'funny' },
  { id: 'wyr19', optionA: 'Restart your life at 10 with current memories', optionB: 'Skip ahead 10 years with current life intact', category: 'deep' },
  { id: 'wyr20', optionA: 'Have a pause button for life', optionB: 'Have a rewind button for 5 minutes only', category: 'funny' },
  { id: 'wyr21', optionA: 'Never use social media again', optionB: 'Never watch movies/series again', category: 'random' },
  { id: 'wyr22', optionA: 'Be able to fly but only 5 km/h', optionB: 'Be invisible but only when alone', category: 'funny' },
  { id: 'wyr23', optionA: 'Know the truth about aliens', optionB: 'Know the meaning of life', category: 'deep' },
  { id: 'wyr24', optionA: 'Change one thing about your past', optionB: 'Know one thing about your future', category: 'deep' },
  { id: 'wyr25', optionA: 'Lose your sense of taste', optionB: 'Lose your sense of smell', category: 'random' },
  { id: 'wyr26', optionA: 'Always have a full phone battery', optionB: 'Always have a full gas tank', category: 'random' },
  { id: 'wyr27', optionA: 'Be 10 minutes early to everything', optionB: 'Be 20 minutes late to everything', category: 'random' },
  { id: 'wyr28', optionA: 'Have no internet for a month', optionB: 'Have no AC/heating for a month', category: 'random' },
  { id: 'wyr29', optionA: 'Give up your phone for a month', optionB: 'Give up showering for a week', category: 'funny' },
  { id: 'wyr30', optionA: 'Only eat one food for a year', optionB: 'Never eat your favorite food again', category: 'random' },
  { id: 'wyr31', optionA: 'Partner forgets your birthday', optionB: 'Partner forgets your anniversary', category: 'romantic' },
  { id: 'wyr32', optionA: 'Live without music', optionB: 'Live without your partner for a year', category: 'romantic' },
  { id: 'wyr33', optionA: 'Be too hot always', optionB: 'Be too cold always', category: 'random' },
  { id: 'wyr34', optionA: 'Have a personal chef', optionB: 'Have a personal driver', category: 'random' },
  { id: 'wyr35', optionA: 'Never sweat during exercise', optionB: 'Never feel tired', category: 'random' },
  { id: 'wyr36', optionA: 'Be able to teleport anywhere', optionB: 'Be able to read minds', category: 'funny' },
  { id: 'wyr37', optionA: 'Live in the past', optionB: 'Live in the future', category: 'deep' },
  { id: 'wyr38', optionA: 'Know all the answers', optionB: 'Ask any question and get an answer', category: 'deep' },
  { id: 'wyr39', optionA: 'Be feared by all', optionB: 'Be loved by all', category: 'deep' },
  { id: 'wyr40', optionA: 'Have no enemies but no friends', optionB: 'Have many friends and many enemies', category: 'deep' },
  { id: 'wyr41', optionA: 'Partner always initiates', optionB: 'You always initiate', category: 'romantic' },
  { id: 'wyr42', optionA: 'Relationship stays same forever', optionB: 'Relationship improves slowly', category: 'romantic' },
  { id: 'wyr43', optionA: 'Know every language', optionB: 'Be able to play every instrument', category: 'random' },
  { id: 'wyr44', optionA: 'Never get sick', optionB: 'Never feel pain', category: 'deep' },
  { id: 'wyr45', optionA: 'Live underwater', optionB: 'Live in space', category: 'funny' },
  { id: 'wyr46', optionA: 'Have X-ray vision', optionB: 'Be able to see the future', category: 'funny' },
  { id: 'wyr47', optionA: 'Control fire', optionB: 'Control water', category: 'funny' },
  { id: 'wyr48', optionA: 'Be a famous artist', optionB: 'Be an unknown scientist who changed the world', category: 'deep' },
  { id: 'wyr49', optionA: 'Always know what to say', optionB: 'Never say the wrong thing', category: 'random' },
  { id: 'wyr50', optionA: 'Have more time', optionB: 'Have more money', category: 'random' },
  { id: 'wyr51', optionA: 'Partner cooks always', optionB: 'You cook always', category: 'funny' },
  { id: 'wyr52', optionA: 'Watch the same movie forever', optionB: 'Never watch a movie again', category: 'funny' },
  { id: 'wyr53', optionA: 'Be unable to use maps', optionB: 'Be unable to use recipes', category: 'funny' },
  { id: 'wyr54', optionA: 'Have a rewind button for conversations', optionB: 'Have a pause button for arguments', category: 'romantic' },
  { id: 'wyr55', optionA: 'Never argue with partner again', optionB: 'Never misunderstand partner again', category: 'romantic' },
];

// Helper to get random questions
export function getRandomRapidFireQuestions(count: number): Question[] {
  const shuffled = [...RAPID_FIRE_QUESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function getRandomWouldYouRatherQuestions(count: number): WouldYouRatherQuestion[] {
  const shuffled = [...WOULD_YOU_RATHER_QUESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function getQuestionsByCategory(category: Category): Question[] {
  return RAPID_FIRE_QUESTIONS.filter(q => q.category === category);
}

export function getWouldYouRatherByCategory(category: Category): WouldYouRatherQuestion[] {
  return WOULD_YOU_RATHER_QUESTIONS.filter(q => q.category === category);
}
