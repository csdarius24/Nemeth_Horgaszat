import ToakAttekintesClient from "./ui/ToakAttekintesClient";

export default async function ToakPage(props: { params: Promise<{ hid: string }> }) {
    const { hid } = await props.params;
    return <ToakAttekintesClient hid={hid} />;
}
