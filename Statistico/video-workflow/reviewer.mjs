import fs from 'fs';
import path from 'path';

export const REVIEW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['verdict', 'summary', 'issues', 'resolved_issue_ids', 'unassessed_checks'],
  properties: {
    verdict: { type: 'string', enum: ['ready_for_human_review', 'needs_revision', 'blocked'] },
    summary: { type: 'string' },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'severity', 'category', 'scene', 'start_seconds', 'end_seconds', 'evidence', 'observed', 'requested_change', 'acceptance_check', 'permitted_edit', 'confidence'],
        properties: {
          id: { type: 'string' },
          severity: { type: 'string', enum: ['required', 'advisory'] },
          category: { type: 'string' },
          scene: { type: 'string' },
          start_seconds: { type: 'number' },
          end_seconds: { type: 'number' },
          evidence: { type: 'array', items: { type: 'string' } },
          observed: { type: 'string' },
          requested_change: { type: 'string' },
          acceptance_check: { type: 'string' },
          permitted_edit: { type: 'string', enum: ['timing', 'camera', 'caption', 'narration', 'layout', 'render', 'none'] },
          confidence: { type: 'number' }
        }
      }
    },
    resolved_issue_ids: { type: 'array', items: { type: 'string' } },
    unassessed_checks: { type: 'array', items: { type: 'string' } }
  }
};

export function validateReview(review, evidence) {
  if (!review || typeof review !== 'object') throw new Error('empty review response');
  if (!['ready_for_human_review', 'needs_revision', 'blocked'].includes(review.verdict)) {
    throw new Error('malformed review verdict');
  }
  if (!Array.isArray(review.issues) || !Array.isArray(review.resolved_issue_ids) || !Array.isArray(review.unassessed_checks)) {
    throw new Error('malformed review schema');
  }
  const duration = evidence?.probe?.duration ?? evidence?.duration ?? 0;
  const frameNames = new Set((evidence?.frames || []).map((frame) => frame.file));
  for (const issue of review.issues) {
    if (!issue.id || !issue.severity) throw new Error('malformed review issue');
    if (issue.start_seconds < -0.05 || issue.end_seconds > duration + 0.25) {
      throw new Error(`review timestamp ${issue.start_seconds}-${issue.end_seconds} is outside the ${duration.toFixed(2)}s candidate`);
    }
    for (const name of issue.evidence || []) {
      if (frameNames.size && /\.(jpg|png)$/i.test(name) && !frameNames.has(path.basename(name))) {
        throw new Error(`review cites missing evidence ${name}`);
      }
    }
  }
  return review;
}

export function requiredIssues(review) {
  return (review?.issues || []).filter((issue) => issue.severity === 'required');
}

function imagePart(file, detail) {
  const bytes = fs.readFileSync(file);
  const ext = path.extname(file).toLowerCase() === '.png' ? 'png' : 'jpeg';
  return {
    type: 'image_url',
    image_url: { url: `data:image/${ext};base64,${bytes.toString('base64')}`, detail }
  };
}

export function estimateReviewUsd(limits, imageCount, audioSeconds) {
  const rate = limits.rates?.[limits.reviewModel] || { inputPerMillion: 0, outputPerMillion: 0 };
  const inputTokens = 4000 + imageCount * (limits.tokensPerImage || 800);
  const outputTokens = 2500 + Math.ceil(imageCount / (limits.imageBatchSize || 12)) * 800;
  const review = (inputTokens / 1e6) * (rate.inputPerMillion || 0) + (outputTokens / 1e6) * (rate.outputPerMillion || 0);
  const whisper = limits.rates?.[limits.transcriptionModel]?.perMinute || 0;
  const audio = (audioSeconds / 60) * whisper;
  return {
    inputTokens,
    outputTokens,
    estimatedUsd: Number((review + audio).toFixed(4)),
    label: 'local estimate from configurable rates, not an invoice or a hard cap',
    reviewModel: limits.reviewModel,
    transcriptionModel: limits.transcriptionModel
  };
}

export async function transcribeMp4({ ffmpeg, ffmpegText, mp4, runDir, limits, apiKey }) {
  const wav = path.join(runDir, 'speech-for-transcript.wav');
  ffmpegText(ffmpeg, ['-y', '-i', mp4, '-vn', '-ac', '1', '-ar', '16000', wav]);
  const form = new FormData();
  const bytes = fs.readFileSync(wav);
  form.append('file', new Blob([bytes], { type: 'audio/wav' }), 'speech.wav');
  form.append('model', limits.transcriptionModel || 'whisper-1');
  form.append('response_format', 'verbose_json');
  form.append('timestamp_granularities[]', 'segment');
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
    signal: AbortSignal.timeout(limits.requestTimeoutMs || 120000)
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`transcription failed (${response.status}): ${redact(text)}`);
  const body = JSON.parse(text);
  return {
    status: 'measured',
    model: limits.transcriptionModel,
    text: body.text || '',
    segments: (body.segments || []).map((segment) => ({
      start: segment.start,
      end: segment.end,
      text: segment.text
    })),
    note: body.segments
      ? 'Segment times come from the transcription response. They are not the authored cue times.'
      : 'The transcription response had no segment times. Do not treat the script timings as measured word timings.'
  };
}

export async function reviewWithOpenAI({ evidence, standards, previousIssues, limits, apiKey, round }) {
  const frames = (evidence.frames || []).map((frame) => path.join(evidence.frameDir, frame.file)).filter((file) => fs.existsSync(file));
  const estimate = estimateReviewUsd(limits, frames.length, evidence.probe?.duration || 0);
  if (!(limits.maxEstimatedUsd >= 0) || !Number.isFinite(limits.maxEstimatedUsd)) {
    throw new Error('Set a finite maxEstimatedUsd before a paid review.');
  }
  if (estimate.estimatedUsd > limits.maxEstimatedUsd) {
    throw new Error(`Estimated review cost $${estimate.estimatedUsd} exceeds the configured ceiling $${limits.maxEstimatedUsd}. This is an estimate, not a charge. Raise maxEstimatedUsd only if you accept that estimate.`);
  }
  const batches = [];
  const size = limits.imageBatchSize || 12;
  for (let i = 0; i < frames.length; i += size) batches.push(frames.slice(i, i + size));
  const partials = [];
  for (const batch of batches) {
    partials.push(await completeReview(apiKey, limits, [
      { role: 'system', content: reviewerSystem() },
      {
        role: 'user',
        content: [
          { type: 'text', text: batchPrompt(evidence, standards, previousIssues, round, batch) },
          ...batch.map((file) => imagePart(file, 'low'))
        ]
      }
    ]));
  }
  const crops = (evidence.crops || []).map((crop) => path.join(evidence.frameDir, crop.file)).filter((file) => fs.existsSync(file));
  const consolidated = await completeReview(apiKey, limits, [
    { role: 'system', content: reviewerSystem() },
    {
      role: 'user',
      content: [
        { type: 'text', text: `Consolidate these batch notes into one final review. Keep uncertainty. Do not invent observations that no batch recorded.\n${JSON.stringify(partials).slice(0, 120000)}` },
        ...crops.map((file) => imagePart(file, 'high'))
      ]
    }
  ]);
  return { review: validateReview(consolidated.review, evidence), raw: consolidated.raw, usage: consolidated.usage, estimate };
}

function reviewerSystem() {
  return [
    'You review a rendered Statistico module video from the supplied frames, measurements, and standards.',
    'Report uncertainty. Never invent a missing observation.',
    'Distinguish measured technical checks from visual judgments.',
    'A transcript does not prove voice naturalness, pronunciation, absence of music or noise, or pleasant transitions.',
    'Sampling is not a complete motion review. Advisory style preferences are informational.',
    'Do not request a change to statistical engines, fixture data, reference tests, or acceptance thresholds.',
    'The final human viewing and CapCut approval remain required.'
  ].join(' ');
}

function batchPrompt(evidence, standards, previousIssues, round, batch) {
  return [
    `Candidate round ${round}. MP4 hash ${evidence.sha256}. Duration ${evidence.probe?.duration}s. ${evidence.probe?.width}x${evidence.probe?.height} at ${evidence.probe?.fps} fps.`,
    `Scenes: ${JSON.stringify(evidence.scenes)}`,
    `Measured loudness: ${JSON.stringify(evidence.loudness)}`,
    `Silence findings: ${JSON.stringify(evidence.silenceFindings)}`,
    `Technical issues: ${JSON.stringify(evidence.technicalIssues)}`,
    `Numerical check: ${JSON.stringify(evidence.numerical)}`,
    `Unsampled intervals: ${JSON.stringify(evidence.unsampled)}`,
    `Previous required issue ids: ${(previousIssues || []).map((issue) => issue.id).join(', ') || 'none'}`,
    `Frame files in this batch, in order: ${batch.map((file) => path.basename(file)).join(', ')}`,
    `Standards:\n${standards}`
  ].join('\n');
}

async function completeReview(apiKey, limits, messages) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: limits.reviewModel,
      messages,
      response_format: { type: 'json_schema', json_schema: { name: 'video_review', strict: true, schema: REVIEW_SCHEMA } },
      max_completion_tokens: 4000
    }),
    signal: AbortSignal.timeout(limits.requestTimeoutMs || 120000)
  });
  const text = await response.text();
  if (!response.ok) {
    const error = new Error(`review request failed (${response.status}): ${redact(text).slice(0, 800)}`);
    error.status = response.status;
    if (response.status === 401 || response.status === 403 || response.status === 402) error.code = 'AUTH';
    throw error;
  }
  const body = JSON.parse(text);
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new Error('empty review response');
  return { review: JSON.parse(content), raw: content, usage: body.usage || null };
}

function redact(text) {
  return String(text).replace(/sk-[A-Za-z0-9_-]+/g, '[redacted]');
}
