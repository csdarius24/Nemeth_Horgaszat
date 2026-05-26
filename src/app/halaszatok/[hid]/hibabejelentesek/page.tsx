import HibabejelentesekOldal from "@/components/ui/HibabejelentesekOldal";

export default async function Page({
                                       params,
                                   }: {
    params: Promise<{ hid: string }>;
}) {
    const { hid } = await params;
    return <HibabejelentesekOldal hid={hid} />;
}