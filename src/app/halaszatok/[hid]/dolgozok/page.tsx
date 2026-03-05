import DolgozokClient from "./DolgozokClient";

export default async function DolgozokPage({
                                               params,
                                           }: {
    params: Promise<{ hid: string }>;
}) {
    const { hid } = await params;
    const halaszatId = Number(hid);

    return <DolgozokClient halaszatId={halaszatId} />;
}