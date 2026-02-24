import ToDashboardClient from "./ui/ToDashboardClient";

export default async function ToDashboardPage(props: { params: Promise<{ hid: string; toId: string }> }) {
    const { toId } = await props.params;

    return (
        <main style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
            <h1>Tó dashboard</h1>
            <ToDashboardClient toId={toId} />
        </main>
    );
}