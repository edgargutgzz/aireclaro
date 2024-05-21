import Navbar from "@/components/navbar";

export default function Home() {
  return (
    <>
      <div className="flex h-screen">
        {/* Navbar */}
        <Navbar />
        {/* Main Content */}
        <div className="flex w-4/5 justify-center bg-slate-50">
          <div className="flex w-2/3 justify-center">
            <h1>Chat</h1>
          </div>
        </div>
      </div>
    </>
  );
}
