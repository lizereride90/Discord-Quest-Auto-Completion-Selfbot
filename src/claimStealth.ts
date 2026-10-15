import type { ClientQuest } from './client';
import type { Quest } from './quest';
import {
	loadStealthConfig,
	randMs,
	humanDelay,
	backoffDelay,
	shuffle,
	sleep,
	type StealthConfig,
} from './stealth';

export interface ClaimResult {
	questId: string;
	questName: string;
	claimed: boolean;
	skipped: string | null;
	attempts: number;
}

function questLabel(quest: Quest): string {
	try {
		return quest.config.messages.quest_name;
	} catch {
		return quest.id;
	}
}

async function refreshQuest(client: ClientQuest, questId: string): Promise<Quest | undefined> {
	try {
		await client.fetchQuests(false);
		return client.questManager!.get(questId);
	} catch {
		return client.questManager!.get(questId);
	}
}

function isRateLimit(err: any): boolean {
	if (!err) return false;
	if (err?.status === 429 || err?.code === 429) return true;
	const msg = String(err?.message ?? '').toLowerCase();
	return msg.includes('rate limit') || msg.includes('429') || msg.includes('retry after');
}

function rateLimitWaitMs(err: any, fallbackMs: number): number {
	const retryAfter =
		err?.retryAfter ?? err?.retry_after ?? err?.rawError?.retry_after;
	if (typeof retryAfter === 'number' && Number.isFinite(retryAfter)) {
		return Math.round(retryAfter * 1000 + Math.random() * 5000);
	}
	return fallbackMs;
}

async function claimOneWithRetry(
	client: ClientQuest,
	quest: Quest,
	cfg: StealthConfig,
): Promise<ClaimResult> {
	const questName = questLabel(quest);
	let attempts = 0;
	const max = Math.max(1, Math.min(6, Math.round(cfg.maxClaimRetries)));

	while (attempts < max) {
		attempts++;
		try {
			await client.questManager!.redeemQuest(quest);
			const fresh = await refreshQuest(client, quest.id);
			if (fresh?.hasClaimedRewards()) {
				return { questId: quest.id, questName, claimed: true, skipped: null, attempts };
			}
			return { questId: quest.id, questName, claimed: true, skipped: null, attempts };
		} catch (err: any) {
			if (isRateLimit(err)) {
				const wait = Math.min(
					cfg.backoffMaxMs,
					rateLimitWaitMs(err, backoffDelay(attempts - 1, cfg.backoffBaseMs, cfg.backoffMaxMs)),
				);
				console.warn(
					`[Claim] Rate limited on "${questName}" (attempt ${attempts}/${max}). Cooling down ${(wait / 1000).toFixed(0)}s.`,
				);
				await sleep(wait + Math.random() * 5000);
				continue;
			}
			console.error(`[Claim] Failed "${questName}" (attempt ${attempts}/${max}):`, err?.message ?? err);
			if (attempts < max) {
				await humanDelay(backoffDelay(attempts - 1, 10_000, 120_000));
			}
		}
	}
	return { questId: quest.id, questName, claimed: false, skipped: 'retries-exhausted', attempts };
}

export async function stealthClaimAll(client: ClientQuest): Promise<ClaimResult[]> {
	const cfg = loadStealthConfig();
	const results: ClaimResult[] = [];

	await client.fetchQuests(false);
	let redeemable = client.questManager!.filterQuestsValidToRedeem();
	console.log(`[Claim] Found ${redeemable.length} quest(s) eligible to claim.`);

	if (redeemable.length === 0) return results;

	redeemable = shuffle(redeemable);

	for (let i = 0; i < redeemable.length; i++) {
		const quest = redeemable[i];
		const questName = questLabel(quest);

		const fresh = await refreshQuest(client, quest.id);
		const target = fresh ?? quest;

		if (target.isExpired()) {
			console.log(`[Claim] Skipping "${questName}" — expired.`);
			results.push({ questId: quest.id, questName, claimed: false, skipped: 'expired', attempts: 0 });
			continue;
		}
		if (!target.isCompleted()) {
			console.log(`[Claim] Skipping "${questName}" — not completed.`);
			results.push({ questId: quest.id, questName, claimed: false, skipped: 'not-completed', attempts: 0 });
			continue;
		}
		if (target.hasClaimedRewards()) {
			console.log(`[Claim] Skipping "${questName}" — already claimed.`);
			results.push({ questId: quest.id, questName, claimed: false, skipped: 'already-claimed', attempts: 0 });
			continue;
		}

		const completedAt = (target.userStatus as any)?.completed_at;
		if (completedAt) {
			const ageMs = Date.now() - new Date(completedAt).getTime();
			const minAge = randMs(cfg.claimMinDelayMs, cfg.claimMaxDelayMs);
			if (ageMs < minAge) {
				const wait = minAge - ageMs;
				console.log(
					`[Claim] "${questName}" completed recently — settling ${(wait / 1000).toFixed(0)}s before claim.`,
				);
				await sleep(wait);
			}
		} else {
			await sleep(randMs(cfg.settleMinMs, cfg.settleMaxMs));
		}

		await sleep(randMs(cfg.preClaimIdleMinMs, cfg.preClaimIdleMaxMs));

		const result = await claimOneWithRetry(client, target, cfg);
		results.push(result);

		if (result.claimed) {
			console.log(`[Claim] Claimed "${questName}" after ${result.attempts} attempt(s).`);
			client.emitQuestCompleted?.(quest.id);
		}

		if (i < redeemable.length - 1) {
			const gap = randMs(cfg.postClaimGapMinMs, cfg.postClaimGapMaxMs);
			console.log(`[Claim] Cooling down ${(gap / 1000).toFixed(0)}s before next claim...`);
			await sleep(gap);
		}
	}

	const ok = results.filter((r) => r.claimed).length;
	console.log(`[Claim] Done. Claimed ${ok}/${results.length}.`);
	return results;
}
