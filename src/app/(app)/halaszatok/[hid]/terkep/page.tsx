import TerkepClient from "./ui/TerkepClient";

export default async function TerkepPage(props: { params: Promise<{ hid: string }> }) {
    const { hid } = await props.params;
    return <TerkepClient hid={hid} />;
}
