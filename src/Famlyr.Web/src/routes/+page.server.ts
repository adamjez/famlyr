import type { PageServerLoad } from "./$types";
import { getFamilyTree } from "$lib/api/familyTree";

const demoTreeId = "00000000-0000-0000-0000-000000000001";

export const load: PageServerLoad = async () => {
    const tree = await getFamilyTree(demoTreeId);
    return { tree };
};
