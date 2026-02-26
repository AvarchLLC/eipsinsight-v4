import { redirect } from "next/navigation";

export default function AdminVideosRedirect() {
  redirect("/admin#videos");
}
