import { GatewayDispatchEvents } from 'discord-api-types/v10';
import { ClientQuest } from './src/client';
import { stealthClaimAll } from './src/claimStealth';

const client = new ClientQuest(process.env.TOKEN!);

client.once(GatewayDispatchEvents.Ready, async ({ data }) => {
	if (process.env.GITHUB_ACTIONS === 'true') {
		console.log('Logged in!');
	} else {
		console.log(`Logged in as @${(data.user as any).username}`);
	}

	try {
		const results = await stealthClaimAll(client);
		const ok = results.filter((r) => r.claimed).length;
		console.log(`[ClaimOnly] Claimed ${ok}/${results.length}. Disconnecting...`);
	} catch (err: any) {
		console.error('[ClaimOnly] Fatal:', err?.message ?? err);
	} finally {
		await client.destroy();
	}
});

process.on('unhandledRejection', (reason, promise) => {
	console.error('[Error:] Unhandled Rejection');
});

process.on('uncaughtException', (error) => {
	console.error('Uncaught Exception:', error.message);
});

client.connect();
