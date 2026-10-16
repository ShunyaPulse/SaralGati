import { cacheGet, cacheSet, cacheDelete } from './redis';
import type { GuidanceLang } from '@/lib/guidance/guidanceLanguage';
import { elementLabelLower, isActionableElement } from '@/lib/guidance/uiElement';
import { isNoiseElement } from '@/lib/guidance/noiseElement';

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

export function flowStepInstruction(
  step: FlowStep,
  totalSteps: number,
  lang: GuidanceLang
): string {
  if (lang === 'en') {
    return `Step ${step.stepNumber} of ${totalSteps}: tap "${step.label}" on your screen.`;
  }
  return step.hindiInstruction;
}

export function findMatchingElement(uiElements: string[], keywords: string[]): number {
  return uiElements.findIndex((el) => {
    if (!isActionableElement(el)) return false;
    const lower = elementLabelLower(el);
    if (!lower || isNoiseElement(lower, { actionable: true })) return false;
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
 * Multi-Step Flow Evaluator with Forward Step-Lookahead (Skip-Step Recovery):
 * Tracks multi-turn tasks across screen navigations and automatically fast-forwards
 * if the app skipped an intermediate screen (e.g. already logged in or pre-selected tab).
 */
export async function evaluateMultiStepFlow(
  elderId: string | undefined,
  question: string,
  uiElements: string[],
  lang: GuidanceLang = 'hi'
): Promise<FlowEvaluationResult | null> {
  if (!elderId) return null;

  const qLower = question.toLowerCase().trim();

  // 1. Check for cancellation intents
  if (/^(cancel|band karo|ruk jao|wapas|chhod do|peechhe|रद्द|बंद करो)$/i.test(qLower)) {
    await clearFlowSession(elderId);
    return null;
  }

  const existingSession = await getFlowSession(elderId);

  // 2. Active Existing Flow Path (with Forward Step-Lookahead for skip-step recovery)
  if (existingSession) {
    const flowDef = getPlaybookById(existingSession.flowId);
    if (flowDef) {
      const candidateSteps = flowDef.steps.filter(
        (s) => s.stepNumber >= existingSession.currentStep
      );
      for (const stepDef of candidateSteps) {
        const matchIdx = findMatchingElement(uiElements, stepDef.expectedKeywords);
        if (matchIdx !== -1) {
          const isFinalStep = stepDef.stepNumber >= flowDef.steps.length;

          if (isFinalStep) {
            await clearFlowSession(elderId);
          } else {
            await setFlowSession(elderId, {
              ...existingSession,
              currentStep: stepDef.stepNumber + 1,
              lastUpdated: Date.now()
            });
          }

          return {
            isFlowActive: true,
            flowId: flowDef.id,
            currentStep: stepDef.stepNumber,
            totalSteps: flowDef.steps.length,
            stepLabel: stepDef.label,
            explanation: flowStepInstruction(
              stepDef,
              flowDef.steps.length,
              lang
            ),
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
        await setFlowSession(elderId, {
          flowId: matchingPlaybook.id,
          currentStep: 2,
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
          explanation: flowStepInstruction(
            step1,
            matchingPlaybook.steps.length,
            lang
          ),
          highlightIndex: matchIdx
        };
      }
    }
  }

  return null;
}
