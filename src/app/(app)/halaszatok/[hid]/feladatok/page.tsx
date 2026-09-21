import FeladatokClient from "./ui/FeladatokClient";

export default async function FeladatokPage(props: { params: Promise<{ hid: string }> }) {
    const { hid } = await props.params;
    return <FeladatokClient hid={hid} />;
}
