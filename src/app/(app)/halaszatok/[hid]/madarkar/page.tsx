import MadarkarClient from "./ui/MadarkarClient";

export default async function MadarkarPage(props: {
    params: Promise<{ hid: string }>;
    searchParams: Promise<{ toId?: string }>;
}) {
    const { hid } = await props.params;
    const { toId } = await props.searchParams;
    // `?toId=` — pl. a tó adatlapjáról érkezve előre szűr az adott tóra.
    const kezdoTo = toId && /^\d+$/.test(toId) ? toId : null;
    return <MadarkarClient hid={hid} kezdoToId={kezdoTo} />;
}
