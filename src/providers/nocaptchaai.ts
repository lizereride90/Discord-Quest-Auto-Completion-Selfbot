import { fetch } from 'undici';
import type { CaptchaProvider, HcaptchaSolveParams } from './types';

// NoCaptchaAI — free signup balance, then pay-as-you-go.
// Docs: https://nocaptchaai.com/api | key in NOCAPTCHA_API_KEY
export class NoCaptchaAISolver implements CaptchaProvider {
	readonly name = 'nocaptchaai';
	private apiKey: string;
	constructor(apiKey: string) {
		this.apiKey = apiKey;
	}
	isConfigured(): boolean {
		return this.apiKey.trim().length > 0;
	}
	async solveHcaptcha(params: HcaptchaSolveParams): Promise<string> {
		const res = await fetch('https://api.nocaptchaai.com/solve', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				apikey: this.apiKey,
				sitekey: params.sitekey,
				pageurl: params.url,
				data: params.rqdata ?? '',
				useragent: params.userAgent ?? '',
				invisible: params.isInvisible ? 1 : 0,
			}),
		}).then((r) => r.json() as any);
		const token = res?.solution ?? res?.token ?? res?.gRecaptchaResponse;
		if (!token) {
			throw new Error(`[nocaptchaai] No token: ${JSON.stringify(res).slice(0, 200)}`);
		}
		return token as string;
	}
}
