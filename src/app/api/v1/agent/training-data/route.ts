import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || searchParams.get('mode') || 'sft'; // 'sft' or 'dpo'
    const status = searchParams.get('status') || 'verified';
    const includeCorrections = searchParams.get('include_corrections') === 'true' || status === 'flywheel';
    const limit = Math.min(parseInt(searchParams.get('limit') || '500', 10), 2000);
    const format = searchParams.get('format') || 'json';

    // === MODE 1: DPO (Direct Preference Optimization) Pipeline ===
    if (type === 'dpo') {
      const dpoRows = await query<{
        id: string;
        app_package: string;
        question: string;
        ui_elements: string[];
        suggested_index: number | null;
        actual_tapped_index: number | null;
        explanation: string;
        feedback_status: string;
        created_at: string;
      }>(
        `SELECT id, app_package, question, ui_elements, suggested_index, actual_tapped_index, explanation, feedback_status, created_at
         FROM model_interactions
         WHERE feedback_status = 'rejected' 
           AND actual_tapped_index IS NOT NULL 
           AND suggested_index IS NOT NULL 
           AND actual_tapped_index != suggested_index
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit]
      );

      const dpoDataset = dpoRows.map((row) => {
        const formattedElements = Array.isArray(row.ui_elements)
          ? row.ui_elements.map((el, idx) => `[${idx}] ${el}`).join('\n')
          : '';

        const systemPrompt = `You are SaralGati, a patient, warm companion for Indian elders.
The user is looking at an Android app: ${row.app_package}.
Here are the numbered interactive elements on their screen:
${formattedElements}

Instructions:
1. Answer the user's question in 1 or 2 simple, comforting Hinglish (Hindi written in English script) sentences.
2. Elements on screen are prefixed with their role ([BUTTON], [INPUT], [TOGGLE], [TEXT]).
3. When guiding the user to tap, open, or take action, ALWAYS target an interactive element ([BUTTON], [INPUT], or [TOGGLE]). Never target static [TEXT] or preview count noise.
4. If your answer directs the user to tap or look at a specific element on screen, append " TARGET:[index]" at the very end.`;

        return {
          prompt: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: row.question },
          ],
          chosen: [
            { role: 'assistant', content: `${row.explanation} TARGET:${row.actual_tapped_index}` },
          ],
          rejected: [
            { role: 'assistant', content: `${row.explanation} TARGET:${row.suggested_index}` },
          ],
          metadata: {
            interaction_id: row.id,
            app_package: row.app_package,
            chosen_index: row.actual_tapped_index,
            rejected_index: row.suggested_index,
            type: 'user_correction_preference',
            created_at: row.created_at,
          },
        };
      });

      if (format === 'jsonl') {
        const jsonl = dpoDataset.map((d) => JSON.stringify(d)).join('\n');
        return new Response(jsonl, {
          headers: {
            'Content-Type': 'application/x-ndjson',
            'Content-Disposition': 'attachment; filename="saralgati_dpo_dataset.jsonl"',
          },
        });
      }

      return NextResponse.json({
        success: true,
        mode: 'dpo',
        count: dpoDataset.length,
        data: dpoDataset,
      });
    }

    // === MODE 2: SFT / Supervised Instruction Tuning Pipeline ===
    let sqlQuery = `SELECT id, app_package, question, ui_elements, suggested_index, actual_tapped_index, explanation, feedback_status, created_at
       FROM model_interactions
       WHERE feedback_status = $1
       ORDER BY created_at DESC
       LIMIT $2`;
    let queryParams: (string | number)[] = [status, limit];

    if (includeCorrections) {
      sqlQuery = `SELECT id, app_package, question, ui_elements, suggested_index, actual_tapped_index, explanation, feedback_status, created_at
       FROM model_interactions
       WHERE feedback_status = 'verified' 
          OR (feedback_status = 'rejected' AND actual_tapped_index IS NOT NULL)
       ORDER BY created_at DESC
       LIMIT $1`;
      queryParams = [limit];
    }

    const rows = await query<{
      id: string;
      app_package: string;
      question: string;
      ui_elements: string[];
      suggested_index: number | null;
      actual_tapped_index: number | null;
      explanation: string;
      feedback_status: string;
      created_at: string;
    }>(sqlQuery, queryParams);

    // Convert into instruction-tuning format suitable for Unsloth / LoRA training
    const dataset = rows.map((row) => {
      const targetIndex = row.feedback_status === 'verified'
        ? row.suggested_index
        : (row.actual_tapped_index ?? row.suggested_index);

      const formattedElements = Array.isArray(row.ui_elements)
        ? row.ui_elements.map((el, idx) => `[${idx}] ${el}`).join('\n')
        : '';

      const systemPrompt = `You are SaralGati, a patient, warm companion for Indian elders.
The user is looking at an Android app: ${row.app_package}.
Here are the numbered interactive elements on their screen:
${formattedElements}

Instructions:
1. Answer the user's question in 1 or 2 simple, comforting Hinglish (Hindi written in English script) sentences.
2. Elements on screen are prefixed with their role ([BUTTON], [INPUT], [TOGGLE], [TEXT]).
3. When guiding the user to tap, open, or take action, ALWAYS target an interactive element ([BUTTON], [INPUT], or [TOGGLE]). Never target static [TEXT] or preview count noise.
4. If your answer directs the user to tap or look at a specific element on screen, append " TARGET:[index]" at the very end.`;

      const assistantContent = targetIndex !== null
        ? `${row.explanation} TARGET:${targetIndex}`
        : row.explanation;

      return {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: row.question },
          { role: 'assistant', content: assistantContent },
        ],
        metadata: {
          interaction_id: row.id,
          app_package: row.app_package,
          target_index: targetIndex,
          feedback_status: row.feedback_status,
          created_at: row.created_at,
        },
      };
    });

    if (format === 'jsonl') {
      const jsonl = dataset.map((d) => JSON.stringify(d)).join('\n');
      return new Response(jsonl, {
        headers: {
          'Content-Type': 'application/x-ndjson',
          'Content-Disposition': 'attachment; filename="saralgati_training_dataset.jsonl"',
        },
      });
    }

    return NextResponse.json({
      success: true,
      mode: 'sft',
      count: dataset.length,
      data: dataset,
    });
  } catch (error) {
    console.error('Training Data Export Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to export training data' }, { status: 500 });
  }
}
