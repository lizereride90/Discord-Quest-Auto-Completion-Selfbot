import { YesCaptchaSolver } from './yescaptcha';
import type { CaptchaProvider, HcaptchaSolveParams } from './types';

export class YesCaptchaProvider implements CaptchaProvider {
	readonly name = 'yescaptcha';
	private inner: YesCaptchaSolver;
	constructor(apiKey: string) {
		this.inner = new YesCaptchaSolver(apiKey);
	}
	isConfigured(): boolean {
		return true;
	}
	async solveHcaptcha(params: HcaptchaSolveParams): Promise<string> {
		const result = await this.inner.hcaptcha(params.sitekey, params.url, {
			rqdata: params.rqdata,
			isInvisible: params.isInvisible,
			userAgent: params.userAgent,
		});
		if (!result?.gRecaptchaResponse) {
			throw new Error('[yescaptcha] Empty token in solution.');
		}
		return result.gRecaptchaResponse;
	}
}
