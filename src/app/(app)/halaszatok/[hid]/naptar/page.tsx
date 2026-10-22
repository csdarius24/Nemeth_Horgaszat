import NaptarClient from "./ui/NaptarClient";

export default async function NaptarPage(props: { params: Promise<{ hid: string }> }) {
    const { hid } = await props.params;

    return <NaptarClient hid={hid} />;
}
