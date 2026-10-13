// Shared, browser-safe experiment content for the OceanX Learning Journey prototype.
// Lesson and quiz are original sample content written for this demonstration.

export type SortChoice = "recycle" | "compost" | "bin";

export const SORT_OPTIONS: { id: SortChoice; label: string }[] = [
  { id: "recycle", label: "Recycling bin" },
  { id: "compost", label: "Compost" },
  { id: "bin", label: "General waste" },
];

export interface SortItem {
  id: string;
  name: string;
  hint: string;
  correct: SortChoice;
  feedback: string;
}

export const SORT_ITEMS: SortItem[] = [
  {
    id: "bottle",
    name: "Empty plastic bottle",
    hint: "You just finished the water inside.",
    correct: "recycle",
    feedback:
      "Clean, empty plastic bottles can usually be recycled and turned into new products.",
  },
  {
    id: "apple",
    name: "Apple core",
    hint: "Leftover from a snack.",
    correct: "compost",
    feedback:
      "Food scraps belong in compost, where they break down naturally into soil.",
  },
  {
    id: "crisps",
    name: "Empty crisp packet",
    hint: "Shiny on the inside.",
    correct: "bin",
    feedback:
      "Foil-lined packets usually can't be recycled. Never drop them: street drains can carry litter to rivers and the sea.",
  },
];

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
}

export const QUIZ: QuizQuestion[] = [
  {
    id: "q1",
    question: "Litter dropped on the street can reach the ocean mainly because…",
    options: [
      "The wind blows most of it there",
      "Rain washes it into drains that lead to rivers and the sea",
      "Birds carry it there",
    ],
    correctIndex: 1,
  },
  {
    id: "q2",
    question: "Why is plastic in the ocean dangerous for sea animals?",
    options: [
      "They can mistake it for food or get tangled in it",
      "It makes the water too cold",
      "It makes the water taste salty",
    ],
    correctIndex: 0,
  },
  {
    id: "q3",
    question: "Which everyday habit helps the ocean most?",
    options: [
      "Leaving the tap running while brushing teeth",
      "Using a reusable bottle instead of single-use plastic",
      "Taking a new plastic bag every shopping trip",
    ],
    correctIndex: 1,
  },
];

export const LESSON_TITLE = "Where Does Plastic Go?";

export const LESSON_SECTIONS: { heading: string; body: string }[] = [
  {
    heading: "It starts on the street",
    body: "A plastic wrapper dropped on the pavement doesn't just stay there. Wind pushes it along the ground, and the next rain washes it towards the nearest street drain.",
  },
  {
    heading: "Into the drains",
    body: "Street drains aren't filters. In many towns, water from drains flows into streams and rivers — carrying small pieces of litter along with it.",
  },
  {
    heading: "Down the river",
    body: "Rivers act like conveyor belts. A bottle dropped far inland can travel for weeks, slowly breaking into smaller and smaller pieces called microplastics.",
  },
  {
    heading: "Out to sea",
    body: "Most rivers end in the ocean. There, plastic can drift for years. Sea turtles mistake bags for jellyfish, and seabirds feed tiny pieces to their chicks. The good news: every piece we bin, recycle or avoid is one piece that never makes this journey.",
  },
];

export const ACTIVITY_TITLE = "Plastic Detective";

export const ACTIVITY_STEPS: string[] = [
  "With an adult, walk around your home and find two or three objects made of plastic.",
  "Pick ONE of them and choose an action: reuse it, refill it, or swap it for something that isn't single-use plastic.",
  "Come back and write one or two sentences about what you found and what you chose to do.",
];

export const NEXT_MODULE_TITLE = "Ocean Habitats";

export const HABITATS: { name: string; fact: string }[] = [
  {
    name: "Coral Reefs",
    fact: "Reefs cover less than 1% of the ocean floor but are home to about a quarter of all sea life. Keeping pollution out of rivers helps keep reefs healthy.",
  },
  {
    name: "Kelp Forests",
    fact: "Giant kelp can grow half a metre in a single day. These underwater forests shelter fish, sea otters and seals.",
  },
  {
    name: "The Open Ocean",
    fact: "Far from land, currents gather into huge slow whirlpools called gyres. Floating plastic collects there too — which is why stopping litter at the source matters so much.",
  },
  {
    name: "The Deep Sea",
    fact: "Sunlight never reaches the deep sea, yet scientists have found plastic even there. The deep ocean is still being explored — most of it has never been seen by humans.",
  },
];

export interface SessionSnapshot {
  id: string;
  group: "A" | "B";
  lessonCompletedAt: string | null;
  interactionCompletedAt: string | null;
  interactionAnswers: Record<string, string> | null;
  activityStatus: "completed" | "skipped" | null;
  quizCompletedAt: string | null;
  continuationChoice: "continue" | "finish" | null;
  classifiedStatus: string;
}

export type LearnStage =
  | "lesson"
  | "interaction"
  | "activity"
  | "quiz"
  | "decision"
  | "finished"
  | "continued";

export function deriveStage(s: SessionSnapshot): LearnStage {
  if (s.continuationChoice === "finish") return "finished";
  if (s.continuationChoice === "continue") return "continued";
  if (s.quizCompletedAt) return "decision";
  if (s.group === "B") {
    if (s.activityStatus) return "quiz";
    if (s.interactionCompletedAt) return "activity";
  } else if (s.interactionCompletedAt) {
    return "quiz";
  }
  if (s.lessonCompletedAt) return "interaction";
  return "lesson";
}
