import { NextRequest, NextResponse } from "next/server";
import supabase from "@/utils/supabase/serverless"; // Adjust the path as needed
import { Readable } from "stream";
import archiver from "archiver";
import { parse } from "json2csv";

interface CalidadAire {
  id: number;
  sensor_id: number;
  pm25: number;
  temperature: number;
  humidity: number;
  time_stamp: string;
}

export async function GET(req: NextRequest) {
  try {
    let allData: CalidadAire[] = [];
    let from = 0;
    const step = 1000; // Fetch 1000 rows at a time

    while (true) {
      const { data, error, count } = await supabase
        .from("calidad_aire")
        .select("*", { count: "exact" })
        .gte("time_stamp", "2024-01-01")
        .lt("time_stamp", "2025-01-01")
        .range(from, from + step - 1);

      if (error) {
        throw error;
      }

      if (data.length === 0) {
        break;
      }

      allData = allData.concat(data);
      from += step;

      if (from >= (count ?? 0)) {
        break;
      }
    }

    // Convert JSON data to CSV
    const csv = parse(allData);

    // Create a stream for the zip file
    const archive = archiver("zip", {
      zlib: { level: 9 },
    });

    const stream = new Readable();
    stream._read = () => {}; // No-op
    archive.on("data", (chunk) => stream.push(chunk));
    archive.on("end", () => stream.push(null));

    // Append the CSV file to the zip
    archive.append(csv, { name: "calidad_aire.csv" });

    // Finalize the archive
    await archive.finalize();

    const headers = new Headers();
    headers.set("Content-Disposition", "attachment; filename=calidad_aire.zip");
    headers.set("Content-Type", "application/zip");

    return new NextResponse(stream as unknown as BodyInit, {
      headers,
    });
  } catch (error) {
    console.error("Error generating CSV:", error);
    return new NextResponse(JSON.stringify({ error: "Error generating CSV" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
