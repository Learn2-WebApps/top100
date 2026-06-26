import path from "path";
import fs from "fs";
import ChallengeApp from "./ChallengeApp";
import type { QuestionsData } from "@/types";

function loadQuestions(): QuestionsData {
  const filePath = path.join(process.cwd(), "..", "web_data", "questions.json");
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as QuestionsData;
}

export default function Home() {
  const data = loadQuestions();
  return <ChallengeApp data={data} />;
}
