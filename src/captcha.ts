import { Constants } from './constants';
import { CaptchaDataFromRequest } from './interface';
import { YesCaptchaSolver } from './providers/yescaptcha';
import { Utils } from './utils';

function getSolver(): YesCaptchaSolver | null {
	const key = (process.env.YES_CAPTCHA_API_KEY ?? '').trim();
	if (!key) return null;
	return new YesCaptchaSolver(key);
}

export function isCaptchaSolvingEnabled(): boolean {
	return Boolean((process.env.YES_CAPTCHA_API_KEY ?? '').trim());
}

export async function solveCaptcha(data: CaptchaDataFromRequest): Promise<string> {
	const solver = getSolver();
	if (!solver) {
		throw new Error(
			'Captcha required but YES_CAPTCHA_API_KEY is missing. Set it in .env (local) or repo secrets (workflow) to enable solving.',
		);
	}
	console.log(
		`[Captcha] Solving hcaptcha sitekey=${data.captcha_sitekey} service=${data.captcha_service ?? 'hcaptcha'}...`,
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
