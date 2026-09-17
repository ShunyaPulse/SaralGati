export interface FlowStep {
  stepNumber: number;
  label: string;
  hindiInstruction: string;
  expectedKeywords: string[];
}

export interface MultiStepFlowDefinition {
  id: string;
  name: string;
  category: 'communication' | 'finance_upi' | 'health_medical' | 'travel_transit' | 'ecommerce_food' | 'system_accessibility' | 'government_devotion';
  triggerPatterns: string[];
  steps: FlowStep[];
}
