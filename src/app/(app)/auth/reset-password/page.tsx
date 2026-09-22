import { Suspense } from "react";
import ResetForm from "./ResetForm";

export const metadata = { title: "Nova senha" };
export default function Page() { return <Suspense><ResetForm /></Suspense>; }
