import { GatewayDispatchEvents } from 'discord-api-types/v10';
import { ClientQuest } from './src/client';
import { stealthClaimAll } from './src/claimStealth';
import { humanDelay, randMs } from './src/stealth';

let currentUserId: string | null = null;

const client = new ClientQuest(process.env.TOKEN!);

/*
client.on(
	GatewayDispatchEvents.MessageCreate,
	async ({ data: message, api }) => {
		console.log('Message received:', message.content);
		if (message.content === 'ping' && message.author.id === currentUserId) {
			await api.channels.createMessage(message.channel_id, {
				content: 'pong',
			});
		}
	},
);
*/

client.once(GatewayDispatchEvents.Ready, async ({ data, api }) => {
	currentUserId = data.user.id;
	if (process.env.GITHUB_ACTIONS === 'true') {
		console.log('Logged in!');
	} else {
		console.log(`Logged in as @${data.user.username}`);
	}

	await client.fetchQuests(false);
	const questsValid = client.questManager!.filterQuestsValidToDo();
	console.log(`Found ${questsValid.length} valid quests to do.`);

	for (const quest of questsValid) {
		try {
			await client.questManager!.doingQuest(quest);
		} catch (err: any) {
			console.error(`Failed quest "${quest.id}":`, err?.message ?? err);
		}
		if (questsValid.indexOf(quest) < questsValid.length - 1) {
			await humanDelay(randMs(10_000, 30_000));
		}
	}

	await stealthClaimAll(client);

	console.log('All quests processed. Disconnecting...');
	await client.destroy();
});

process.on('unhandledRejection', (reason, promise) => {
	console.error('[Error:] Unhandled Rejection');
});

process.on('uncaughtException', (error) => {
	console.error('Uncaught Exception:', error.message);
});

client.connect();
