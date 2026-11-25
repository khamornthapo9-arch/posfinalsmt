/** All shops use the retail workflow, including legacy restaurant records. */
export function usesRestaurantMode(_businessType: string | null | undefined): boolean {
  return false;
}
