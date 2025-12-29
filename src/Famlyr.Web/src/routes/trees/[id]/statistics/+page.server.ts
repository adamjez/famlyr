import type { PageServerLoad } from "./$types";
import { getTreeDetails, getTreeStatistics } from "$lib/api/familyTree";
import { error } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ params }) => {
    try {
        const [tree, statistics] = await Promise.all([
            getTreeDetails(params.id),
            getTreeStatistics(params.id)
        ]);
        return { tree, statistics };
    } catch (e) {
        throw error(404, "Family tree not found");
    }
};
