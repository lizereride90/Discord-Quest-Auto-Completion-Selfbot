import { Constants } from './constants';
import { CaptchaDataFromRequest } from './interface';
import { YesCaptchaSolver } from './providers/yescaptcha';

function getSolver(): YesCaptchaSolver | null {
	const key = (process.env.YES_CAPTCHA_API_KEY ?? '').trim();
	if (!key) return null;
	return new YesCaptchaSolver(key);
}

export function isCaptchaSolvingEnabled(): boolean {
	if ((process.env.CAPTCHA_TOKEN ?? '').trim()) return true;
	return Boolean((process.env.YES_CAPTCHA_API_KEY ?? '').trim());
}

export function isCaptchaError(err: any): boolean {
	const msg = String(err?.message ?? '').toLowerCase();
	return (
		msg.includes('captcha') ||
		msg.includes('captcha-required') ||
		Boolean(err?.rawError?.captcha_sitekey)
	);
}

export async function solveCaptcha(data: CaptchaDataFromRequest): Promise<string> {
	const manual = (process.env.CAPTCHA_TOKEN ?? '').trim();
	if (manual) {
		console.log('[Captcha] Using manual CAPTCHA_TOKEN from env.');
		return manual;
	}
	const solver = getSolver();
	if (!solver) {
		const err: any = new Error(
			'Captcha required but no solver configured. Set CAPTCHA_TOKEN (free, manual) or YES_CAPTCHA_API_KEY (paid). Skipping quest.',
		);
		err.code = 'CAPTCHA_UNCONFIGURED';
		throw err;
	}
	console.log(
		`[Captcha] Solving hcaptcha sitekey=${data.captcha_sitekey}...`,
	);
	const result = await solver.hcaptcha(data.captcha_sitekey, 'https://discord.com', {
		rqdata: data.captcha_rqdata,
		isInvisible: false,
		userAgent: Constants.USER_AGENT,
	});
	if (!result?.gRecaptchaResponse) {
		throw new Error('Captcha solver returned an empty token.');
	}
	console.log(`[Captcha] Solved, token length=${result.gRecaptchaResponse.length}.`);
	return result.gRecaptchaResponse;
}
