import useIdeaResearch from "./useIdeaResearch";

export default function useScriptResearch(idea, appliedAt) {
  const reference = idea?.researchRef;
  const research = useIdeaResearch(reference?.intelligenceId, reference?.ideaKey);
  const job = research.jobs[reference?.ideaKey];
  return {
    job,
    availableUpdate: Boolean(job?.hasReport && (!appliedAt || new Date(job.completedAt) > new Date(appliedAt))),
  };
}
