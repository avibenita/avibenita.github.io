import fs from 'fs';
import path from 'path';
import tls from 'node:tls';
import { highlightIssuesFromManifest } from './overlay/highlight.mjs';

function trustSystemCertificates() {
  if (typeof tls.getCACertificates !== 'function' || typeof tls.setDefaultCACertificates !== 'function') return;
  const system = tls.getCACertificates('system');
  if (!system?.length) return;
  tls.setDefaultCACertificates([...tls.getCACertificates('default'), ...system]);
}

trustSystemCertificates();

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
  const bytes = fs.readFileSync(wav);
  const text = await withRetry(limits, async () => {
    const form = new FormData();
    form.append('file', new Blob([bytes], { type: 'audio/wav' }), 'speech.wav');
    form.append('model', limits.transcriptionModel || 'whisper-1');
    form.append('response_format', 'verbose_json');
    form.append('timestamp_granularities[]', 'segment');
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${bearer(apiKey)}` },
      body: form,
      signal: AbortSignal.timeout(Math.max(limits.requestTimeoutMs || 120000, 180000))
    });
    const bodyText = await response.text();
    if (!response.ok) {
      const error = httpError('transcription', response.status, bodyText);
      throw error;
    }
    return bodyText;
  });
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
    'The final human viewing and CapCut approval remain required.',
    'Warm-gold highlight checks: the frame is #FFD18A, a thin 2px outline with stronger corner brackets, sitting about 8–12px outside the target so content stays visible, with a restrained glow and a gentle dim outside the frame.',
    'The frame fades in, pulses the glow once, then holds steady, and fades out. It must stay on the same target during camera movement and zoom.',
    'Do not ask for the analytical interface colors or behavior to change so they match the overlay. The overlay is a video layer.',
    'Exact 250ms, 1.2s, and 200ms timings are overlay constants. Sampled frames alone cannot prove them. Say so under unassessed checks unless the highlight log is present and disagrees.',
    'A documented module limitation in the numerical check is context. Do not request a fabricated number, a fake test result, or an edit to the statistical engine to hide it.'
  ].join(' ');
}

export function measuredHighlightIssues(evidence, moduleConfig) {
  return highlightIssuesFromManifest({
    highlight: evidence?.highlight,
    highlights: evidence?.highlight?.events
  }, moduleConfig || {});
}

function batchPrompt(evidence, standards, previousIssues, round, batch) {
  return [
    `Candidate round ${round}. MP4 hash ${evidence.sha256}. Duration ${evidence.probe?.duration}s. ${evidence.probe?.width}x${evidence.probe?.height} at ${evidence.probe?.fps} fps.`,
    `Scenes: ${JSON.stringify(evidence.scenes)}`,
    `Measured loudness: ${JSON.stringify({ integratedLufs: evidence.loudness?.integratedLufs, peakDbfs: evidence.loudness?.peakDbfs })}`,
    `Silence findings: ${JSON.stringify(evidence.silenceFindings)}`,
    `Technical issues: ${JSON.stringify(evidence.technicalIssues)}`,
    `Highlight log: ${JSON.stringify(evidence.highlight || null)}`,
    `Numerical check: ${JSON.stringify(evidence.numerical)}`,
    `Transcript: ${transcriptNote(evidence.transcript)}`,
    `Unsampled intervals: ${JSON.stringify(evidence.unsampled)}`,
    `Previous required issue ids: ${(previousIssues || []).map((issue) => issue.id).join(', ') || 'none'}`,
    `Frame files in this batch, in order: ${batch.map((file) => path.basename(file)).join(', ')}`,
    `Standards:\n${standards}`
  ].join('\n');
}

function transcriptNote(transcript) {
  if (!transcript?.segments?.length) return transcript?.status === 'failed' ? `not measured (${transcript.reason || 'transcription failed'})` : 'not measured';
  const lines = transcript.segments.map((segment) => `${segment.start}-${segment.end}s ${segment.text}`).join('\n');
  return `${transcript.status}. Segment times are measured from the rendered audio, not from the script.\n${lines}`.slice(0, 12000);
}

function bearer(apiKey) {
  let key = String(apiKey || '').trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) key = key.slice(1, -1).trim();
  if (!key) {
    const error = new Error('OPENAI_API_KEY is not set');
    error.code = 'AUTH';
    throw error;
  }
  return key;
}

function publicCause(error) {
  const cause = error?.cause;
  const codes = [];
  if (cause?.code) codes.push(String(cause.code));
  if (Array.isArray(cause?.errors)) {
    for (const item of cause.errors) if (item?.code) codes.push(String(item.code));
  }
  const detail = cause?.message ? redact(cause.message).slice(0, 180) : '';
  return [redact(error?.message || 'request failed'), codes.join(', '), detail].filter(Boolean).join(' | ');
}

function httpError(kind, status, bodyText) {
  const redacted = redact(bodyText);
  const quota = status === 429 && /insufficient_quota|credit_balance_exhausted|no credits remaining/i.test(redacted);
  const error = new Error(quota
    ? 'OpenAI credits are exhausted, so this review cannot run. Add credits, then resume the same run. Recording was not repeated.'
    : `${kind} request failed (${status}): ${redacted.slice(0, 500)}`);
  error.status = status;
  if (status === 401 || status === 403 || status === 402) error.code = 'AUTH';
  if (quota) error.code = 'QUOTA';
  return error;
}

function retryable(error) {
  if (error?.code === 'AUTH' || error?.code === 'QUOTA') return false;
  const status = error?.status;
  if (status === 400 || status === 401 || status === 402 || status === 403) return false;
  if (status === 408 || status === 409 || status === 429 || status >= 500) return true;
  return !status && /fetch failed|network|timeout|aborted|ECONNRESET|ETIMEDOUT|UND_ERR|EAI_AGAIN/i.test(publicCause(error));
}

async function withRetry(limits, fn) {
  const attempts = 1 + (Number(limits.transientRetries) || 0);
  let last;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      last = error;
      if (!retryable(error) || attempt === attempts - 1) break;
      await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
    }
  }
  if (last && !last.status) {
    const wrapped = new Error(publicCause(last));
    wrapped.code = last.code;
    throw wrapped;
  }
  throw last;
}

async function completeReview(apiKey, limits, messages) {
  const text = await withRetry(limits, async () => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${bearer(apiKey)}`,
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
    const bodyText = await response.text();
    if (!response.ok) throw httpError('review', response.status, bodyText);
    return bodyText;
  });
  const body = JSON.parse(text);
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new Error('empty review response');
  return { review: JSON.parse(content), raw: content, usage: body.usage || null };
}

function redact(text) {
  return String(text).replace(/sk-[A-Za-z0-9_-]+/g, '[redacted]').replace(/Bearer\s+\S+/gi, 'Bearer [redacted]');
}
