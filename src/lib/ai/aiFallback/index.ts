import type { AIResponse, GenerateOptions } from './types';
import { scoreCandidate, consensusAdjustment } from './scoring';
import { sampleEngine } from './selfConsistency';
import { fetchCloudflareLoRA, fetchGeminiAIStudio } from './engines';

export type { GenerateOptions, AnswerGrounding, AIResponse } from './types';

/**
 * SaralGati AI Dual-Engine with Confidence-Based Arbitration
 *
 * Runs both engines concurrently:
 * - Engine A: Custom fine-tuned LoRA on Cloudflare Workers AI (saralgati-elder-lora)
 * - Engine B: Google Gemini AI Studio (Multi-Key array rotation across Eco-Ordered Models)
 *
 * Whichever model outputs the higher *grounded* confidence score (0 to 100) is
 * delivered to the elder. On tie, prefers custom fine-tuned LoRA.
 *
 * "Grounded" is the accuracy fix this module now enforces: both answers are run
 * through the same semantic validator the route applies afterwards before they
 * are compared, so a confident answer that points at the wrong element - or at
 * an element that is not on the screen - loses on merit instead of winning and
 * being repaired (or dropped) after the other engine was already discarded.
 *
 * The folder splits along the module's real seams: the HTTP clients in
 * `engines.ts`, the shared types in `types.ts`, the grounded scoring in
 * `scoring.ts` and the self-consistency sampler in `selfConsistency.ts`.
 * This file keeps the arbitration flow itself and re-exports the public types.
 */
export async function generateAIResponse(options: GenerateOptions): Promise<AIResponse> {
  const hasLoRA = Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_LORA_NAME);
  const hasGemini = Boolean(process.env.GEMINI_API_KEY?.trim());

  if (!hasLoRA && !hasGemini) {
    throw new Error('Neither Cloudflare LoRA nor GEMINI_API_KEY is configured.');
  }

  // 1. Run both models concurrently in parallel when both are configured
  if (hasLoRA && hasGemini) {
    const [loraOutcome, geminiOutcome] = await Promise.allSettled([
      sampleEngine(fetchCloudflareLoRA, options, 'student'),
      sampleEngine(fetchGeminiAIStudio, options, 'teacher')
    ]);

    const loraResult = loraOutcome.status === 'fulfilled' ? loraOutcome.value : null;
    const geminiResult = geminiOutcome.status === 'fulfilled' ? geminiOutcome.value : null;

    // Both models successfully generated responses: Arbitrate on grounded quality!
    if (loraResult && geminiResult) {
      const lora = scoreCandidate(loraResult, options);
      const gemini = scoreCandidate(geminiResult, options);
      const adjustment = consensusAdjustment(lora.grounded.targetIndex, gemini.grounded.targetIndex);
      const loraScore = Math.max(0, Math.min(100, lora.score + adjustment));
      const geminiScore = Math.max(0, Math.min(100, gemini.score + adjustment));
      const agreed =
        lora.grounded.targetIndex !== null &&
        lora.grounded.targetIndex === gemini.grounded.targetIndex;

      console.log(
        `[AI Arbitration] LoRA ${loraScore}% (target ${lora.grounded.targetIndex ?? 'none'}) vs ` +
          `Gemini ${geminiScore}% (target ${gemini.grounded.targetIndex ?? 'none'})` +
          `${adjustment ? ` [${adjustment > 0 ? 'consensus' : 'disagreement'} ${adjustment > 0 ? '+' : ''}${adjustment}]` : ''}`
      );

      const loraWins = loraScore >= geminiScore;
      const winner = loraWins ? lora : gemini;

      return {
        ...winner.result,
        confidence: loraWins ? loraScore : geminiScore,
        targetIndex: winner.grounded.targetIndex,
        grounding: {
          status: winner.grounded.validation.status,
          score: winner.grounded.score,
          reasons: winner.grounded.reasons,
          agreed,
          loraTargetIndex: lora.grounded.targetIndex,
          geminiTargetIndex: gemini.grounded.targetIndex,
          contradictsTarget: winner.grounded.contradictsTarget
        },
        competingResults: {
          loraConfidence: loraScore,
          geminiConfidence: geminiScore,
          winner: loraWins ? 'lora' : 'gemini',
          targetAgreement: agreed,
          loraTargetIndex: lora.grounded.targetIndex,
          geminiTargetIndex: gemini.grounded.targetIndex
        }
      };
    }

    // Only one model succeeded
    if (loraResult) {
      const lora = scoreCandidate(loraResult, options);
      return {
        ...lora.result,
        confidence: lora.score,
        targetIndex: lora.grounded.targetIndex,
        grounding: {
          status: lora.grounded.validation.status,
          score: lora.grounded.score,
          reasons: lora.grounded.reasons,
          agreed: false,
          loraTargetIndex: lora.grounded.targetIndex,
          geminiTargetIndex: null,
          contradictsTarget: lora.grounded.contradictsTarget
        }
      };
    }

    if (geminiResult) {
      const gemini = scoreCandidate(geminiResult, options);
      return {
        ...gemini.result,
        confidence: gemini.score,
        targetIndex: gemini.grounded.targetIndex,
        grounding: {
          status: gemini.grounded.validation.status,
          score: gemini.grounded.score,
          reasons: gemini.grounded.reasons,
          agreed: false,
          loraTargetIndex: null,
          geminiTargetIndex: gemini.grounded.targetIndex,
          contradictsTarget: gemini.grounded.contradictsTarget
        }
      };
    }

    throw new Error('Both Cloudflare LoRA and Gemini AI Studio failed to generate a response.');
  }

  // 2. Only LoRA is configured
  if (hasLoRA) {
    const loraResult = await sampleEngine(fetchCloudflareLoRA, options, 'student');
    if (loraResult) {
      const lora = scoreCandidate(loraResult, options);
      return {
        ...lora.result,
        confidence: lora.score,
        targetIndex: lora.grounded.targetIndex,
        grounding: {
          status: lora.grounded.validation.status,
          score: lora.grounded.score,
          reasons: lora.grounded.reasons,
          agreed: false,
          loraTargetIndex: lora.grounded.targetIndex,
          geminiTargetIndex: null,
          contradictsTarget: lora.grounded.contradictsTarget
        }
      };
    }
    throw new Error('Cloudflare LoRA failed and no Gemini API key configured.');
  }

  // 3. Only Gemini is configured
  const geminiResult = await sampleEngine(fetchGeminiAIStudio, options, 'teacher');
  if (geminiResult) {
    const gemini = scoreCandidate(geminiResult, options);
    return {
      ...gemini.result,
      confidence: gemini.score,
      targetIndex: gemini.grounded.targetIndex,
      grounding: {
        status: gemini.grounded.validation.status,
        score: gemini.grounded.score,
        reasons: gemini.grounded.reasons,
        agreed: false,
        loraTargetIndex: null,
        geminiTargetIndex: gemini.grounded.targetIndex,
        contradictsTarget: gemini.grounded.contradictsTarget
      }
    };
  }
  throw new Error('Gemini AI Studio failed to generate a response.');
}
