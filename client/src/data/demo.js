// Explicit UI fixtures. No example date or metric is an assertion about a real race.
const dateIn = (days) =>
  new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
const identities = [
  [
    "berlin",
    "Berlin Marathon",
    "Berlin",
    "Germany",
    "https://www.bmw-berlin-marathon.com",
    "flat_fast",
    "fall",
  ],
  [
    "chicago",
    "Chicago Marathon",
    "Chicago",
    "USA",
    "https://www.chicagomarathon.com",
    "flat_fast",
    "fall",
  ],
  [
    "london",
    "London Marathon",
    "London",
    "UK",
    "https://www.tcslondonmarathon.com",
    "loop",
    "spring",
  ],
  [
    "nyc",
    "New York City Marathon",
    "New York",
    "USA",
    "https://www.tcsnycmarathon.org",
    "rolling",
    "fall",
  ],
  [
    "boston",
    "Boston Marathon",
    "Boston",
    "USA",
    "https://www.baa.org",
    "point_to_point",
    "spring",
  ],
  [
    "valencia",
    "Valencia Marathon",
    "Valencia",
    "Spain",
    "https://www.valenciaciudaddelrunning.com",
    "flat_fast",
    "winter",
  ],
];
export const demoRaces = identities.map(
  ([slug, name, city, country, officialUrl, courseType, season], i) => ({
    slug,
    name,
    city,
    country,
    officialUrl,
    courseType,
    season,
    isDemo: true,
    interestStage: i < 2 ? "watching" : i === 2 ? "interested" : "none",
    lastResearchConfidence: "medium",
    lastResearchedAt: new Date().toISOString(),
    edition: "Example edition",
    raceDate: dateIn(65 + i * 19),
    agentSummary: `Explore ${city} and understand the entry route before adding it to your season. This is a sample research briefing, not verified race advice.`,
    registrationEvents:
      i === 2
        ? []
        : [
            {
              type: i === 1 ? "lottery_close" : "general_entry_open",
              label:
                i === 1
                  ? "Lottery application deadline"
                  : "General entry opening",
              date: dateIn(i === 1 ? 2 : 7 + i * 5),
              dateConfidence: i === 3 ? "estimated" : "confirmed",
              notes:
                "Sample deadline for testing this prototype. Not a real registration date.",
            },
          ],
    profileFacts: [
      {
        key: "course",
        label: "Course profile",
        value: i === 3 ? "Rolling city course" : "Predominantly flat",
        context: "Illustrative research value",
      },
      {
        key: "elevation",
        label: "Elevation gain",
        value: "120 m",
        context: "Illustrative course total",
      },
      {
        key: "weather",
        label: "Historical weather",
        value: "8–14°C",
        context: "Example historical range, not a forecast",
      },
      {
        key: "field",
        label: "Field size",
        value: "30,000 finishers",
        context: "Example past edition",
      },
      {
        key: "bq",
        label: "Boston qualifiers",
        value: i === 2 ? "Not available" : "12% of finishers",
        context: "Example only; not an individual probability",
      },
    ],
    researchSources: [],
  }),
);
