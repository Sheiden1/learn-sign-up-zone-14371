import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const pdfFile = formData.get('pdf');
    const subject = formData.get('subject') as string;
    const numQuestions = parseInt(formData.get('numQuestions') as string || '5');

    if (!pdfFile || !(pdfFile instanceof File)) {
      return new Response(
        JSON.stringify({ error: 'PDF file is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Read PDF content
    const pdfBuffer = await pdfFile.arrayBuffer();
    const pdfText = new TextDecoder().decode(pdfBuffer);

    // Call Lovable AI to generate questions
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Você é um assistente especializado em criar questões de múltipla escolha para estudantes. 
Gere ${numQuestions} questões sobre ${subject} baseadas no conteúdo fornecido.
Cada questão deve ter 4 alternativas (A, B, C, D) e apenas uma correta.
Retorne APENAS um JSON válido no formato:
{
  "questions": [
    {
      "question": "texto da questão",
      "alternatives": [
        {"text": "alternativa A", "correct": false},
        {"text": "alternativa B", "correct": true},
        {"text": "alternativa C", "correct": false},
        {"text": "alternativa D", "correct": false}
      ]
    }
  ]
}`
          },
          {
            role: 'user',
            content: `Conteúdo do PDF:\n\n${pdfText.substring(0, 10000)}`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente mais tarde.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. Por favor, adicione créditos ao seu workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.error('AI Gateway error:', aiResponse.status, await aiResponse.text());
      throw new Error('Erro ao processar PDF com IA');
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Resposta inválida da IA');
    }

    // Parse JSON from AI response
    let questions;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        questions = JSON.parse(content);
      }
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Erro ao processar resposta da IA');
    }

    return new Response(
      JSON.stringify(questions),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-questions-from-pdf:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});