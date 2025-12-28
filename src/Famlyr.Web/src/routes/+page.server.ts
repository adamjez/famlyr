import type { PageServerLoad } from "./$types";
import { getFamilyTrees } from "$lib/api/familyTree";

export const load: PageServerLoad = async () => {
    const response = await getFamilyTrees();
    return { trees: response.trees };
};
