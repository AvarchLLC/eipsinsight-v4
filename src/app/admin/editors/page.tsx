import { redirect } from "next/navigation";

export default function AdminEditorsRedirect() {
  redirect("/admin#editors");
}
