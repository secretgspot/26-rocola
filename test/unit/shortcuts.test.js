import { describe, expect, it } from 'vitest';
import { getShortcutDecision } from '../../src/lib/client/shortcuts.js';

const konami = [
	'arrowup',
	'arrowup',
	'arrowdown',
	'arrowdown',
	'arrowleft',
	'arrowright',
	'arrowleft',
	'arrowright',
	'a',
	'b'
];

describe('getShortcutDecision', () => {
	it('ignores shortcuts in input fields', () => {
		const out = getShortcutDecision({
			key: 'h',
			targetTagName: 'INPUT',
			isHelpOpen: false,
			isAdmin: false,
			isDev: true,
			adminIndex: 0,
			konami
		});
		expect(out).toEqual({ action: 'none', nextAdminIndex: 0 });
	});

	it('triggers skip only for dev/admin', () => {
		const denied = getShortcutDecision({
			key: 'n',
			targetTagName: 'DIV',
			isHelpOpen: false,
			isAdmin: false,
			isDev: false,
			adminIndex: 0,
			konami
		});
		expect(denied.action).toBe('none');

		const allowed = getShortcutDecision({
			key: 'N',
			targetTagName: 'DIV',
			isHelpOpen: false,
			isAdmin: true,
			isDev: false,
			adminIndex: 0,
			konami
		});
		expect(allowed.action).toBe('skip');
	});

	it('toggles and closes help menu', () => {
		const open = getShortcutDecision({
			key: 'h',
			targetTagName: 'DIV',
			isHelpOpen: false,
			isAdmin: false,
			isDev: false,
			adminIndex: 0,
			konami
		});
		expect(open.action).toBe('toggle_help');

		const close = getShortcutDecision({
			key: 'Escape',
			targetTagName: 'DIV',
			isHelpOpen: true,
			isAdmin: false,
			isDev: false,
			adminIndex: 0,
			konami
		});
		expect(close.action).toBe('close_help');
	});

	it('advances and completes konami sequence', () => {
		let idx = 0;
		for (let i = 0; i < konami.length - 1; i += 1) {
			const out = getShortcutDecision({
				key: konami[i],
				targetTagName: 'DIV',
				isHelpOpen: false,
				isAdmin: false,
				isDev: false,
				adminIndex: idx,
				konami
			});
			expect(out.action).toBe('none');
			idx = out.nextAdminIndex;
		}

		const final = getShortcutDecision({
			key: konami[konami.length - 1],
			targetTagName: 'DIV',
			isHelpOpen: false,
			isAdmin: false,
			isDev: false,
			adminIndex: idx,
			konami
		});
		expect(final.action).toBe('enable_admin');
		expect(final.nextAdminIndex).toBe(0);
	});
});

