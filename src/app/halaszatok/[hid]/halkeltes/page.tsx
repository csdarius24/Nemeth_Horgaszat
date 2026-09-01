import HalkeltesClient from "./ui/HalkeltesClient";

export default async function HalkeltesPage(props: { params: Promise<{ hid: string }> }) {
    const { hid } = await props.params;
    return <HalkeltesClient hid={hid} />;
}
