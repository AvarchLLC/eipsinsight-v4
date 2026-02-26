import { redirect } from "next/navigation";

export default function AdminBlogsRedirect() {
  redirect("/admin#blogs");
}
