import HalaszatiNaploClient from "./ui/HalaszatiNaploClient";

export default async function NaploPage(props: { params: Promise<{ hid: string }> }) {
    const { hid } = await props.params;
    return <HalaszatiNaploClient hid={hid} />;
}
