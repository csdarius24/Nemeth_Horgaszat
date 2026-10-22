/**
 * Egységes értesítések (sonner). A `<Toaster />` a gyökér layoutban él.
 *
 *   toast.success("Mentve")
 *   toast.error("Nem sikerült menteni", { description: hibaUzenet })
 *   toast.promise(mentes(), { loading: "Mentés…", success: "Mentve", error: "Hiba" })
 */
export { toast } from "sonner";
