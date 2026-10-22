import HalfajokClient from "./ui/HalfajokClient";

export default async function HalfajokPage(props: { params: Promise<{ hid: string }> }) {
    const { hid } = await props.params;

    return <HalfajokClient hid={hid} />;
}
