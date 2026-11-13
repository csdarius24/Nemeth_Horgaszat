import TokezelesekClient from "./ui/TokezelesekClient";

export default async function TokezelesekPage(props: {
    params: Promise<{ hid: string }>;
    searchParams: Promise<{ toId?: string }>;
}) {
    const { hid } = await props.params;
    const { toId } = await props.searchParams;
    // `?toId=` — pl. a tó adatlapjáról érkezve előre szűr az adott tóra.
    return <TokezelesekClient hid={hid} kezdoToId={toId && /^\d+$/.test(toId) ? toId : null} />;
}
