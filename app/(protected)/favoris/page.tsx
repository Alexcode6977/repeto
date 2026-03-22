import { listSoloFavorites } from "@/lib/actions/solo-favorites";
import { FavoritesClient } from "./favorites-client";

export default async function FavorisPage() {
    const favorites = await listSoloFavorites();

    return <FavoritesClient initialFavorites={favorites} />;
}
