// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	interface Window {
		YT?: any;
		onYouTubeIframeAPIReady?: () => void;
	}

	namespace App {
		// interface Error {}
		interface Locals {
			clientIp: string;
			sessionId: string;
			isAdmin: boolean;
			isDev: boolean;
			userAgent: string;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
