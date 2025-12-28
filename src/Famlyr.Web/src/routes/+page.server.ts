import type { PageServerLoad } from "./$types";
import { getFamilyTree } from "$lib/api/familyTree";

const demoTreeId = "019b6252-6256-72f4-903d-8dd21ad3cc22";

export const load: PageServerLoad = async () => {
    const tree = await getFamilyTree(demoTreeId);
    return { tree };
};
