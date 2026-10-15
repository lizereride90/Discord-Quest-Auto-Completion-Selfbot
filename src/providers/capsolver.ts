import { fetch } from 'undici';
import type { CaptchaProvider, HcaptchaSolveParams } from './types';

// CapSolver — cheapest reliable hcaptcha, no free tier.
// Docs: https://docs.capsolver.com | key in CAPSOLVER_API_KEY
export class CapSolverProvider implements CaptchaProvider {
	readonly name = 'capsolver';
	private apiKey: string;
	constructor(apiKey: string) {
		this.apiKey = apiKey;
	}
	isConfigured(): boolean {
		return this.apiKey.trim().length > 0;
	}
	private async createTask(params: HcaptchaSolveParams): Promise<string> {
		const res = await fetch('https://api.capsolver.com/createTask', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				clientKey: this.apiKey,
				task: {
					type: 'HCaptchaTaskProxyLess',
					websiteURL: params.url,
					websiteKey: params.sitekey,
					isInvisible: params.isInvisible ?? false,
					userAgent: params.userAgent ?? '',
					enterprisePayload: params.rqdata ? { rqdata: params.rqdata } : undefined,
				},
			}),
		}).then((r) => r.json() as any);
		if (res.errorId !== 0 || !res.taskId) {
			throw new Error(`[capsolver] createTask failed: ${JSON.stringify(res).slice(0, 200)}`);
		}
		return res.taskId as string;
	}
	private async pollResult(taskId: string): Promise<string> {
		const deadline = Date.now() + 120_000;
		while (Date.now() < deadline) {
			const res = await fetch('https://api.capsolver.com/getTaskResult', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ clientKey: this.apiKey, taskId }),
			}).then((r) => r.json() as any);
			if (res.errorId !== 0) {
				throw new Error(`[capsolver] getTaskResult failed: ${JSON.stringify(res).slice(0, 200)}`);
			}
			if (res.status === 'ready') {
				const token = res?.solution?.gRecaptchaResponse;
				if (!token) throw new Error('[capsolver] Empty token in solution.');
				return token as string;
			}
			await new Promise((r) => setTimeout(r, 3000));
		}
		throw new Error('[capsolver] Timeout waiting for solution.');
	}
	async solveHcaptcha(params: HcaptchaSolveParams): Promise<string> {
		const taskId = await this.createTask(params);
		return this.pollResult(taskId);
	}
}
