import { cacheGet, cacheSet, cacheDelete } from '@/lib/redis';

import {
  FlowStep,
  MultiStepFlowDefinition,
  ALL_PLAYBOOKS,
  getPlaybookById,
  findMatchingPlaybook
} from '@/lib/playbooks';

export type { FlowStep, MultiStepFlowDefinition };

export interface ActiveFlowSession {
  flowId: string;
  currentStep: number;
  totalSteps: number;
  goal: string;
  lastUpdated: number;
}

export interface FlowEvaluationResult {
  isFlowActive: boolean;
  flowId?: string;
  currentStep?: number;
  totalSteps?: number;
  stepLabel?: string;
  explanation?: string;
  highlightIndex?: number | null;
}

export const MULTI_STEP_FLOWS: MultiStepFlowDefinition[] = ALL_PLAYBOOKS;

const FLOW_TTL_SECONDS = 900; // 15 minutes session TTL

function findMatchingElement(uiElements: string[], keywords: string[]): number {
  return uiElements.findIndex((el) => {
    const isActionable = el.startsWith('[BUTTON]') || el.startsWith('[INPUT]') || el.startsWith('[TOGGLE]');
    if (!isActionable) return false;
    const lower = el.toLowerCase();
    return keywords.some((k) => lower.includes(k.toLowerCase()));
  });
}

export async function getFlowSession(elderId: string): Promise<ActiveFlowSession | null> {
  if (!elderId) return null;
  return await cacheGet<ActiveFlowSession>(`elder_flow:${elderId}`);
}

export async function setFlowSession(elderId: string, session: ActiveFlowSession): Promise<void> {
  if (!elderId) return;
  await cacheSet(`elder_flow:${elderId}`, session, FLOW_TTL_SECONDS);
}

export async function clearFlowSession(elderId: string): Promise<void> {
  if (!elderId) return;
  await cacheDelete(`elder_flow:${elderId}`);
}

/**
 * Multi-Step Flow Evaluator:
 * Tracks multi-turn tasks across screen navigations and advances steps seamlessly.
 */
export async function evaluateMultiStepFlow(
  elderId: string | undefined,
  question: string,
  uiElements: string[]
): Promise<FlowEvaluationResult | null> {
  if (!elderId) return null;

  const qLower = question.toLowerCase().trim();

  // 1. Check for cancellation intents
  if (/^(cancel|band karo|ruk jao|wapas|chhod do|peechhe|रद्द|बंद करो)$/i.test(qLower)) {
    await clearFlowSession(elderId);
    return null;
  }

  const existingSession = await getFlowSession(elderId);

  // 2. Active Existing Flow Path
  if (existingSession) {
    const flowDef = getPlaybookById(existingSession.flowId);
    if (flowDef) {
      const currentStepDef = flowDef.steps.find((s) => s.stepNumber === existingSession.currentStep);
      if (currentStepDef) {
        const matchIdx = findMatchingElement(uiElements, currentStepDef.expectedKeywords);
        if (matchIdx !== -1) {
          // Found matching target for current step
          const isFinalStep = existingSession.currentStep >= flowDef.steps.length;

          if (isFinalStep) {
            // Flow completed! Clear session
            await clearFlowSession(elderId);
          } else {
            // Advance to next step for the subsequent screen
            await setFlowSession(elderId, {
              ...existingSession,
              currentStep: existingSession.currentStep + 1,
              lastUpdated: Date.now()
            });
          }

          return {
            isFlowActive: true,
            flowId: flowDef.id,
            currentStep: currentStepDef.stepNumber,
            totalSteps: flowDef.steps.length,
            stepLabel: currentStepDef.label,
            explanation: currentStepDef.hindiInstruction,
            highlightIndex: matchIdx
          };
        }
      }
    }
  }

  // 3. New Flow Initiation Path
  const matchingPlaybook = findMatchingPlaybook(question);
  if (matchingPlaybook) {
    const step1 = matchingPlaybook.steps[0];
    if (step1) {
      const matchIdx = findMatchingElement(uiElements, step1.expectedKeywords);
      if (matchIdx !== -1) {
        // Initialize flow in Redis
        await setFlowSession(elderId, {
          flowId: matchingPlaybook.id,
          currentStep: 2, // Next expected step
          totalSteps: matchingPlaybook.steps.length,
          goal: question,
          lastUpdated: Date.now()
        });

        return {
          isFlowActive: true,
          flowId: matchingPlaybook.id,
          currentStep: step1.stepNumber,
          totalSteps: matchingPlaybook.steps.length,
          stepLabel: step1.label,
          explanation: step1.hindiInstruction,
          highlightIndex: matchIdx
        };
      }
    }
  }

  return null;
}
