import type { PageServerLoad } from "./$types";
import { getTreeDetails, PERSON_PAGE_SIZE } from "$lib/api/familyTree";
import { error } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ params }) => {
    try {
        const tree = await getTreeDetails(params.id, 0, PERSON_PAGE_SIZE);
        return { tree };
    } catch (e) {
        throw error(404, "Family tree not found");
    }
};
