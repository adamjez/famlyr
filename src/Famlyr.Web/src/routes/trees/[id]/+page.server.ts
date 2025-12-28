import type { PageServerLoad } from "./$types";
import { getTreeDetails } from "$lib/api/familyTree";
import { error } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ params }) => {
    try {
        const tree = await getTreeDetails(params.id);
        return { tree };
    } catch (e) {
        throw error(404, "Family tree not found");
    }
};
