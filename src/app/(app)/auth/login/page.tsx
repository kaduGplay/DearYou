import { Suspense } from "react";
import AuthForm from "./AuthForm";

export const metadata = { title: "Entrar" };
export default function Page() {
  return <Suspense><AuthForm /></Suspense>;
}
