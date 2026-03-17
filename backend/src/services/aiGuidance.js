function summarizeComplianceGaps(documents) {
  const missingDocs = documents.filter((doc) => !doc.verification || doc.verification.status !== 'verified');
  const expiringDocs = documents.filter((doc) => {
    const expiration = doc.metadata?.expirationDate;
    if (!expiration) return false;
    const days = Math.ceil((new Date(expiration).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 30;
  });

  const crossBorderDocs = documents.filter((doc) => {
    const jurisdiction = (doc.metadata?.jurisdiction || '').toLowerCase();
    return jurisdiction.includes('eu') || jurisdiction.includes('uk') || jurisdiction.includes('apac');
  });

  return { missingDocs, expiringDocs, crossBorderDocs };
}

function localRuleEngine({ prompt, documents }) {
  const { missingDocs, expiringDocs, crossBorderDocs } = summarizeComplianceGaps(documents);

  const steps = [
    'Step 1: Review missing verification records and collect missing supporting documents.',
    'Step 2: Prioritize expiring documents and schedule renewals before due dates.',
    'Step 3: Validate cross-border obligations (data residency, regional retention, language requirements).',
    'Step 4: Re-run verification and document all actions in the audit trail.'
  ];

  return {
    provider: 'local-rule-engine',
    guidance: [
      `Prompt received: ${prompt || 'general compliance guidance'}.`,
      `Missing or unverified documents: ${missingDocs.length}.`,
      `Documents expiring within 30 days: ${expiringDocs.length}.`,
      `Potential cross-border compliance documents: ${crossBorderDocs.length}.`,
      ...steps
    ].join('\n')
  };
}

async function openAiGuidance({ prompt, documents }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const messages = [
    {
      role: 'system',
      content:
        'You are a compliance assistant for 96ply. Provide concise, step-by-step guidance for missing documents, expirations, and cross-border compliance.'
    },
    {
      role: 'user',
      content: JSON.stringify({ prompt, documents }, null, 2)
    }
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}`);
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content || 'No guidance returned.';

  return {
    provider: 'openai',
    guidance: content
  };
}

export async function generateAiGuidance({ prompt, documents }) {
  // Prefer OpenAI when configured; otherwise use deterministic local rule engine.
  const openAiResult = await openAiGuidance({ prompt, documents });
  if (openAiResult) {
    return openAiResult;
  }

  return localRuleEngine({ prompt, documents });
}
