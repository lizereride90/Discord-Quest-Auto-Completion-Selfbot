import { Constants } from './constants';
import { CaptchaDataFromRequest } from './interface';
import { CapSolverProvider } from './providers/capsolver';
import { NoCaptchaAISolver } from './providers/nocaptchaai';
import type { CaptchaProvider } from './providers/types';
import { YesCaptchaProvider } from './providers/yescaptchaProvider';

export function isCaptchaError(err: any): boolean {
	const msg = String(err?.message ?? '').toLowerCase();
	return (
		msg.includes('captcha') ||
		msg.includes('captcha-required') ||
		Boolean(err?.rawError?.captcha_sitekey)
	);
}

function buildChain(): CaptchaProvider[] {
	const chain: CaptchaProvider[] = [];
	const nocaptcha = (process.env.NOCAPTCHA_API_KEY ?? '').trim();
	const yescaptcha = (process.env.YES_CAPTCHA_API_KEY ?? '').trim();
	const capsolver = (process.env.CAPSOLVER_API_KEY ?? '').trim();
	if (nocaptcha) chain.push(new NoCaptchaAISolver(nocaptcha));
	if (yescaptcha) chain.push(new YesCaptchaProvider(yescaptcha));
	if (capsolver) chain.push(new CapSolverProvider(capsolver));
	return chain;
}

export function isCaptchaSolvingEnabled(): boolean {
	if ((process.env.CAPTCHA_TOKEN ?? '').trim()) return true;
	return buildChain().length > 0;
}

export function listSolverNames(): string[] {
	return buildChain().map((p) => p.name);
}

export async function solveCaptcha(data: CaptchaDataFromRequest): Promise<string> {
	const manual = (process.env.CAPTCHA_TOKEN ?? '').trim();
	if (manual) {
		console.log('[Captcha] Using manual CAPTCHA_TOKEN from env (free).');
		return manual;
	}
	const chain = buildChain();
	if (chain.length === 0) {
		const err: any = new Error(
			'Captcha required but no solver configured. Free: set CAPTCHA_TOKEN (manual) or NOCAPTCHA_API_KEY (free signup balance). Paid: YES_CAPTCHA_API_KEY / CAPSOLVER_API_KEY.',
		);
		err.code = 'CAPTCHA_UNCONFIGURED';
		throw err;
	}
	console.log(`[Captcha] Chain: ${chain.map((p) => p.name).join(' -> ')}. sitekey=${data.captcha_sitekey}`);
	let lastErr: any = null;
	for (const provider of chain) {
		try {
			console.log(`[Captcha] Trying ${provider.name}...`);
			const token = await provider.solveHcaptcha({
				sitekey: data.captcha_sitekey,
				url: 'https://discord.com',
				rqdata: data.captcha_rqdata,
				isInvisible: false,
				userAgent: Constants.USER_AGENT,
			});
			if (!token) throw new Error(`[${provider.name}] Empty token.`);
			console.log(`[Captcha] Solved via ${provider.name}, len=${token.length}.`);
			return token;
		} catch (e: any) {
			lastErr = e;
			console.warn(`[Captcha] ${provider.name} failed:`, e?.message ?? e);
		}
	}
	throw lastErr ?? new Error('[Captcha] All solvers failed.');
}
