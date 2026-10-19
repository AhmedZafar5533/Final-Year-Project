import api from "./api";

const ideaResearchService = {
  async list(intelligenceId, signal) {
    return (await api.get("/idea-research", { params: { intelligenceId }, signal })).data.jobs;
  },
  async get(id, signal) {
    return (await api.get("/idea-research/" + id, { signal })).data;
  },
  async start(intelligenceId, ideaKey) {
    return (await api.post("/idea-research", { intelligenceId, ideaKey })).data;
  },
  async refresh(id) {
    return (await api.post("/idea-research/" + id + "/refresh")).data;
  },
};
export default ideaResearchService;
