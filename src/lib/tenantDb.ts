import { db } from "@/lib/prisma";

export function tenantDb(halaszatId: number) {
    return {
        to: {
            findMany: (args: any = {}) =>
                db.to.findMany({
                    ...args,
                    where: { ...(args.where ?? {}), halaszatId },
                }),
            findFirst: (args: any = {}) =>
                db.to.findFirst({
                    ...args,
                    where: { ...(args.where ?? {}), halaszatId },
                }),
            create: (args: any) =>
                db.to.create({
                    ...args,
                    data: { ...(args.data ?? {}), halaszatId },
                }),
            update: (args: any) =>
                db.to.update({
                    ...args,
                    // update-nél is érdemes tenant-checket csinálni előtte (lásd assertToBelongsToTenant)
                }),
        },

        halAllomany: {
            findMany: (args: any = {}) =>
                db.halAllomany.findMany({
                    ...args,
                    where: { ...(args.where ?? {}), halaszatId },
                }),
            findFirst: (args: any = {}) =>
                db.halAllomany.findFirst({
                    ...args,
                    where: { ...(args.where ?? {}), halaszatId },
                }),
            create: (args: any) =>
                db.halAllomany.create({
                    ...args,
                    data: { ...(args.data ?? {}), halaszatId },
                }),
            update: (args: any) => db.halAllomany.update(args),
        },

        naploEsemeny: {
            findMany: (args: any = {}) =>
                db.naploEsemeny.findMany({
                    ...args,
                    where: { ...(args.where ?? {}), halaszatId },
                }),
            create: (args: any) =>
                db.naploEsemeny.create({
                    ...args,
                    data: { ...(args.data ?? {}), halaszatId },
                }),
        },
    };
}