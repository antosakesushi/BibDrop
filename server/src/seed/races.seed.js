import "dotenv/config";
import { connectDB } from "../db.js";
import { Race } from "../models/Race.js";
import mongoose from "mongoose";

// This registry gives each race its IDENTITY (name, official site, course
// character) - not its current registration data. Registration events are
// populated live by the research agent (see routes/research.js), which is
// the whole point of the product: dates and windows change yearly and
// should come from the agent researching the live page, not from a
// hardcoded list that goes stale.
//
// I compiled this list from general knowledge of well-known marathons, not
// a live check of each race's current official URL - spot-check the
// `officialUrl` values before relying on them, since race sites do change
// domains occasionally. The Sydney Marathon's status as a "World Major" in
// particular is a recent development worth double-checking against current
// World Marathon Majors materials rather than taking on my word.
const RACES = [
  // --- World Marathon Majors ---
  { name: "Boston Marathon", slug: "boston", officialUrl: "https://www.baa.org", city: "Boston", country: "USA", isWorldMajor: true, courseType: "point_to_point", season: "spring", tags: ["world-major", "qualifying-time-required"] },
  { name: "London Marathon", slug: "london", officialUrl: "https://www.tcslondonmarathon.com", city: "London", country: "UK", isWorldMajor: true, courseType: "loop", season: "spring", tags: ["world-major", "lottery"] },
  { name: "Berlin Marathon", slug: "berlin", officialUrl: "https://www.bmw-berlin-marathon.com", city: "Berlin", country: "Germany", isWorldMajor: true, courseType: "flat_fast", season: "fall", tags: ["world-major", "bq-friendly", "lottery"] },
  { name: "Chicago Marathon", slug: "chicago", officialUrl: "https://www.chicagomarathon.com", city: "Chicago", country: "USA", isWorldMajor: true, courseType: "flat_fast", season: "fall", tags: ["world-major", "bq-friendly", "lottery"] },
  { name: "New York City Marathon", slug: "nyc", officialUrl: "https://www.tcsnycmarathon.org", city: "New York", country: "USA", isWorldMajor: true, courseType: "rolling", season: "fall", tags: ["world-major", "lottery", "destination"] },
  { name: "Tokyo Marathon", slug: "tokyo", officialUrl: "https://www.marathon.tokyo", city: "Tokyo", country: "Japan", isWorldMajor: true, courseType: "flat_fast", season: "spring", tags: ["world-major", "lottery", "destination"] },
  { name: "Sydney Marathon", slug: "sydney", officialUrl: "https://sydneymarathon.com", city: "Sydney", country: "Australia", isWorldMajor: true, courseType: "rolling", season: "summer", tags: ["world-major", "destination"] },

  // --- BQ-friendly / fast US courses ---
  { name: "California International Marathon", slug: "cim", officialUrl: "https://www.runsra.org/cim", city: "Sacramento", country: "USA", courseType: "point_to_point", season: "winter", tags: ["bq-friendly"] },
  { name: "Grandma's Marathon", slug: "grandmas", officialUrl: "https://www.grandmasmarathon.com", city: "Duluth", country: "USA", courseType: "point_to_point", season: "summer", tags: ["bq-friendly"] },
  { name: "Houston Marathon", slug: "houston", officialUrl: "https://www.chevronhoustonmarathon.com", city: "Houston", country: "USA", courseType: "flat_fast", season: "winter", tags: ["bq-friendly"] },
  { name: "Eugene Marathon", slug: "eugene", officialUrl: "https://www.eugenemarathon.com", city: "Eugene", country: "USA", courseType: "rolling", season: "spring", tags: ["bq-friendly"] },
  { name: "Erie Marathon at Presque Isle", slug: "erie", officialUrl: "https://eriemarathon.com", city: "Erie", country: "USA", courseType: "flat_fast", season: "fall", tags: ["bq-friendly"] },
  { name: "Indianapolis Monumental Marathon", slug: "monumental", officialUrl: "https://www.monumentalmarathon.com", city: "Indianapolis", country: "USA", courseType: "flat_fast", season: "fall", tags: ["bq-friendly"] },
  { name: "Richmond Marathon", slug: "richmond", officialUrl: "https://www.richmondmarathon.org", city: "Richmond", country: "USA", courseType: "rolling", season: "fall", tags: ["bq-friendly"] },
  { name: "Philadelphia Marathon", slug: "philadelphia", officialUrl: "https://www.philadelphiamarathon.com", city: "Philadelphia", country: "USA", courseType: "rolling", season: "fall", tags: ["bq-friendly"] },
  { name: "Rocket City Marathon", slug: "rocket-city", officialUrl: "https://rocketcitymarathon.com", city: "Huntsville", country: "USA", courseType: "flat_fast", season: "winter", tags: ["bq-friendly"] },
  { name: "Revel Big Cottonwood Marathon", slug: "revel-big-cottonwood", officialUrl: "https://revelraceseries.com", city: "Salt Lake City", country: "USA", courseType: "point_to_point", season: "summer", tags: ["bq-friendly", "downhill"] },
  { name: "Baystate Marathon", slug: "baystate", officialUrl: "https://www.baystatemarathon.com", city: "Lowell", country: "USA", courseType: "flat_fast", season: "fall", tags: ["bq-friendly"] },
  { name: "Steamtown Marathon", slug: "steamtown", officialUrl: "https://steamtownmarathon.com", city: "Scranton", country: "USA", courseType: "point_to_point", season: "fall", tags: ["bq-friendly", "downhill"] },

  // --- International destination races ---
  { name: "Paris Marathon", slug: "paris", officialUrl: "https://www.schneiderelectricparismarathon.com", city: "Paris", country: "France", courseType: "flat_fast", season: "spring", tags: ["destination", "bq-friendly"] },
  { name: "Amsterdam Marathon", slug: "amsterdam", officialUrl: "https://tcsamsterdammarathon.nl", city: "Amsterdam", country: "Netherlands", courseType: "flat_fast", season: "fall", tags: ["destination", "bq-friendly"] },
  { name: "Valencia Marathon", slug: "valencia", officialUrl: "https://www.valenciaciudaddelrunning.com", city: "Valencia", country: "Spain", courseType: "flat_fast", season: "winter", tags: ["destination", "bq-friendly"] },
  { name: "Rotterdam Marathon", slug: "rotterdam", officialUrl: "https://nnmarathonrotterdam.org", city: "Rotterdam", country: "Netherlands", courseType: "flat_fast", season: "spring", tags: ["destination", "bq-friendly"] },
  { name: "Prague Marathon", slug: "prague", officialUrl: "https://www.runczech.com", city: "Prague", country: "Czech Republic", courseType: "flat_fast", season: "spring", tags: ["destination"] },
  { name: "Athens Authentic Marathon", slug: "athens", officialUrl: "https://www.athensauthenticmarathon.gr", city: "Athens", country: "Greece", courseType: "hilly", season: "fall", tags: ["destination", "historic"] },

  // --- Charity / high-demand US races ---
  { name: "Marine Corps Marathon", slug: "marine-corps", officialUrl: "https://www.marinemarathon.com", city: "Washington, D.C.", country: "USA", courseType: "rolling", season: "fall", tags: ["lottery", "charity-heavy"] },
  { name: "Big Sur International Marathon", slug: "big-sur", officialUrl: "https://www.bigsurmarathon.org", city: "Big Sur", country: "USA", courseType: "hilly", season: "spring", tags: ["destination", "scenic"] },
  { name: "Disney Marathon Weekend", slug: "disney", officialUrl: "https://www.rundisney.com", city: "Orlando", country: "USA", courseType: "loop", season: "winter", tags: ["charity-heavy", "high-demand"] },
];

async function seed() {
  await connectDB();
  let created = 0;
  let skipped = 0;

  for (const race of RACES) {
    const exists = await Race.findOne({ slug: race.slug });
    if (exists) {
      skipped += 1;
      continue;
    }
    await Race.create(race);
    created += 1;
  }

  console.log(`[seed] done - ${created} races created, ${skipped} already existed.`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
