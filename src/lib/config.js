/**
 * Centralized Tier Configuration
 * Used by both server and client to ensure consistency in pricing, limits, and ranking.
 */
export const TIER_CONFIG = {
	platinum: {
		id: 'platinum',
		label: 'ULTRA_VOID',
		price: 10,
		dailyPlays: 15,
		gap: 2, // Every 2nd turn
		priority: 3,
		color: 'var(--tier-platinum)',
		description: '15 plays • Every 2nd turn'
	},
	gold: {
		id: 'gold',
		label: 'GOLD_STRIKE',
		price: 5,
		dailyPlays: 7,
		gap: 3, // Every 3rd turn
		priority: 2,
		color: 'var(--tier-gold)',
		description: '7 plays • Every 3rd turn'
	},
	silver: {
		id: 'silver',
		label: 'SILVER_BOOST',
		price: 2,
		dailyPlays: 3,
		gap: 5, // Every 5th turn
		priority: 1,
		color: 'var(--tier-silver)',
		description: '3 plays • Every 5th turn'
	},
	free: {
		id: 'free',
		label: 'FREE_LOAD',
		price: 0,
		dailyPlays: 1,
		gap: 0,
		priority: 0,
		color: 'var(--text-dim)',
		description: '1 play • Standard rotation'
	}
};

export const DEFAULT_TIER = 'free';

/**
 * Helper to get tier config with fallback to free
 * @param {string} tierId 
 */
export function getTierConfig(tierId) {
	return TIER_CONFIG[tierId?.toLowerCase()] || TIER_CONFIG[DEFAULT_TIER];
}
