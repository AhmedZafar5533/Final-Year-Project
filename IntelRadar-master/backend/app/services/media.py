import os
import uuid
import asyncio
from pathlib import Path
from typing import Dict, Any, List
import yt_dlp
from faster_whisper import WhisperModel

from app.core.config import MEDIA_DIR

# Initialize lightweight Whisper model on CPU with int8 quantization for high-speed local inference
_whisper_model = None

def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        # 'tiny' or 'base' runs in seconds on CPU
        _whisper_model = WhisperModel("tiny", device="cpu", compute_type="int8")
    return _whisper_model

def download_audio_from_youtube(video_url: str) -> Dict[str, Any]:
    """
    Downloads audio track and extracts metadata from a YouTube video URL using yt-dlp.
    """
    file_id = uuid.uuid4().hex[:10]
    output_template = str(MEDIA_DIR / f"{file_id}.%(ext)s")
    
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': output_template,
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '128',
        }],
        'quiet': True,
        'no_warnings': True,
    }
    
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(video_url, download=True)
        title = info.get('title', 'Unknown Title')
        channel = info.get('uploader', 'Unknown Channel')
        duration = info.get('duration', 0)
        description = info.get('description', '')
        
    audio_path = str(MEDIA_DIR / f"{file_id}.mp3")
    
    return {
        "audio_path": audio_path,
        "title": title,
        "channel": channel,
        "duration": duration,
        "description": description[:1000] if description else "",
        "video_url": video_url
    }

async def transcribe_audio_async(audio_path: str) -> Dict[str, Any]:
    """
    Runs faster-whisper locally in a thread pool to transcribe audio with timestamps.
    """
    loop = asyncio.get_event_loop()
    
    def _run_transcription():
        model = get_whisper_model()
        segments, info = model.transcribe(audio_path, beam_size=1, vad_filter=True)
        
        transcript_segments = []
        full_text_parts = []
        
        for segment in segments:
            full_text_parts.append(segment.text.strip())
            transcript_segments.append({
                "start": round(segment.start, 2),
                "end": round(segment.end, 2),
                "text": segment.text.strip()
            })
            
        return {
            "language": info.language,
            "language_probability": round(info.language_probability, 2),
            "duration": round(info.duration, 2),
            "full_transcript": " ".join(full_text_parts),
            "segments": transcript_segments
        }
        
    return await loop.run_in_executor(None, _run_transcription)

async def process_youtube_video(video_url: str) -> Dict[str, Any]:
    """
    End-to-end pipeline: yt-dlp audio download + faster-whisper local speech-to-text.
    """
    loop = asyncio.get_event_loop()
    meta = await loop.run_in_executor(None, download_audio_from_youtube, video_url)
    
    transcription = await transcribe_audio_async(meta["audio_path"])
    
    # Cleanup audio file to save disk space
    try:
        if os.path.exists(meta["audio_path"]):
            os.remove(meta["audio_path"])
    except Exception:
        pass
        
    return {
        "video_url": video_url,
        "title": meta["title"],
        "channel": meta["channel"],
        "duration": meta["duration"],
        "transcript": transcription["full_transcript"],
        "segments": transcription["segments"][:30], # Top 30 timestamped segments
        "language": transcription["language"]
    }
