"""Seed data for the Beyond Boundaries MVP.

EVERYTHING IN THIS FILE IS ILLUSTRATIVE SAMPLE DATA, created for the
conference demonstration. None of it is a verified statistic. Every record
carries source_type="sample" so the interface can label it clearly.

To load real figures, insert rows into `district_metrics` with
source_type="verified" and a source_note naming the survey / programme the
numbers come from. Verified rows always take priority over sample rows.
"""

SAMPLE_NOTE = "Illustrative sample for MVP demonstration - not a verified statistic"

# District ids match the `id` property in public/static/data/balochistan-districts.geojson
# Fields:
#   connectivity  - illustrative digital-access index, 0-100
#   learners      - girls enrolled in digital-skills training (sample)
#   earning       - girls earning online at least once in the last 6 months (sample)
#   mentors       - active mentors available to the district (sample)
#   hubs          - training / co-working access points (sample)
DISTRICTS = [
    # id,               name,              region,        connectivity, learners, earning, mentors, hubs
    ("quetta",          "Quetta",          "Central",     78, 1840, 340, 64, 11),
    ("pishin",          "Pishin",          "North",       52,  410,  45, 12,  3),
    ("qilla-abdullah",  "Qilla Abdullah",  "North",       41,  205,  22,  5,  1),
    ("ziarat",          "Ziarat",          "North",       46,  120,  17,  4,  1),
    ("qilla-saifullah", "Qilla Saifullah", "North",       33,  132,  12,  3,  1),
    ("zhob",            "Zhob",            "North",       38,  198,  14,  5,  1),
    ("musakhel",        "Musakhel",        "North",       21,   54,   4,  1,  0),
    ("loralai",         "Loralai",         "North",       44,  286,  52,  8,  2),
    ("barkhan",         "Barkhan",         "East",        24,   71,   6,  2,  0),
    ("kohlu",           "Kohlu",           "East",        18,   48,   3,  1,  0),
    ("dera-bugti",      "Dera Bugti",      "East",        17,   52,   3,  1,  0),
    ("sibi",            "Sibi",            "East",        49,  264,  27,  9,  2),
    ("kachhi",          "Kachhi",          "East",        29,  118,  11,  3,  1),
    ("nasirabad",       "Nasirabad",       "East",        43,  302,  44,  7,  2),
    ("jafarabad",       "Jafarabad",       "East",        45,  288,  25,  7,  2),
    ("jhal-magsi",      "Jhal Magsi",      "East",        22,   66,   7,  1,  0),
    ("mastung",         "Mastung",         "Central",     55,  346,  41, 11,  2),
    ("kalat",           "Kalat",           "Central",     36,  164,  17,  4,  1),
    ("khuzdar",         "Khuzdar",         "Central",     47,  512,  88, 14,  3),
    ("nushki",          "Nushki",          "West",        39,  142,  22,  4,  1),
    ("chagai",          "Chagai",          "West",        23,   88,   7,  2,  0),
    ("kharan",          "Kharan",          "West",        27,  101,   6,  2,  1),
    ("panjgur",         "Panjgur",         "Makran",      34,  176,  30,  4,  1),
    ("kech",            "Kech",            "Makran",      51,  624, 118, 16,  3),
    ("gwadar",          "Gwadar",          "Makran",      58,  388,  48, 13,  3),
    ("awaran",          "Awaran",          "Makran",      15,   43,   4,  1,  0),
    ("lasbela",         "Lasbela",         "South",       57,  455,  60, 13,  3),
]

# Fictional personas. Names and stories are invented for demonstration.
PROFILES = [
    {"id": "mahnoor", "name": "Mahnoor", "age": 19, "district": "kech",
     "education": "Intermediate (FSc)", "track": "graphic-design",
     "story": "Designs posters for her college society; now building a brand-identity portfolio on a borrowed laptop.",
     "stage": "Portfolio"},
    {"id": "sabiha", "name": "Sabiha", "age": 22, "district": "kech",
     "education": "BA English", "track": "content-writing",
     "story": "Writes bilingual blog posts for a Karachi agency. First international client in month five.",
     "stage": "Earning"},
    {"id": "zarghuna", "name": "Zarghuna", "age": 20, "district": "pishin",
     "education": "Matric + DigiSkills", "track": "translation",
     "story": "Translates health leaflets between Pashto, Urdu and English for NGOs.",
     "stage": "Applying"},
    {"id": "hani", "name": "Hani", "age": 24, "district": "gwadar",
     "education": "BS Computer Science", "track": "web-development",
     "story": "Builds simple storefronts for fishing co-ops and hotels along the coast.",
     "stage": "Earning"},
    {"id": "gul-bano", "name": "Gul Bano", "age": 18, "district": "khuzdar",
     "education": "Intermediate (ICS)", "track": "data-annotation",
     "story": "Phone-first learner; labels images for AI datasets in the evenings.",
     "stage": "Learning"},
    {"id": "nazia", "name": "Nazia", "age": 26, "district": "quetta",
     "education": "MBA", "track": "virtual-assistance",
     "story": "Runs calendars and inboxes for two overseas consultants; mentors three newcomers.",
     "stage": "Verified"},
    {"id": "shazia", "name": "Shazia", "age": 21, "district": "lasbela",
     "education": "BA", "track": "social-media",
     "story": "Manages Instagram for a Hub textile shop; learning paid ads.",
     "stage": "Earning"},
    {"id": "palwasha", "name": "Palwasha", "age": 23, "district": "loralai",
     "education": "BSc Mathematics", "track": "online-tutoring",
     "story": "Tutors O-level maths online to students in the Gulf.",
     "stage": "Earning"},
    {"id": "sammi", "name": "Sammi", "age": 17, "district": "panjgur",
     "education": "Matric", "track": "graphic-design",
     "story": "Self-taught on Canva from her phone; first logo sold to a local bakery.",
     "stage": "Applying"},
    {"id": "rukhsana", "name": "Rukhsana", "age": 25, "district": "sibi",
     "education": "BA Economics", "track": "data-analysis",
     "story": "Cleans sales spreadsheets for small businesses; learning SQL.",
     "stage": "Portfolio"},
    {"id": "mehr", "name": "Mehr", "age": 20, "district": "mastung",
     "education": "Intermediate", "track": "video-editing",
     "story": "Edits short reels for local creators using a mobile editor.",
     "stage": "Learning"},
    {"id": "sadia", "name": "Sadia", "age": 22, "district": "nasirabad",
     "education": "BA Urdu", "track": "content-writing",
     "story": "Writes Urdu product descriptions for an online store.",
     "stage": "Applying"},
]

# A complete sample journey used for the "From Skills to Earnings" module and
# the demo dashboard. Months are counted from enrolment.
JOURNEY = {
    "persona": "sabiha",
    "headline": "Sabiha, Kech - from first lesson to first verified international client",
    "note": SAMPLE_NOTE,
    "stages": [
        {"key": "learn", "label": "Learn", "months": "1-2",
         "detail": "DigiSkills content-writing course on a shared phone; 6 hrs/week at the community hub.",
         "evidence": "Course certificate"},
        {"key": "build", "label": "Build", "months": "2-3",
         "detail": "Three bilingual sample articles and a one-page portfolio site.",
         "evidence": "3 portfolio pieces"},
        {"key": "apply", "label": "Apply", "months": "3-4",
         "detail": "28 tailored proposals on two platforms; mentor reviews every fifth one.",
         "evidence": "28 proposals sent"},
        {"key": "earn", "label": "Earn", "months": "4-6",
         "detail": "First paid order from a Karachi agency, then an international repeat client.",
         "evidence": "5 completed orders"},
        {"key": "verify", "label": "Verified", "months": "6",
         "detail": "Earnings and client feedback verified by the programme team.",
         "evidence": "Verified outcome"},
    ],
    # month-by-month metrics (sample)
    "months": [1, 2, 3, 4, 5, 6],
    "learning_hours": [24, 52, 70, 82, 92, 100],
    "portfolio": [0, 1, 3, 3, 4, 5],
    "proposals": [0, 0, 9, 19, 7, 4],
    "orders": [0, 0, 0, 1, 2, 2],
    "earnings_pkr": [0, 0, 0, 8500, 21000, 34000],
}
