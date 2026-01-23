'use client'

import Image from "next/image";
import Welcome from "./Welcome";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <Welcome />
      <div className="node-list-container">
      </div>
    </div>
  );
}
