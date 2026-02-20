import { getShortcutDecision } from '$lib/client/shortcuts.js';

export function startViewportWatcher({ query = '(max-width: 1023px)', onChange }) {
	if (typeof window === 'undefined') return () => {};
	const media = window.matchMedia(query);
	const update = () => onChange(Boolean(media.matches));
	update();
	media.addEventListener('change', update);
	return () => media.removeEventListener('change', update);
}

export function createQueueRevealController({ isHelpOpen, setQueueVisible }) {
	let queueHideTimer = null;

	const clearQueueHideTimer = () => {
		if (queueHideTimer) {
			clearTimeout(queueHideTimer);
			queueHideTimer = null;
		}
	};

	const scheduleQueueHide = (delayMs = 1600) => {
		clearQueueHideTimer();
		queueHideTimer = setTimeout(() => {
			setQueueVisible(false);
		}, delayMs);
	};

	return {
		pointerEnter(e) {
			if (isHelpOpen()) return;
			if (e.pointerType === 'mouse') {
				setQueueVisible(true);
				clearQueueHideTimer();
			}
		},
		pointerMove(e) {
			if (isHelpOpen()) return;
			if (e.pointerType === 'mouse') {
				setQueueVisible(true);
				clearQueueHideTimer();
			}
		},
		pointerLeave(e) {
			if (isHelpOpen()) return;
			if (e.pointerType === 'mouse') {
				setQueueVisible(false);
				clearQueueHideTimer();
			}
		},
		touchReveal() {
			if (isHelpOpen()) return;
			setQueueVisible(true);
			scheduleQueueHide();
		},
		syncHelpOpen(helpOpen) {
			if (helpOpen) {
				setQueueVisible(false);
				clearQueueHideTimer();
			}
		},
		syncQueueLength(queueLength) {
			if (queueLength === 0) {
				setQueueVisible(false);
				clearQueueHideTimer();
			}
		},
		dispose() {
			clearQueueHideTimer();
		}
	};
}

export function startShortcutBindings({
	getHelpOpen,
	getIsAdmin,
	getIsDev,
	getAdminIndex,
	setAdminIndex,
	konami,
	onSkip,
	onToggleHelp,
	onCloseHelp,
	onEnableAdmin
}) {
	if (typeof window === 'undefined') return () => {};
	const handler = (e) => {
		const target = /** @type {HTMLElement | null} */ (e.target);
		const decision = getShortcutDecision({
			key: e.key,
			targetTagName: target?.tagName || null,
			isHelpOpen: getHelpOpen(),
			isAdmin: getIsAdmin(),
			isDev: getIsDev(),
			adminIndex: getAdminIndex(),
			konami
		});

		setAdminIndex(decision.nextAdminIndex);
		if (decision.action === 'none') return;

		e.preventDefault();
		if (decision.action === 'skip') return onSkip();
		if (decision.action === 'toggle_help') return onToggleHelp();
		if (decision.action === 'close_help') return onCloseHelp();
		if (decision.action === 'enable_admin') return onEnableAdmin();
	};

	window.addEventListener('keydown', handler);
	return () => window.removeEventListener('keydown', handler);
}

