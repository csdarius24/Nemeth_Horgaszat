import TakarmanyokClient from "./ui/TakarmanyokClient";

export default async function TakarmanyokPage(props: { params: Promise<{ hid: string }> }) {
    const { hid } = await props.params;

    return <TakarmanyokClient hid={hid} />;
}
