/**
 * @typedef {'none'|'skip'|'toggle_help'|'close_help'|'enable_admin'} ShortcutAction
 */

/**
 * Computes global shortcut action and next konami index.
 * Pure helper to keep page-level key handling deterministic and testable.
 * @param {{
 *   key: string,
 *   targetTagName?: string | null,
 *   isHelpOpen: boolean,
 *   isAdmin: boolean,
 *   isDev: boolean,
 *   adminIndex: number,
 *   konami: string[]
 * }} input
 * @returns {{ action: ShortcutAction, nextAdminIndex: number }}
 */
export function getShortcutDecision(input) {
	const key = String(input.key || '').toLowerCase();
	const targetTag = String(input.targetTagName || '').toUpperCase();
	const isTypingTarget = targetTag === 'INPUT' || targetTag === 'TEXTAREA';

	if (isTypingTarget) {
		return { action: 'none', nextAdminIndex: input.adminIndex };
	}

	if ((input.isDev || input.isAdmin) && key === 'n') {
		return { action: 'skip', nextAdminIndex: input.adminIndex };
	}

	if (key === 'h') {
		return { action: 'toggle_help', nextAdminIndex: input.adminIndex };
	}

	if (key === 'escape' && input.isHelpOpen) {
		return { action: 'close_help', nextAdminIndex: input.adminIndex };
	}

	const expected = input.konami[input.adminIndex];
	if (key === expected) {
		const next = input.adminIndex + 1;
		if (next >= input.konami.length) {
			return { action: 'enable_admin', nextAdminIndex: 0 };
		}
		return { action: 'none', nextAdminIndex: next };
	}

	return {
		action: 'none',
		nextAdminIndex: key === input.konami[0] ? 1 : 0
	};
}

