"use client";

export default function AireClaroVideo() {
  return (
    <div className="mb-10 overflow-hidden rounded-xl">
      <iframe
        width="560"
        height="315"
        src="https://www.youtube.com/embed/zUt6HwlZB08?si=z6mAQ8bkuVx25QsP"
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="h-52 w-full md:h-80"
      />
    </div>
  );
}
