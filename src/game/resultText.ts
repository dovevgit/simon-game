export function completedRoundsText(completedRounds: number): string {
  if (completedRounds === 0) return 'לא השלמת אף שלב';
  if (completedRounds === 1) return 'השלמת שלב אחד';
  return `השלמת ${completedRounds} שלבים`;
}
