import fetch from 'node-fetch'; // or global fetch in Node 18+

const SENTIMENT_SERVICE_URL = process.env.SENTIMENT_SERVICE_URL || 'http://127.0.0.1:8000';

// Mock transcripts with accurate timestamps & chapters for demo videos
const MOCK_DEMO_TRANSCRIPTS = {
  vid1: {
    chapters: [
      { id: 'ch1', title: 'Introduction & Historical Context', start: 0, end: 105, startStr: '00:00', endStr: '01:45' },
      { id: 'ch2', title: 'Newton vs Einstein: What is Gravity?', start: 105, end: 230, startStr: '01:45', endStr: '03:50' },
      { id: 'ch3', title: 'Equivalence Principle & Mass Types', start: 230, end: 370, startStr: '03:50', endStr: '06:10' },
      { id: 'ch4', title: 'Magnetic Levitation vs True Antigravity', start: 370, end: 510, startStr: '06:10', endStr: '08:30' },
      { id: 'ch5', title: 'Negative Mass & Stress-Energy Tensor', start: 510, end: 645, startStr: '08:30', endStr: '10:45' },
      { id: 'ch6', title: 'The Bondi Runway Effect Paradox', start: 645, end: 730, startStr: '10:45', endStr: '12:10' },
      { id: 'ch7', title: 'CERN ALPHA-g Antimatter Gravity Experiment', start: 730, end: 820, startStr: '12:10', endStr: '13:40' },
      { id: 'ch8', title: 'Engineering Bottlenecks & Future Outlook', start: 820, end: 872, startStr: '13:40', endStr: '14:32' },
    ],
    transcript: [
      { start: 0.0, duration: 4.5, text: "For centuries, humanity has dreamed of overcoming the fundamental grip of gravity." },
      { start: 4.6, duration: 5.2, text: "From mythological flight to modern sci-fi hovercraft, the concept of antigravity captivates our imagination." },
      { start: 9.9, duration: 6.0, text: "In this episode of Antigravity Studio, we dive deep into the theoretical physics of spacetime and repulsive gravity." },
      { start: 105.0, duration: 5.8, text: "To understand how to negate gravity, we must first understand what Einstein discovered in 1915." },
      { start: 111.0, duration: 6.5, text: "Gravity is not merely a Newtonian pulling force; it is the curvature of four-dimensional spacetime caused by energy." },
      { start: 230.0, duration: 5.4, text: "At 03:50, let us look at the equivalence principle between inertial mass and gravitational mass." },
      { start: 255.0, duration: 6.1, text: "Passive gravitational mass dictates how strongly an object responds to a gravitational field." },
      { start: 370.0, duration: 6.8, text: "Many laboratory demonstrations show flux pinning and quantum levitation in Type II superconductors." },
      { start: 415.0, duration: 7.2, text: "However, magnetic repulsion is electromagnetic, not gravitational manipulation. Shielding spacetime curvature requires different mechanisms." },
      { start: 510.0, duration: 6.5, text: "General relativity describes gravity using Einstein's field equations and the Stress-Energy Tensor T_mu_nu." },
      { start: 550.0, duration: 7.0, text: "If exotic matter with negative mass or negative energy density existed, it would produce repulsive gravitational curvature." },
      { start: 645.0, duration: 6.4, text: "Hermann Bondi in 1957 calculated the runway effect: positive and negative mass pairs accelerating endlessly without violating momentum conservation." },
      { start: 730.0, duration: 7.1, text: "At CERN, the ALPHA-g experiment measured whether antimatter falls up or down. Results confirmed antimatter falls down towards Earth." },
      { start: 820.0, duration: 6.2, text: "While theoretical equations permit negative energy states in quantum squeezing, macroscopic engineering hurdles remain formidable." },
      { start: 855.0, duration: 5.5, text: "Thank you for watching Antigravity Studio. Don't forget to like and subscribe for more deep dives into frontier physics." }
    ]
  },
  vid2: {
    chapters: [
      { id: 'ch1', title: 'Discovery of Kepler-186f (Earth 2.0)', start: 0, end: 180, startStr: '00:00', endStr: '03:00' },
      { id: 'ch2', title: 'Red Dwarf Star M-Dwarf Environment', start: 180, end: 420, startStr: '03:00', endStr: '07:00' },
      { id: 'ch3', title: 'Habitable Zone & Liquid Water Potential', start: 420, end: 660, startStr: '07:00', endStr: '11:00' },
      { id: 'ch4', title: 'Tidal Locking & Atmospheric Circulation', start: 660, end: 900, startStr: '11:00', endStr: '15:00' },
      { id: 'ch5', title: 'Possibility of Alien Photosynthesis & Biospheres', start: 900, end: 1090, startStr: '15:00', endStr: '18:10' },
    ],
    transcript: [
      { start: 0.0, duration: 5.0, text: "500 light years away in the constellation Cygnus lies Kepler-186f, the first validated Earth-sized planet in a habitable zone." },
      { start: 5.2, duration: 6.5, text: "What would human exploration look like on this distant alien world? Let's examine the planetary science." },
      { start: 180.0, duration: 7.0, text: "Kepler-186f orbits an M-type red dwarf star, receiving about one-third of the stellar energy Earth receives from the Sun." },
      { start: 420.0, duration: 6.8, text: "Its equilibrium temperature places it right at the outer edge of liquid water stability." },
      { start: 660.0, duration: 7.5, text: "Tidal locking could create perpetual day and night hemispheres with an active atmospheric circulatory convection current." },
      { start: 900.0, duration: 6.4, text: "Plants on Kepler-186f might absorb infrared photons rather than visible light, appearing dark red or black rather than green." },
      { start: 1050.0, duration: 5.2, text: "Stay tuned as next-generation space telescopes prepare for atmospheric spectroscopy of exoplanetary biospheres." }
    ]
  },
  vid3: {
    chapters: [
      { id: 'ch1', title: 'The Alcubierre Metric (1994)', start: 0, end: 195, startStr: '00:00', endStr: '03:15' },
      { id: 'ch2', title: 'Warp Bubbles & Expanding Spacetime', start: 195, end: 400, startStr: '03:15', endStr: '06:40' },
      { id: 'ch3', title: 'Exotic Matter & Negative Energy Problem', start: 400, end: 620, startStr: '06:40', endStr: '10:20' },
      { id: 'ch4', title: 'White-Juday Warp Field Interferometer', start: 620, end: 780, startStr: '10:20', endStr: '13:00' },
      { id: 'ch5', title: 'Physical Obstacles: Hawking Radiation & Cosmic Debris', start: 780, end: 945, startStr: '13:00', endStr: '15:45' },
    ],
    transcript: [
      { start: 0.0, duration: 5.0, text: "In 1994, Mexican theoretical physicist Miguel Alcubierre proposed a mathematical solution to Einstein's equations that seemed straight out of Star Trek." },
      { start: 5.5, duration: 6.0, text: "Rather than accelerating a spacecraft through space, what if you compressed spacetime in front and expanded it behind?" },
      { start: 195.0, duration: 6.5, text: "Locally within the warp bubble, the ship remains stationary in flat spacetime, experiencing zero g-forces and no time dilation." },
      { start: 400.0, duration: 7.0, text: "The primary challenge: creating the warp bubble requires negative energy density, violating the classical weak energy condition." },
      { start: 620.0, duration: 6.8, text: "Recent optimizations by Erik Lentz and Harold White reduced the hypothetical exotic mass requirement from the mass of Jupiter down to microscopic scales." },
      { start: 780.0, duration: 6.2, text: "However, blue-shifted Hawking radiation and interstellar debris accumulated along the bubble wall present formidable challenges when dropping out of warp." },
      { start: 900.0, duration: 5.5, text: "Warp drive physics remains one of the most intriguing theoretical crossroads between general relativity and quantum mechanics." }
    ]
  },
  vid4: {
    chapters: [
      { id: 'ch1', title: 'Schwarzschild vs Rotating Kerr Geometry', start: 0, end: 170, startStr: '00:00', endStr: '02:50' },
      { id: 'ch2', title: 'The Ergosphere & Penrose Energy Extraction', start: 170, end: 390, startStr: '02:50', endStr: '06:30' },
      { id: 'ch3', title: 'Passing the Outer Event Horizon', start: 390, end: 585, startStr: '06:30', endStr: '09:45' },
      { id: 'ch4', title: 'Inner Cauchy Horizon Instability (Mass Inflation)', start: 585, end: 790, startStr: '09:45', endStr: '13:10' },
      { id: 'ch5', title: 'The Ring Singularity & Theoretical Wormholes', start: 790, end: 980, startStr: '13:10', endStr: '16:20' },
    ],
    transcript: [
      { start: 0.0, duration: 5.5, text: "Real astrophysical black holes aren't static spheres; they spin at immense relativistic velocities." },
      { start: 6.0, duration: 6.0, text: "In 1963, Roy Kerr found the exact mathematical solution for spinning black holes, revealing a far weirder realm than Schwarzschild ever imagined." },
      { start: 170.0, duration: 7.2, text: "Outside the event horizon lies the ergosphere, where frame-dragging forces spacetime to rotate faster than the speed of light." },
      { start: 250.0, duration: 6.5, text: "Through the Penrose process, advanced civilizations could theoretically extract rotational energy from the ergosphere with 29% efficiency." },
      { start: 390.0, duration: 6.8, text: "Crossing the outer event horizon isn't immediately lethal for supermassive Kerr black holes due to gentle tidal gravitational gradients." },
      { start: 585.0, duration: 7.0, text: "Yet, approaching the inner Cauchy horizon, ingalling radiation piles up into a infinite blueshift known as mass inflation, potentially creating a lethal firewall." },
      { start: 790.0, duration: 6.5, text: "At the very center lies not a point singularity, but a 1-dimensional ring singularity. Passing through the ring leads mathematically to negative space or another universe." }
    ]
  },
  vid5: {
    chapters: [
      { id: 'ch1', title: 'Where Are They? The Fermi Paradox', start: 0, end: 180, startStr: '00:00', endStr: '03:00' },
      { id: 'ch2', title: 'Axioms of Cosmic Sociology (Survival & Expansion)', start: 180, end: 375, startStr: '03:00', endStr: '06:15' },
      { id: 'ch3', title: 'Chains of Suspicion & Technological Explosions', start: 375, end: 570, startStr: '06:15', endStr: '09:30' },
      { id: 'ch4', title: 'Why Broadcasting METI May Be Dangerous', start: 570, end: 765, startStr: '09:30', endStr: '12:45' },
      { id: 'ch5', title: 'Critiques & Alternative Solutions to the Paradox', start: 765, end: 910, startStr: '12:45', endStr: '15:10' },
    ],
    transcript: [
      { start: 0.0, duration: 5.2, text: "Enrico Fermi famously asked: If intelligent life is common across billions of stars, where is everybody?" },
      { start: 5.5, duration: 6.5, text: "Of all answers to the Fermi paradox, the Dark Forest theory is arguably the most chilling and mathematically rigorous." },
      { start: 180.0, duration: 6.8, text: "Rooted in game theory, the hypothesis posits two basic axioms: survival is the primary need of civilization, and civilization continuously grows while matter in the universe remains constant." },
      { start: 375.0, duration: 7.2, text: "Separated by vast light-year chasms, civilizations face an unbreakable chain of suspicion. You cannot know if the other civilization is benevolent or malevolent." },
      { start: 570.0, duration: 6.9, text: "Because technological explosions can turn a primitive culture into a galaxy-spanning threat within a cosmological blink of an eye, the game-theoretic optimum is absolute silence." },
      { start: 765.0, duration: 6.4, text: "Any civilization that reveals its celestial coordinates risks preemptive strike from silent apex observers lurking in the dark." },
      { start: 870.0, duration: 5.0, text: "Is our cosmic neighborhood truly a dark forest, or are we simply listening on the wrong frequencies?" }
    ]
  }
};

// Helper to convert mm:ss or hh:mm:ss to total seconds
const parseTimestampToSeconds = (tsStr) => {
  const parts = tsStr.trim().split(':').map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return null;
};

// Extract timestamps from comment text and correlate with chapters
export const extractTimestampSentiments = (comments = [], chapters = []) => {
  if (!chapters || chapters.length === 0) return [];

  // Initialize chapter stats
  const chapterStats = chapters.map(ch => ({
    ...ch,
    positive_count: 0,
    neutral_count: 0,
    negative_count: 0,
    total_mentions: 0,
    matched_comments: []
  }));

  const timestampRegex = /\b(?:at\s+|@\s*|timestamp\s*:?\s*)?(\d{1,2}:\d{2}(?::\d{2})?)\b/gi;

  comments.forEach(comment => {
    const text = comment.text || '';
    const matches = [...text.matchAll(timestampRegex)];
    
    if (matches && matches.length > 0) {
      matches.forEach(match => {
        const timeStr = match[1];
        const seconds = parseTimestampToSeconds(timeStr);

        if (seconds !== null) {
          // Find matching chapter
          const targetChapter = chapterStats.find(ch => seconds >= ch.start && seconds <= ch.end);
          if (targetChapter) {
            const label = comment.sentiment?.label?.toUpperCase() || 'NEUTRAL';
            targetChapter.total_mentions += 1;
            
            if (label.includes('POS')) {
              targetChapter.positive_count += 1;
            } else if (label.includes('NEG')) {
              targetChapter.negative_count += 1;
            } else {
              targetChapter.neutral_count += 1;
            }

            targetChapter.matched_comments.push({
              id: comment.id,
              author: comment.author,
              authorAvatar: comment.authorAvatar,
              text: comment.text,
              timestamp_referenced: timeStr,
              sentiment: comment.sentiment,
              likes: comment.likes || 0
            });
          }
        }
      });
    }
  });

  // Calculate sentiment distribution & health score per chapter
  return chapterStats.map(ch => {
    const total = ch.total_mentions;
    const posPct = total > 0 ? Math.round((ch.positive_count / total) * 100) : 0;
    const neuPct = total > 0 ? Math.round((ch.neutral_count / total) * 100) : 0;
    const negPct = total > 0 ? Math.round((ch.negative_count / total) * 100) : 0;
    
    let dominant = 'NEUTRAL';
    if (ch.positive_count > ch.neutral_count && ch.positive_count > ch.negative_count) dominant = 'POSITIVE';
    else if (ch.negative_count > ch.positive_count && ch.negative_count > ch.neutral_count) dominant = 'NEGATIVE';

    return {
      ...ch,
      positive_percentage: posPct,
      neutral_percentage: neuPct,
      negative_percentage: negPct,
      dominant_sentiment: dominant
    };
  });
};

// Get transcript for video (live or mock)
export const getVideoTranscriptData = async (videoId) => {
  if (MOCK_DEMO_TRANSCRIPTS[videoId]) {
    return MOCK_DEMO_TRANSCRIPTS[videoId];
  }

  // Try calling Python microservice
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${SENTIMENT_SERVICE_URL}/transcript?videoId=${videoId}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return {
        chapters: [],
        transcript: data.transcript || []
      };
    }
  } catch (err) {
    console.warn(`Could not fetch live transcript for ${videoId}:`, err.message);
  }

  return {
    chapters: [],
    transcript: []
  };
};
