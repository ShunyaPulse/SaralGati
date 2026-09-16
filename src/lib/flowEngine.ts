import { cacheGet, cacheSet, cacheDelete } from '@/lib/redis';

export interface FlowStep {
  stepNumber: number;
  label: string;
  hindiInstruction: string;
  expectedKeywords: string[];
}

export interface MultiStepFlowDefinition {
  id: string;
  name: string;
  triggerPatterns: string[];
  steps: FlowStep[];
}

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

export const MULTI_STEP_FLOWS: MultiStepFlowDefinition[] = [
  // 1. Bill Payment Flow
  {
    id: 'bill_payment',
    name: 'Bill Payment / Electricity & Water',
    triggerPatterns: [
      'bijli ka bill', 'electricity bill', 'bill bharna', 'paani ka bill', 'bill payment',
      'bijli bill', 'light bill', 'bill jama', 'बिजली का बिल', 'बिल भरना', 'पानी का बिल'
    ],
    steps: [
      {
        stepNumber: 1,
        label: 'Category / Board Selection',
        hindiInstruction: 'कदम 1/3: अपने बिल की श्रेणी (Category) या बोर्ड चुनने के लिए यहाँ दबाएं।',
        expectedKeywords: ['electricity', 'bijli', 'water', 'bill', 'recharge', 'बिजली', 'बिल']
      },
      {
        stepNumber: 2,
        label: 'Consumer Number Entry',
        hindiInstruction: 'कदम 2/3: यहाँ अपना उपभोक्ता नंबर (Consumer/CA Number) लिखें।',
        expectedKeywords: ['consumer', 'account', 'ca number', 'number', 'उपभोक्ता', 'खाता']
      },
      {
        stepNumber: 3,
        label: 'Proceed to Pay',
        hindiInstruction: 'कदम 3/3: बिल का भुगतान करने के लिए यहाँ पे (Pay) या आगे बढ़ें पर दबाएं।',
        expectedKeywords: ['proceed', 'fetch', 'pay', 'bhugtan', 'पे', 'आगे']
      }
    ]
  },

  // 2. Save New Contact Flow
  {
    id: 'new_contact',
    name: 'Save New Contact',
    triggerPatterns: [
      'naya contact', 'naya number save', 'contact save', 'number jodna', 'sampark jodo',
      'naya phone number', 'नया नंबर', 'नया संपर्क', 'नंबर सेव'
    ],
    steps: [
      {
        stepNumber: 1,
        label: 'Create Contact Button',
        hindiInstruction: 'कदम 1/3: नया संपर्क बनाने के लिए यहाँ प्लस (+) बटन पर दबाएं।',
        expectedKeywords: ['create', 'new', 'add', '+', 'प्लस', 'नया', 'जोड़ें']
      },
      {
        stepNumber: 2,
        label: 'Enter Name',
        hindiInstruction: 'कदम 2/3: यहाँ व्यक्ति का नाम लिखें।',
        expectedKeywords: ['name', 'first name', 'naam', 'नाम']
      },
      {
        stepNumber: 3,
        label: 'Save Contact',
        hindiInstruction: 'कदम 3/3: नंबर सुरक्षित करने के लिए यहाँ सेव (Save) दबाएं।',
        expectedKeywords: ['save', 'done', 'check', 'सेव', 'सुरक्षित']
      }
    ]
  },

  // 3. Cab / Auto Booking Flow
  {
    id: 'cab_booking',
    name: 'Cab / Auto Booking',
    triggerPatterns: [
      'auto bulao', 'cab bulao', 'taxi book', 'gaadi bulao', 'ola book', 'uber book',
      'auto book', 'ऑटो बुलाओ', 'कैब बुक', 'गाड़ी बुलाओ'
    ],
    steps: [
      {
        stepNumber: 1,
        label: 'Enter Destination',
        hindiInstruction: 'कदम 1/3: आप जहाँ जाना चाहते हैं, वह जगह यहाँ लिखें।',
        expectedKeywords: ['where to', 'search', 'destination', 'kahan', 'खोजें', 'कहाँ']
      },
      {
        stepNumber: 2,
        label: 'Select Auto or Cab',
        hindiInstruction: 'कदम 2/3: ऑटो या गाड़ी का विकल्प यहाँ से चुनें।',
        expectedKeywords: ['auto', 'mini', 'cab', 'ride', 'ऑटो', 'राइड']
      },
      {
        stepNumber: 3,
        label: 'Confirm Booking',
        hindiInstruction: 'कदम 3/3: गाड़ी बुक करने के लिए यहाँ कन्फर्म (Confirm/Book) पर दबाएं।',
        expectedKeywords: ['confirm', 'book', 'bulao', 'बुक', 'कन्फर्म']
      }
    ]
  },

  // 4. Send Photo / Media on Chat Flow
  {
    id: 'send_photo_chat',
    name: 'Send Photo in Chat',
    triggerPatterns: [
      'photo bhejo', 'tasveer bhejo', 'gallery se photo bhejna', 'photo share karo',
      'फोटो भेजो', 'तस्वीर भेजो', 'गैलरी से फोटो'
    ],
    steps: [
      {
        stepNumber: 1,
        label: 'Open Attachment / Gallery',
        hindiInstruction: 'कदम 1/2: फोटो चुनने के लिए यहाँ अटैचमेंट या गैलरी पर दबाएं।',
        expectedKeywords: ['attach', 'gallery', 'camera', 'plus', 'गैलरी', 'कैमरा']
      },
      {
        stepNumber: 2,
        label: 'Send Photo Button',
        hindiInstruction: 'कदम 2/2: फोटो भेजने के लिए यहाँ सेंड (Send) बटन पर दबाएं।',
        expectedKeywords: ['send', 'share', 'bhejo', 'भेजें']
      }
    ]
  }
];

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
    const flowDef = MULTI_STEP_FLOWS.find((f) => f.id === existingSession.flowId);
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
  for (const flowDef of MULTI_STEP_FLOWS) {
    const isTriggered = flowDef.triggerPatterns.some((pattern) => qLower.includes(pattern));
    if (isTriggered) {
      const step1 = flowDef.steps[0];
      const matchIdx = findMatchingElement(uiElements, step1.expectedKeywords);
      if (matchIdx !== -1) {
        // Initialize flow in Redis
        await setFlowSession(elderId, {
          flowId: flowDef.id,
          currentStep: 2, // Next expected step
          totalSteps: flowDef.steps.length,
          goal: question,
          lastUpdated: Date.now()
        });

        return {
          isFlowActive: true,
          flowId: flowDef.id,
          currentStep: step1.stepNumber,
          totalSteps: flowDef.steps.length,
          stepLabel: step1.label,
          explanation: step1.hindiInstruction,
          highlightIndex: matchIdx
        };
      }
    }
  }

  return null;
}
