import type { PageServerLoad } from "./$types";
import { FAMILY_TREE_PAGE_SIZE, getFamilyTrees } from "$lib/api/familyTree";

export const load: PageServerLoad = async () => {
    const response = await getFamilyTrees(0, FAMILY_TREE_PAGE_SIZE);
    return { trees: response.trees, hasMore: response.hasMore };
};
