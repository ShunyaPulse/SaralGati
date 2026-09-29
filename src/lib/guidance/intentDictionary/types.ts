/** One elder intent: the phrases an elder might say, and the labels it points at. */
export interface IntentDefinition {
  id: string;
  name: string;
  queryPatterns: string[];
  elementKeywords: string[];
}
