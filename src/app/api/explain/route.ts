import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { question, selectedAnswer, correctAnswer, explanation } = await request.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `Eres un experto en AWS y preparacion para el examen AWS Certified AI Practitioner (AIF-C01).

Un estudiante respondio esta pregunta incorrectamente y necesita una explicacion mas profunda.

Pregunta: ${question}
Respuesta del estudiante: ${selectedAnswer}
Respuesta correcta: ${correctAnswer}
Explicacion basica: ${explanation}

Proporciona una explicacion mas detallada y didactica en espanol. Incluye:
1. Por que la respuesta correcta es la mejor opcion
2. Un ejemplo practico o caso de uso real
3. Como recordar este concepto para el examen
4. Conceptos relacionados que el estudiante deberia revisar

Se conciso pero completo. Responde en espanol.`
        }],
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'API request failed' }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json({ explanation: data.content[0].text });
  } catch {
    return NextResponse.json({ error: 'Failed to get explanation' }, { status: 500 });
  }
}
