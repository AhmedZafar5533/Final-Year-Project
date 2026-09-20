import os
import json
import subprocess
from transformers import pipeline

node_script = """
import { getMockComments, mockVideos } from '../backend/config/mockYoutubeData.js';

const vid1 = getMockComments('vid1', 100);
const vid2 = getMockComments('vid2', 100);

console.log(JSON.stringify({
  videos: mockVideos,
  vid1_comments: vid1.comments,
  vid2_comments: vid2.comments
}));
"""

with open("temp_export.mjs", "w", encoding="utf-8") as f:
    f.write(node_script)

res = subprocess.run(["node", "temp_export.mjs"], capture_output=True, text=True, encoding="utf-8")
if os.path.exists("temp_export.mjs"):
    os.remove("temp_export.mjs")

if res.returncode != 0:
    print("Error executing node script:", res.stderr)
    exit(1)

data = json.loads(res.stdout)
vid1_info = data["videos"][0]
vid2_info = data["videos"][1]
vid1_comments = data["vid1_comments"]
vid2_comments = data["vid2_comments"]

MODEL_NAME = "cardiffnlp/twitter-roberta-base-sentiment-latest"
print(f"Loading 3-class Sentiment Model ({MODEL_NAME})...")
nlp = pipeline(
    "sentiment-analysis",
    model=MODEL_NAME,
    tokenizer=MODEL_NAME,
    local_files_only=True,
    top_k=None
)

def analyze_video_comments(video_info, comments):
    texts = [c["text"].replace("<br/>", " ")[:512] for c in comments]
    results = nlp(texts)
    
    pos_count = 0
    neu_count = 0
    neg_count = 0
    analyzed = []
    
    for c, r in zip(comments, results):
        top_pred = max(r, key=lambda x: x["score"])
        label = top_pred["label"].upper()
        confidence = round(top_pred["score"], 4)
        
        if "POS" in label:
            pos_count += 1
        elif "NEU" in label:
            neu_count += 1
        else:
            neg_count += 1
            
        clean_item = dict(c)
        clean_item["text"] = c["text"].replace("<br/>", " ")
        clean_item["sentiment"] = {
            "label": label,
            "confidence": confidence,
            "scores": {item["label"].upper(): round(item["score"], 4) for item in r}
        }
        analyzed.append(clean_item)
        
    total = len(analyzed)
    pos_pct = round((pos_count / total) * 100, 1) if total > 0 else 0.0
    neu_pct = round((neu_count / total) * 100, 1) if total > 0 else 0.0
    neg_pct = round((neg_count / total) * 100, 1) if total > 0 else 0.0
    
    pos_comments = [c for c in analyzed if "POS" in c["sentiment"]["label"]]
    neu_comments = [c for c in analyzed if "NEU" in c["sentiment"]["label"]]
    neg_comments = [c for c in analyzed if "NEG" in c["sentiment"]["label"]]
    
    pos_comments.sort(key=lambda x: (x.get("likes", 0), x["sentiment"]["confidence"]), reverse=True)
    neu_comments.sort(key=lambda x: (x.get("likes", 0), x["sentiment"]["confidence"]), reverse=True)
    neg_comments.sort(key=lambda x: (x.get("likes", 0), x["sentiment"]["confidence"]), reverse=True)
    
    return {
        "video_id": video_info["id"],
        "title": video_info["title"],
        "total_comments": total,
        "positive_count": pos_count,
        "neutral_count": neu_count,
        "negative_count": neg_count,
        "positive_percentage": pos_pct,
        "neutral_percentage": neu_pct,
        "negative_percentage": neg_pct,
        "top_positive": pos_comments[:5],
        "top_neutral": neu_comments[:5],
        "top_negative": neg_comments[:5],
        "all_analyzed": analyzed
    }

print(f"\nAnalyzing Video 1: {vid1_info['title']} (100 comments)...")
v1_res = analyze_video_comments(vid1_info, vid1_comments)

print(f"Analyzing Video 2: {vid2_info['title']} (100 comments)...")
v2_res = analyze_video_comments(vid2_info, vid2_comments)

combined_output = {
    "video_1": v1_res,
    "video_2": v2_res
}

with open("demo_batch_sentiment_results.json", "w", encoding="utf-8") as f:
    json.dump(combined_output, f, indent=2)

print("\n================ 3-CLASS SENTIMENT BATCH RESULTS ================")
print(f"Video 1 [{v1_res['title']}]:")
print(f"  Positive: {v1_res['positive_count']} ({v1_res['positive_percentage']}%)")
print(f"  Neutral : {v1_res['neutral_count']} ({v1_res['neutral_percentage']}%)")
print(f"  Negative: {v1_res['negative_count']} ({v1_res['negative_percentage']}%)")

print(f"\nVideo 2 [{v2_res['title']}]:")
print(f"  Positive: {v2_res['positive_count']} ({v2_res['positive_percentage']}%)")
print(f"  Neutral : {v2_res['neutral_count']} ({v2_res['neutral_percentage']}%)")
print(f"  Negative: {v2_res['negative_count']} ({v2_res['negative_percentage']}%)")
