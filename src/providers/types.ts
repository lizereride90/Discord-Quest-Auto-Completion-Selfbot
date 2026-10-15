import { fetch } from 'undici';

export interface HcaptchaSolveParams {
	sitekey: string;
	url: string;
	rqdata?: string;
	isInvisible?: boolean;
	userAgent?: string;
}

export interface CaptchaProvider {
	readonly name: string;
	isConfigured(): boolean;
	solveHcaptcha(params: HcaptchaSolveParams): Promise<string>;
}
