export interface StealthConfig {
	claimMinDelayMs: number;
	claimMaxDelayMs: number;
	preClaimIdleMinMs: number;
	preClaimIdleMaxMs: number;
	postClaimGapMinMs: number;
	postClaimGapMaxMs: number;
	settleMinMs: number;
	settleMaxMs: number;
	maxClaimRetries: number;
	backoffBaseMs: number;
	backoffMaxMs: number;
	rateLimitCooldownMs: number;
}

export const DEFAULT_STEALTH: StealthConfig = {
	claimMinDelayMs: 15_000,
	claimMaxDelayMs: 45_000,
	preClaimIdleMinMs: 8_000,
	preClaimIdleMaxMs: 25_000,
	postClaimGapMinMs: 30_000,
	postClaimGapMaxMs: 90_000,
	settleMinMs: 15_000,
	settleMaxMs: 45_000,
	maxClaimRetries: 4,
	backoffBaseMs: 30_000,
	backoffMaxMs: 300_000,
	rateLimitCooldownMs: 300_000,
};

export function loadStealthConfig(): StealthConfig {
	const num = (key: string, fallback: number) => {
		const raw = process.env[key];
		if (!raw) return fallback;
		const parsed = Number(raw);
		return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
	};
	return {
		claimMinDelayMs: num('CLAIM_MIN_DELAY_MS', DEFAULT_STEALTH.claimMinDelayMs),
		claimMaxDelayMs: num('CLAIM_MAX_DELAY_MS', DEFAULT_STEALTH.claimMaxDelayMs),
		preClaimIdleMinMs: num('PRE_CLAIM_IDLE_MIN_MS', DEFAULT_STEALTH.preClaimIdleMinMs),
		preClaimIdleMaxMs: num('PRE_CLAIM_IDLE_MAX_MS', DEFAULT_STEALTH.preClaimIdleMaxMs),
		postClaimGapMinMs: num('POST_CLAIM_GAP_MIN_MS', DEFAULT_STEALTH.postClaimGapMinMs),
		postClaimGapMaxMs: num('POST_CLAIM_GAP_MAX_MS', DEFAULT_STEALTH.postClaimGapMaxMs),
		settleMinMs: num('SETTLE_MIN_MS', DEFAULT_STEALTH.settleMinMs),
		settleMaxMs: num('SETTLE_MAX_MS', DEFAULT_STEALTH.settleMaxMs),
		maxClaimRetries: num('MAX_CLAIM_RETRIES', DEFAULT_STEALTH.maxClaimRetries),
		backoffBaseMs: num('BACKOFF_BASE_MS', DEFAULT_STEALTH.backoffBaseMs),
		backoffMaxMs: num('BACKOFF_MAX_MS', DEFAULT_STEALTH.backoffMaxMs),
		rateLimitCooldownMs: num('RATE_LIMIT_COOLDOWN_MS', DEFAULT_STEALTH.rateLimitCooldownMs),
	};
}

export const rand = (min: number, max: number) =>
	Math.floor(Math.random() * (max - min + 1)) + min;

export const randMs = (min: number, max: number) => rand(min, max);

export function jittered(baseMs: number, ratio = 0.3): number {
	const jitter = baseMs * ratio * (Math.random() * 2 - 1);
	return Math.max(0, Math.round(baseMs + jitter));
}

export const sleep = (ms: number) =>
	new Promise<void>((resolve) => setTimeout(resolve, ms));

export const humanDelay = (baseMs: number, ratio = 0.3) =>
	sleep(jittered(baseMs, ratio));

export function backoffDelay(attempt: number, baseMs: number, maxMs: number): number {
	const exp = Math.min(maxMs, baseMs * 2 ** attempt);
	return Math.round(exp + Math.random() * 10_000);
}

export function shuffle<T>(items: T[]): T[] {
	const arr = [...items];
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
	return arr;
}
