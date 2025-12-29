import type { PersonModel } from '$lib/types/api';

export interface SearchResult {
	person: PersonModel;
	score: number;
}

export function searchPersons(
	persons: PersonModel[],
	query: string,
	limit: number = 10
): SearchResult[] {
	const normalizedQuery = query.toLowerCase().trim();

	if (normalizedQuery.length < 1) {
		return [];
	}

	const results: SearchResult[] = [];

	for (const person of persons) {
		const firstNameLower = (person.firstName ?? '').toLowerCase();
		const lastNameLower = (person.lastName ?? '').toLowerCase();
		const fullName = `${firstNameLower} ${lastNameLower}`.trim();

		let score = 0;

		// Exact match gets highest score
		if (firstNameLower === normalizedQuery || lastNameLower === normalizedQuery) {
			score = 100;
		}
		// Starts-with match (high relevance)
		else if (firstNameLower.startsWith(normalizedQuery)) {
			score = 90;
		} else if (lastNameLower.startsWith(normalizedQuery)) {
			score = 85;
		}
		// Full name starts-with
		else if (fullName.startsWith(normalizedQuery)) {
			score = 80;
		}
		// Contains match (medium relevance)
		else if (firstNameLower.includes(normalizedQuery)) {
			score = 60;
		} else if (lastNameLower.includes(normalizedQuery)) {
			score = 55;
		} else if (fullName.includes(normalizedQuery)) {
			score = 50;
		}
		// Fuzzy match: allow 1 character mismatch for queries >= 3 chars
		else if (normalizedQuery.length >= 3) {
			score = fuzzyMatch(normalizedQuery, firstNameLower, lastNameLower);
		}

		if (score > 0) {
			results.push({ person, score });
		}
	}

	// Sort by score descending, then by name alphabetically
	results.sort((a, b) => {
		if (b.score !== a.score) return b.score - a.score;
		const nameA = formatFullName(a.person);
		const nameB = formatFullName(b.person);
		return nameA.localeCompare(nameB);
	});

	return results.slice(0, limit);
}

function fuzzyMatch(query: string, firstName: string, lastName: string): number {
	const minDistFirst = levenshteinDistance(query, firstName.slice(0, query.length + 1));
	const minDistLast = levenshteinDistance(query, lastName.slice(0, query.length + 1));

	if (minDistFirst <= 1) return 40;
	if (minDistLast <= 1) return 35;

	return 0;
}

function levenshteinDistance(s1: string, s2: string): number {
	const m = s1.length;
	const n = s2.length;

	if (m === 0) return n;
	if (n === 0) return m;

	const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

	for (let i = 0; i <= m; i++) dp[i][0] = i;
	for (let j = 0; j <= n; j++) dp[0][j] = j;

	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
			dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
		}
	}

	return dp[m][n];
}

function formatFullName(person: PersonModel): string {
	const first = person.firstName ?? '';
	const last = person.lastName ?? '';
	return `${first} ${last}`.trim() || 'Unknown';
}
