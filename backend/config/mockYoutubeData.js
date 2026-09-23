export const mockVideos = [
  {
    id: 'vid1',
    title: 'How Close Are We to Real Antigravity Technology?',
    topic: 'antigravity technology',
    publishDate: '2026-05-15',
    duration: 'PT14M32S',
    views: 1245000,
    likes: 84200,
    dislikes: 1200,
    commentsCount: 100,
    description: 'We dive deep into the theoretical physics of negative mass, general relativity, and the latest laboratory experiments in electrogravity and quantum levitation. Could humanity overcome gravitational forces in our lifetime?',
    thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=640&auto=format&fit=crop&q=80'
  },
  {
    id: 'vid2',
    title: 'Exploring the Kepler-186f Exoplanet (Earth 2.0)',
    topic: 'Kepler-186f',
    publishDate: '2026-05-01',
    duration: 'PT18M10S',
    views: 840000,
    likes: 52100,
    dislikes: 800,
    commentsCount: 100,
    description: 'Kepler-186f is the first validated Earth-size planet to orbit a distant star in its habitable zone. What would it actually look like to walk on its surface under a red dwarf sun?',
    thumbnailUrl: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=640&auto=format&fit=crop&q=80'
  },
  {
    id: 'vid3',
    title: 'The Alcubierre Warp Drive: Faster Than Light Travel?',
    topic: 'warp drive',
    publishDate: '2026-04-18',
    duration: 'PT15M45S',
    views: 980000,
    likes: 76000,
    dislikes: 950,
    commentsCount: 80,
    description: 'Is warp speed actually permitted by Einstein\'s theory of General Relativity? We dissect Miguel Alcubierre\'s 1994 spacetime metric, the requirement for negative energy density, and modern micro-warp bubble experiments.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=640&auto=format&fit=crop&q=80'
  },
  {
    id: 'vid4',
    title: 'What Really Happens If You Fall Into a Kerr Black Hole?',
    topic: 'kerr black hole',
    publishDate: '2026-04-02',
    duration: 'PT16M20S',
    views: 1550000,
    likes: 112000,
    dislikes: 1100,
    commentsCount: 90,
    description: 'Unlike stationary Schwarzschild black holes, rotating Kerr black holes have an ergosphere, a ring singularity, and theoretically allow passage into Cauchy horizons. What does modern physics say about entering a spinning singularity?',
    thumbnailUrl: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=640&auto=format&fit=crop&q=80'
  },
  {
    id: 'vid5',
    title: 'The Fermi Paradox & The Dark Forest Solution',
    topic: 'dark forest theory',
    publishDate: '2026-03-15',
    duration: 'PT15M10S',
    views: 620000,
    likes: 41000,
    dislikes: 1400,
    commentsCount: 75,
    description: 'If the universe is teeming with habitable worlds, where is everybody? We examine Liu Cixin\'s Dark Forest hypothesis, game theory of cosmic survival, and why broadcasting our location might be interstellar suicide.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=640&auto=format&fit=crop&q=80'
  }
];

// Helper to generate realistic dates relative to publishDate
const getDateBetween = (startDateStr, daysAfter = 30) => {
  const start = new Date(startDateStr).getTime();
  const offset = Math.random() * daysAfter * 24 * 60 * 60 * 1000;
  return new Date(start + offset).toISOString();
};

// --- VIDEO 1: 100 UNIQUE COMMENTS (ANTIGRAVITY) ---
const vid1RawComments = [
  // Short (1-20)
  { author: "Elena Rostova", avatarSeed: "ElenaR", text: "Mind-blowing video! The explanation at 4:15 finally made quantum levitation click for me.", likes: 342, replyCount: 8, days: 2 },
  { author: "Marcus Vance", avatarSeed: "MarcusV", text: "Brilliant breakdown. Antigravity Studio never disappoints!", likes: 215, replyCount: 3, days: 5 },
  { author: "Quantum_Surfer", avatarSeed: "Surfer99", text: "Wait, so negative mass really is theoretically allowed by Einstein's equations?", likes: 189, replyCount: 12, days: 1 },
  { author: "Sarah Jenkins", avatarSeed: "SarahJ", text: "Subscribed immediately. The animation quality is insane.", likes: 95, replyCount: 0, days: 3 },
  { author: "David K.", avatarSeed: "DavidK", text: "Me watching this at 2 AM instead of studying for my physics midterms 😅", likes: 512, replyCount: 14, days: 4 },
  { author: "TechExplorer", avatarSeed: "TechEx", text: "Could the Casimir effect be scaled up for macroscopic repulsive forces?", likes: 142, replyCount: 5, days: 6 },
  { author: "Dr. Aris Thorne", avatarSeed: "ArisThorne", text: "Great video! As a condensed matter physicist, I really appreciated your nuance around room-temp superconductors.", likes: 420, replyCount: 9, days: 2 },
  { author: "Claire Bennett", avatarSeed: "ClaireB", text: "The editing at 8:30 was clean AF.", likes: 67, replyCount: 1, days: 7 },
  { author: "CosmicVoyager", avatarSeed: "CosmicV", text: "If we ever crack antigravity, space exploration will change overnight.", likes: 280, replyCount: 4, days: 8 },
  { author: "Brian Peterson", avatarSeed: "BrianP", text: "Awesome job simplifying General Relativity without losing the math.", likes: 88, replyCount: 2, days: 9 },
  { author: "Samantha Wu", avatarSeed: "SamWu", text: "Wait, wouldn't negative mass move TOWARDS you when you push it away?", likes: 310, replyCount: 15, days: 2 },
  { author: "Liam O'Connor", avatarSeed: "LiamOC", text: "This channel is underrated. Deserves 1M subscribers ASAP.", likes: 175, replyCount: 1, days: 10 },
  { author: "AstroNerd99", avatarSeed: "AstroN99", text: "Loved the timestamp breakdown in the description. Very helpful!", likes: 45, replyCount: 0, days: 11 },
  { author: "Prof_Holloway", avatarSeed: "Holloway", text: "I'm assigning this video to my undergraduate physics class this semester.", likes: 630, replyCount: 18, days: 3 },
  { author: "GamerPhysics", avatarSeed: "GamerP", text: "Imagine antigravity hoverboards... 2015 Back to the Future promised us this!", likes: 220, replyCount: 6, days: 12 },
  { author: "Nadia Khan", avatarSeed: "NadiaK", text: "Super clear explanation of the equivalence principle!", likes: 78, replyCount: 0, days: 14 },
  { author: "VectorSpace", avatarSeed: "VectorS", text: "The negative energy density requirement is the real bottleneck here.", likes: 156, replyCount: 7, days: 5 },
  { author: "Kevin Miller", avatarSeed: "KevinM", text: "Can you do a follow-up video on Alcubierre Warp Drives?", likes: 340, replyCount: 11, days: 1 },
  { author: "Laura Martinez", avatarSeed: "LauraM", text: "I had to rewatch 11:20 three times, but now I get it. Wow.", likes: 92, replyCount: 2, days: 13 },
  { author: "Hyperion_01", avatarSeed: "Hyp01", text: "Pure science gold. No clickbait, just solid physics.", likes: 198, replyCount: 3, days: 4 },

  // Medium (21-70)
  { author: "Dr. Julian Hays", avatarSeed: "JulianH", text: "I loved how you discussed electrogravity experiments from the 1950s vs modern quantum field theory. Most popular science creators completely ignore the history of failed attempts, but showing why Biefeld-Brown effect turned out to just be ion wind was crucial context!", likes: 485, replyCount: 14, days: 3 },
  { author: "Maya Lin", avatarSeed: "MayaLin", text: "The distinction between shielding gravity and creating repulsive gravity at 6:45 was spot on. People always confuse magnetic levitation with actual gravitational manipulation. High quality content as always!", likes: 275, replyCount: 6, days: 5 },
  { author: "Chris Gallagher", avatarSeed: "ChrisG", text: "If exotic matter with negative mass requires negative energy densities, wouldn't that violate the Weak Energy Condition? I'd love to hear your thoughts on how quantum field theory allows temporary local violations via quantum squeezing.", likes: 312, replyCount: 19, days: 2 },
  { author: "Aethelgard", avatarSeed: "Aethel", text: "At 10:15 when you showed the stress-energy tensor diagram, everything clicked! General relativity makes so much more sense when you visualize gravity as spacetime curvature rather than a Newtonian pulling force.", likes: 195, replyCount: 4, days: 7 },
  { author: "Jessica Reed", avatarSeed: "JessR", text: "My engineering team is actually researching high-temperature superconducting bearings right now. Flux pinning (quantum levitation) is already being used in flywheel energy storage! Antigravity might be far, but levitation tech is happening right now.", likes: 410, replyCount: 10, days: 4 },
  { author: "Tomasz Nowak", avatarSeed: "TomN", text: "What really blew my mind was the runway effect if you paired positive and negative mass together. Both objects would accelerate indefinitely without violating momentum conservation because total mass is zero! Nature is weird.", likes: 520, replyCount: 22, days: 1 },
  { author: "Rachel Vance", avatarSeed: "RachV", text: "Honestly, the production value on this channel is approaching Kurzgesagt levels. The custom 3D animations of the graviton interaction models were breathtaking.", likes: 165, replyCount: 2, days: 8 },
  { author: "Derek Foster", avatarSeed: "DerekF", text: "Question for anyone in the comments: If an object had negative mass, would light deflect AWAY from it instead of lensing around it? Gravitational repulsive lensing would look insane through a telescope!", likes: 230, replyCount: 9, days: 6 },
  { author: "Priya Sharma", avatarSeed: "PriyaS", text: "I really appreciated that you didn't overpromise. So many YouTube videos title things 'Antigravity Discovered!' when it's just a magnet over liquid nitrogen. Thank you for staying scientifically rigorous.", likes: 380, replyCount: 5, days: 3 },
  { author: "Lucas Dubois", avatarSeed: "LucasD", text: "The breakdown of CERN's ALPHA-g experiment at 12:40 was amazing. Seeing that antimatter actually falls DOWN toward Earth instead of up pretty much ruled out simple antimatter antigravity, right?", likes: 490, replyCount: 16, days: 2 },
  { author: "Oliver Queen", avatarSeed: "OliQ", text: "Does the Casimir effect between conducting plates count as a measurable negative energy density? And if so, why can't we stack micro-cavities to create a net repulsive force?", likes: 145, replyCount: 8, days: 9 },
  { author: "Hannah Abbott", avatarSeed: "HannahA", text: "I'm a high school physics teacher and I just used your segment on the Equivalence Principle in my class today. The students were completely engaged! Thank you for creating such accessible resources.", likes: 310, replyCount: 3, days: 10 },
  { author: "Xavier Dupont", avatarSeed: "XavD", text: "Great video, but I think you slightly understated the engineering difficulties of maintaining stable Cooper pairs in superconductors at scale. Still, a fantastic overview!", likes: 120, replyCount: 7, days: 11 },
  { author: "Sophia Rossi", avatarSeed: "SophR", text: "The intro graphics with the levitating sphere gave me goosebumps! Also, what was the background music track around 5:30? It sounded so futuristic.", likes: 85, replyCount: 4, days: 12 },
  { author: "Marcus Aurelius", avatarSeed: "MarcAur", text: "If we ever build a vehicle using spacetime distortion, G-forces wouldn't even affect the passengers inside because the whole frame is moving with the local inertial frame! That's the real magic of warp/antigravity tech.", likes: 450, replyCount: 13, days: 4 },
  { author: "Chloe Zhang", avatarSeed: "ChloeZ", text: "Can we talk about the power requirement problem? Even if negative mass is mathematically valid, requiring the mass-energy equivalent of Jupiter to levitate a car makes it practically impossible for centuries.", likes: 290, replyCount: 11, days: 5 },
  { author: "Daniel Kim", avatarSeed: "DanK", text: "The explanation of how frame dragging works near rotating massive bodies was super intuitive. Spinning superconductors and Gravito-electromagnetism (GEM) is such a fascinating field of research.", likes: 175, replyCount: 5, days: 8 },
  { author: "Emily Watson", avatarSeed: "EmWat", text: "I've been a subscriber since video #1 and watching this channel grow has been awesome. The quality boost in graphics and scripting over the past year is incredible!", likes: 110, replyCount: 1, days: 14 },
  { author: "Gabriel Silva", avatarSeed: "GabS", text: "Is it possible that Dark Energy is essentially a cosmic-scale manifestation of negative gravitational pressure? That would mean antigravity is already driving the expansion of the universe!", likes: 365, replyCount: 15, days: 3 },
  { author: "Zoe Kravitz", avatarSeed: "ZoeK", text: "Loved the timestamp links! Made it super easy to jump back to the math section when I wanted to take notes.", likes: 55, replyCount: 0, days: 15 },
  { author: "Arthur Pendelton", avatarSeed: "ArtP", text: "Could quantum gravity theories like Loop Quantum Gravity or String Theory predict new force carriers that couple negatively to mass? Standard Model obviously doesn't, but Unified Theories might!", likes: 210, replyCount: 8, days: 7 },
  { author: "Victoria Secret_Agent", avatarSeed: "VicSec", text: "The section explaining why gyroscopic precession isn't antigravity saved me from a 3-hour internet rabbit hole. Thank you for debunking that common misconception!", likes: 330, replyCount: 9, days: 6 },
  { author: "Ian MacLeod", avatarSeed: "IanMac", text: " Scottish Highlander here watching physics at midnight! Absolutely top tier video lad. Keep 'em coming!", likes: 140, replyCount: 2, days: 13 },
  { author: "Natalie Portman_Fan", avatarSeed: "NatPort", text: "Wait, if gravity is just geometry of spacetime, then 'antigravity' is really just geometric engineering. We aren't pushing against a force, we're reshaping the ground under our feet!", likes: 285, replyCount: 7, days: 4 },
  { author: "Oscar Isaac", avatarSeed: "OscI", text: "The distinction between passive gravitational mass, active gravitational mass, and inertial mass at 3:10 was so clean. Most textbook explanations drag that out for 30 pages.", likes: 240, replyCount: 4, days: 9 },
  { author: "Penelope Cruz", avatarSeed: "PenC", text: "I shared this in our university physics Discord server and it sparked a 2-hour debate on the Energy Conditions in GR. Super engaging content!", likes: 195, replyCount: 6, days: 10 },
  { author: "Quentin Tarantino", avatarSeed: "QuenT", text: "Needs more feet... just kidding! Fantastic video on theoretical propulsion systems.", likes: 890, replyCount: 42, days: 1 },
  { author: "Riley Reid_Academic", avatarSeed: "RilR", text: "The breakdown of Podkletnov's rotating superconducting disk experiment from 1992 was very fair. Acknowledging that NASA couldn't replicate it while explaining why people got excited was great science communication.", likes: 320, replyCount: 11, days: 8 },
  { author: "Sebastian Stan", avatarSeed: "SebS", text: "What software do you use for these 3D orbital and field visualizations? Manim, Blender, or custom WebGL scripts?", likes: 150, replyCount: 5, days: 11 },
  { author: "Tessa Thompson", avatarSeed: "TessT", text: "The analogy of the bowling ball on a trampoline vs an inverted cone for negative mass was so simple yet effective. Really helped my brain picture it.", likes: 175, replyCount: 3, days: 12 },
  { author: "Ulysses Grant", avatarSeed: "UlyG", text: "Could a superdense neutron star or black hole accretion disk produce measurable frame-dragging effects that simulate antigravity corridors?", likes: 130, replyCount: 4, days: 14 },
  { author: "Valerie F.", avatarSeed: "ValF", text: "Always look forward to your uploads on Friday afternoons! Perfect weekend watching.", likes: 70, replyCount: 1, days: 15 },
  { author: "Winston Smith", avatarSeed: "WinS", text: "Is there any theoretical limit to how strong a quantum levitation flux tube can be? Could a room-temp superconductor hold up a 10-ton building?", likes: 260, replyCount: 9, days: 5 },
  { author: "Xena Warrior_Physicist", avatarSeed: "XenP", text: "Quantum squeezing of vacuum fluctuations seems like our best bet for generating T00 < 0 stress tensor components locally. Glad you mentioned it at the end!", likes: 310, replyCount: 10, days: 3 },
  { author: "Yusuf Demir", avatarSeed: "YusD", text: "Watching from Istanbul! Love how science brings people together from all across the planet.", likes: 205, replyCount: 4, days: 7 },
  { author: "Zara Larson", avatarSeed: "ZarL", text: "The audio mix is super crisp. Crisp narration, perfect background volume, clear graphics. 10/10 production.", likes: 95, replyCount: 0, days: 13 },
  { author: "Aaron Paul", avatarSeed: "AarP", text: "Science Bitch! (Had to say it). Incredible breakdown of Einstein's field equations!", likes: 740, replyCount: 25, days: 2 },
  { author: "Bella Hadid", avatarSeed: "BelH", text: "I didn't expect to watch a 14-minute video on electrogravity today, but here I am, completely fascinated.", likes: 180, replyCount: 3, days: 6 },
  { author: "Charles Darwin", avatarSeed: "CharD", text: "Humanity's intellectual evolution from thinking objects fall because of their 'nature' to understanding spacetime geometry is astounding.", likes: 290, replyCount: 8, days: 9 },
  { author: "Diana Prince", avatarSeed: "DiaP", text: "If we ever achieve antigravity, how would it affect atmospheric pressure around low-flying craft? Wouldn't it push the air away and create a vacuum acoustic boom?", likes: 215, replyCount: 7, days: 10 },
  { author: "Edward Norton", avatarSeed: "EdN", text: "First rule of Antigravity Club: You do not talk about violating Newton's Third Law (unless total system momentum is zero!).", likes: 430, replyCount: 14, days: 4 },
  { author: "Fiona Gallagher", avatarSeed: "FioG", text: "The pacing was spot on. Never felt rushed, but didn't drag either. Subscribed!", likes: 65, replyCount: 1, days: 16 },
  { author: "George St-Pierre", avatarSeed: "GeoSP", text: "I am not impressed by your performance... I am EXTREMELY impressed! Fantastic physics video!", likes: 350, replyCount: 9, days: 5 },
  { author: "Helena Bonham", avatarSeed: "HelB", text: "The dark aesthetic of the video thumbnails and intro sequences fits the channel theme so well.", likes: 110, replyCount: 2, days: 11 },
  { author: "Isaac Newton_Ghost", avatarSeed: "IsaN", text: "Sir, I demand an explanation for why my apple is currently floating upwards in your diagram at 7:40!", likes: 1250, replyCount: 54, days: 1 },
  { author: "Jack Sparrow", avatarSeed: "JackS", text: "Not all treasure is silver and gold, mate. Some of it is negative mass energy tensors!", likes: 620, replyCount: 20, days: 3 },
  { author: "Katherine Johnson", avatarSeed: "KathJ", text: "Math is the language of the universe. Thank you for showing the actual equations on screen rather than just hand-waving!", likes: 480, replyCount: 12, days: 4 },
  { author: "Leonardo DaVinci", avatarSeed: "LeoDV", text: "My flying machine designs would have been much simpler with one of these negative energy devices!", likes: 510, replyCount: 15, days: 6 },
  { author: "Margot Robbie", avatarSeed: "MarR", text: "Loved this! Can you make a video on quantum entanglement next?", likes: 290, replyCount: 8, days: 8 },
  { author: "Nikola Tesla_Fan", avatarSeed: "NikT", text: "Tesla believed in dynamic gravity theories back in the day. It's awesome seeing how modern QFT approaches the problem now.", likes: 370, replyCount: 13, days: 7 },

  // Long & Detailed (71-100)
  {
    author: "Dr. Alistair Finch",
    avatarSeed: "AlFinch",
    text: "As an astrophysicist specializing in General Relativity, I want to compliment you on how accurately you handled the Stress-Energy Tensor (Tμν) at 09:15.\n\nMost pop-science channels simplify gravity down to 'mass attracts mass,' but you correctly pointed out that pressure, momentum density, and energy density ALL contribute to gravitational curvature. When you mentioned that negative pressure can create repulsive gravitational effects (which is precisely how inflation and dark energy work in cosmology), you gave the audience a real insight into modern physics.\n\nKeep up this standard of science communication. It's rare to find videos that balance accessibility with true mathematical honesty.",
    likes: 1420,
    replyCount: 38,
    days: 1
  },
  {
    author: "Quantum_Mechanic_88",
    avatarSeed: "QM88",
    text: "Here is a breakdown for anyone confused about why Quantum Levitation (Type II Superconductors) is NOT true antigravity:\n\n1. Magnetism vs Gravity: Quantum levitation relies on the Meissner effect and flux pinning. Superconductors expel magnetic field lines, locking them in place over a magnetic track.\n2. Energy Requirements: It requires external magnetic fields and cryogenic temperatures (liquid nitrogen/helium).\n3. Scale: It only acts against magnetic fields, NOT spacetime curvature itself.\n\nTrue antigravity would require modifying the gravitational metric itself (gμν) or generating negative active gravitational mass. Great video for making this distinction clear around the 6-minute mark!",
    likes: 890,
    replyCount: 24,
    days: 2
  },
  {
    author: "Prof. Timothy Vance",
    avatarSeed: "TimVance",
    text: "The discussion surrounding the Bondi 'Runway Effect' (1957) at 11:45 was brilliant.\n\nFor those unaware: If you have a positive mass (+m) and a negative mass (-m), the negative mass repels the positive mass, while the positive mass attracts the negative mass. The result? Both objects accelerate in the SAME direction endlessly, gaining kinetic energy!\n\nAt first glance, this looks like it violates conservation of energy. But because the negative mass has negative kinetic energy (-1/2 m v^2), the net kinetic energy of the system remains EXACTLY ZERO at all times! Physics is utterly bizarre when you push the equations to their limits.",
    likes: 1150,
    replyCount: 31,
    days: 3
  },
  {
    author: "Sarah_LabTech",
    avatarSeed: "SarahLT",
    text: "I work in an optics lab working with squeezed vacuum states, and seeing quantum optics mentioned in a video about propulsion was a pleasant surprise!\n\nWhen you squeeze the quantum vacuum, you reduce the uncertainty in one observable (like phase) at the cost of increasing uncertainty in another (like photon number). In certain localized regions of a squeezed state, the energy density can actually drop below the zero-point energy of the unperturbed vacuum, creating a fleeting region of T00 < 0.\n\nWe are nowhere near making this macroscopically useful for spacecraft, but the fundamental physics is 100% real and verified in laboratories every day.",
    likes: 670,
    replyCount: 17,
    days: 4
  },
  {
    author: "Christopher Nolan_Fan",
    avatarSeed: "CNolan",
    text: "This video felt like a deleted scene from Interstellar where Kip Thorne explains the gravity equations to Murph.\n\nThe way you connected:\n- General Relativity (Spacetime Curvature)\n- The Equivalence Principle (Inertial vs Gravitational Mass)\n- Quantum Field Theory (Vacuum Energy & Negative Tensors)\n- Engineering Feasibility (Superconductors & Casimir Effects)\n\nMade the entire 14 minutes feel like a masterclass. I've rewatched this twice already. Please do a full series on speculative propulsion technologies!",
    likes: 980,
    replyCount: 22,
    days: 2
  },
  {
    author: "Engineer_Dan",
    avatarSeed: "EngDan",
    text: "Aerospace engineer perspective here:\nEven if we discovered a material with negative mass tomorrow, building a commercial vehicle out of it would present insane structural challenges.\n\nThink about it: how do you bolt down a component that is actively pushing away from the chassis with negative inertia? Every structural joint would experience shear forces in reverse. You'd need novel composite materials just to contain the engine housing without it tearing the ship apart.\n\nIt's easy to look at sci-fi movies and think 'oh we just turn on the antigravity drive,' but the mechanical engineering hurdles are just as massive as the physics hurdles!",
    likes: 540,
    replyCount: 15,
    days: 5
  },
  {
    author: "Julian_Cosmology",
    avatarSeed: "JulCosmo",
    text: "One detail I'm glad you included: the ALPHA-g experiment at CERN.\n\nFor decades, sci-fi writers hypothesized that antimatter might have negative gravitational mass and fall UP. But in late 2023, CERN published their results proving that antihydrogen atoms fall DOWN with an acceleration consistent with 1g (within experimental error).\n\nThat single experiment ruled out a huge category of naive 'antimatter antigravity' theories. Science progresses just as much by ruling out false paths as it does by discovering new ones!",
    likes: 760,
    replyCount: 19,
    days: 3
  },
  {
    author: "Math_Enthusiast_99",
    avatarSeed: "Math99",
    text: "Timestamp breakdown for anyone taking study notes:\n\n0:00 - Introduction & Historical Context\n1:45 - Newton vs Einstein: What IS Gravity?\n3:50 - The Equivalence Principle & Mass Types\n6:10 - Magnetic Levitation vs True Antigravity\n8:30 - Negative Mass & Einstein's Field Equations\n10:45 - The Bondi Runway Effect Paradox\n12:10 - CERN ALPHA-g Experiment Results\n13:40 - Future Outlook & Summary\n\nHope this helps fellow physics students!",
    likes: 1530,
    replyCount: 28,
    days: 1
  },
  {
    author: "Dr. Rebecca Sterling",
    avatarSeed: "RebecS",
    text: "Excellent presentation. I wanted to add a brief note on the Weak Energy Condition (WEC).\n\nIn classical GR, the WEC states that for any timelike vector vμ, Tμν vμ vν ≥ 0. This essentially says that any real observer will always measure a non-negative energy density.\n\nHowever, in Quantum Field Theory, the WEC is known to be violated globally and locally by quantum states (like Casimir energy or Hawking radiation near black hole horizons). This means that quantum mechanics intrinsically permits conditions that classical GR forbids! That intersection between QFT and GR is where true antigravity physics will ultimately be born.",
    likes: 820,
    replyCount: 20,
    days: 4
  },
  {
    author: "Starbound_Pioneer",
    avatarSeed: "StarPio",
    text: "Imagine what human civilization will look like in 500 years if we solve this.\n\n- No more expensive rocket launches burning thousands of tons of kerosene just to escape Earth's gravity well.\n- Floating sky cities in the upper atmosphere of Venus where atmospheric pressure and temperature match Earth.\n- Mining asteroids by simply nudging them into stable orbits with minimal propellant.\n- Interstellar probes accelerating at constant 1g without crushing biological payloads.\n\nVideos like this remind me why I chose to major in aerospace engineering. The future is worth fighting for.",
    likes: 610,
    replyCount: 16,
    days: 6
  },
  {
    author: "Marcus_Physics_Grad",
    avatarSeed: "MarcPG",
    text: "Great video! One question regarding the Biefeld-Brown effect mentioned at 05:20:\n\nYou correctly noted that in a vacuum, the thrust drops to zero, proving it's an electrohydrodynamic (EHD) ion wind effect rather than electrogravity.\n\nMy question is: Have there been any recent tests in ultra-high vacuum environments using asymmetric high-voltage capacitors with GHz AC frequencies instead of DC? I read a paper from 2021 suggesting high-frequency AC might induce non-linear dielectric stress in the quantum vacuum. Would love to hear if you've stumbled across that research!",
    likes: 340,
    replyCount: 12,
    days: 7
  },
  {
    author: "Elena_K_89",
    avatarSeed: "ElenaK89",
    text: "I showed this video to my 70-year-old grandfather who worked as an electrical engineer on Apollo-era tracking radar systems. He sat in complete silence for 14 minutes, then turned to me and said:\n\n'In my day, we thought getting a 3-stage rocket off the pad was magic. These young scientists thinking about warping space itself make me wish I was 20 again.'\n\nThank you for creating content that connects generations through wonder!",
    likes: 1890,
    replyCount: 45,
    days: 2
  },
  {
    author: "SciFi_Writer_Alex",
    avatarSeed: "SciFiAlex",
    text: "As a hard sci-fi novelist, this video is a goldmine.\n\nI was writing a chapter involving a ship utilizing negative mass propulsion, but I couldn't figure out how to describe the inertial dampening. Your explanation at 07:15 about how an object in a warp/antigravity bubble remains in freefall relative to its local spacetime frame solved my plot hole instantly!\n\nNo artificial gravity belts needed — the crew just floats comfortably because the ship and the crew share the exact same geodesic trajectory. Incredible work!",
    likes: 430,
    replyCount: 9,
    days: 8
  },
  {
    author: "Prof_David_Holloway",
    avatarSeed: "DaveHoll",
    text: "Re-watching this for the 3rd time to prep lecture slides on Special vs General Relativity.\n\nWhat makes this video superior to 99% of science channels is the refusal to use misleading analogies without clarifying their limitations. For instance, explaining that the 'rubber sheet' model breaks down because it relies on Earth's gravity to pull the ball down into the well was a masterclass in critical teaching.\n\nKeep setting the standard for scientific accuracy on YouTube!",
    likes: 720,
    replyCount: 18,
    days: 5
  },
  {
    author: "Quantum_Foam_Researcher",
    avatarSeed: "QFoam",
    text: "A quick note on Wheeler's Quantum Foam model:\nAt the Planck scale (~10^-35 meters), spacetime topology is believed to fluctuate wildly, creating micro-wormholes and virtual black holes that form and evaporate in 10^-43 seconds.\n\nSome theoretical physicists hypothesize that if we could coherentize these Planck-scale vacuum fluctuations (similar to how a laser coherentizes light photons), we could induce macroscopic negative energy regions.\n\nWe are currently missing the experimental tools to probe 10^-35m, but the math does not forbid it!",
    likes: 510,
    replyCount: 14,
    days: 9
  },
  {
    author: "Samantha_Space_Art",
    avatarSeed: "SamSpace",
    text: "The visual design in this video is top tier!\n\nThe color palette choices — using deep neon indigo for positive energy curvature and glowing infrared crimson for negative mass distortion — made intuitive sense immediately.\n\nAs a visual designer who loves science, I really appreciate when creators invest effort into diagrammatic clarity. It makes abstract 4D mathematical concepts accessible to visual learners like me!",
    likes: 290,
    replyCount: 4,
    days: 10
  },
  {
    author: "Brian_T_Engineering",
    avatarSeed: "BrianTEng",
    text: "Let's talk about the economic implications of 1g continuous acceleration:\n\nIf you have a 1g antigravity/propulsion drive:\n- Earth to the Moon: 3.5 hours\n- Earth to Mars (at closest approach): 39 hours!\n- Earth to Pluto: 16 days!\n\nYou don't even need relativistic speeds to colonize the entire Solar System in weeks. The moment we eliminate the tyranny of the rocket equation, the solar system becomes as accessible as Earth was in the 19th century.",
    likes: 1120,
    replyCount: 29,
    days: 3
  },
  {
    author: "Dr. Kenji Sato",
    avatarSeed: "KenjiSato",
    text: "Greetings from RIKEN research institute in Japan! We enjoyed watching your summary of quantum levitation and gravito-electromagnetism during our lunch break.\n\nYour explanation of the Lense-Thirring effect (frame dragging) was very concise. We often find that students struggle to understand how a massive rotating cylinder can drag spacetime along with it, but your animated vector grid illustrated the tensor field beautifully.\n\nArigato gozaimasu for making science education engaging!",
    likes: 850,
    replyCount: 16,
    days: 6
  },
  {
    author: "Astro_Girl_2026",
    avatarSeed: "AstroG26",
    text: "I remember when people laughed at the idea of heavier-than-air flight, then 66 years after the Wright Brothers we landed on the Moon.\n\nRight now, antigravity feels like science fiction. But looking at the rate of progress in quantum computing, high-temperature superconductors, and metamaterial synthesis, who knows where we'll be in 2076?\n\nNever stop dreaming, and never stop doing the rigorous math!",
    likes: 670,
    replyCount: 13,
    days: 11
  },
  {
    author: "Victor_Hugo_Physics",
    avatarSeed: "VicHugo",
    text: "My favorite quote regarding this topic:\n'Nothing is more powerful than an idea whose time has come.' - Victor Hugo.\n\nWe may be in the 'steam engine' era of quantum gravity research right now — crude experiments, incomplete equations, and lots of skepticism. But once the foundational theory of Quantum Gravity is solved, technological applications will follow at exponential speeds.",
    likes: 410,
    replyCount: 7,
    days: 12
  },
  {
    author: "Physics_Tutor_Dan",
    avatarSeed: "PhysTutor",
    text: "For students watching this video to prepare for exams, here are the key concepts you MUST remember:\n\n1. Invariant Mass vs Relativistic Mass\n2. The 4 Energy Conditions in GR (Weak, Strong, Dominant, Null)\n3. Difference between Electromagnetic forces (q1q2/r^2) and Gravitational curvature (Gμν = 8πTμν)\n4. Why Casimir Effect proves negative local energy density exists in QFT.\n\nSave this comment for review time!",
    likes: 930,
    replyCount: 21,
    days: 4
  },
  {
    author: "Clara_Oswald_Space",
    avatarSeed: "ClaraOsw",
    text: "Runway effect at 10:45 explained so well! I always thought negative mass was just a sci-fi trope like kryptonite, but learning it's a valid mathematical solution to Einstein's Field Equations blew my mind.\n\nSure, we don't know if exotic matter exists in nature, but the fact that the laws of physics don't explicitly forbid it leaves the door wide open!",
    likes: 380,
    replyCount: 8,
    days: 13
  },
  {
    author: "David_C_Aerospace",
    avatarSeed: "DaveCAero",
    text: "Has anyone calculated the gravitational wave signature of a rapidly oscillating negative mass dipole?\n\nIf you had a device that rapidly shifted local energy density between positive and negative values, it should emit high-frequency gravitational waves (HFGWs). That could theoretically be used for interstellar communication that passes right through planets without attenuation!",
    likes: 270,
    replyCount: 9,
    days: 14
  },
  {
    author: "Nora_Al_Mansoori",
    avatarSeed: "NoraAlM",
    text: "Watching from the UAE! Science communication channels like Antigravity Studio are inspiring a whole new generation of engineers and researchers across the Middle East.\n\nThe clarity of your explanations makes complex graduate-level physics accessible to anyone willing to listen. Keep up the phenomenal work!",
    likes: 490,
    replyCount: 11,
    days: 7
  },
  {
    author: "Tom_Hardy_Voice",
    avatarSeed: "TomHVoice",
    text: "Ah, you think gravity is your ally? You merely adopted the spacetime curve. I was born in it, molded by it... I didn't see negative mass until I was already a man!\n\n(Awesome video mate, loved every second!).",
    likes: 1100,
    replyCount: 33,
    days: 3
  },
  {
    author: "Rachel_Green_Physics",
    avatarSeed: "RachGreen",
    text: "The animation of the light geodesics bending near the negative mass at 09:40 was mesmerizing.\n\nUsually, light bends TOWARD a massive body (gravitational lensing). Seeing the light rays diverge away from the negative energy region looked like a cosmic concave lens! Imagine telescoping through a negative mass galaxy!",
    likes: 320,
    replyCount: 5,
    days: 15
  },
  {
    author: "Kevin_Space_Geek",
    avatarSeed: "KevSpGeek",
    text: "14 minutes of pure unadulterated science. No sponsored mobile game ads in the middle, no 3-minute filler intros, just straight-to-the-point physics.\n\nThis is why I support your channel on Patreon. Quality over clickbait every single time!",
    likes: 780,
    replyCount: 14,
    days: 8
  },
  {
    author: "Dr. Henrik Lindqvist",
    avatarSeed: "HenrikL",
    text: "Greetings from Uppsala University!\n\nWe recently discussed the implications of the Heim Theory and Extended Heim Theory in our seminar. While Heim's proposed 6-dimensional formulation for gravitophoton coupling remains controversial, your video did a great job sticking to standard GR and QFT without straying into unverified alternative frameworks.\n\nRigorous, balanced, and deeply educational.",
    likes: 410,
    replyCount: 10,
    days: 9
  },
  {
    author: "Zoe_W_Astronomy",
    avatarSeed: "ZoeWAstro",
    text: "I love how at the end of the video, you reminded us that 100 years ago, quantum mechanics sounded like magic to classical physicists.\n\nWe are likely in the exact same position today with quantum gravity. We're staring at pieces of a puzzle (black hole information paradox, dark energy, singularity resolution) without knowing how they fit together yet. The future of physics is bright!",
    likes: 560,
    replyCount: 12,
    days: 10
  },
  {
    author: "Antigravity_Studio_Team",
    avatarSeed: "AGStudio",
    text: "PINNED COMMENT:\nThank you all so much for the incredible response to this video! We spent over 3 weeks researching the literature and animating the stress-energy tensor graphics.\n\nDrop your suggestions below for our next episode! Are you more interested in Wormhole Physics or Planetary Astrobiology on Kepler-186f?",
    likes: 3450,
    replyCount: 142,
    days: 0
  }
];

// --- VIDEO 2: 100 UNIQUE COMMENTS (KEPLER-186F) ---
const vid2RawComments = [
  // Short (1-20)
  { author: "Astro_Liam", avatarSeed: "AstroLiam", text: "Kepler-186f has been my favorite exoplanet since it was confirmed in 2014!", likes: 290, replyCount: 5, days: 1 },
  { author: "Dr. Maya Lin", avatarSeed: "MayaLin2", text: "Fantastic astrobiology breakdown! The red dwarf radiation problem was handled brilliantly.", likes: 410, replyCount: 9, days: 2 },
  { author: "Stargazer_99", avatarSeed: "StarG99", text: "Plants with black or dark violet leaves because of red-shifted light? That visual at 7:15 was breathtaking!", likes: 620, replyCount: 14, days: 3 },
  { author: "Carlos Rodriguez", avatarSeed: "CarlosR", text: "490 light-years away... so close yet so impossibly far with current rockets.", likes: 180, replyCount: 4, days: 5 },
  { author: "Emily Thorne", avatarSeed: "EmThorne", text: "Imagine looking up at noon and seeing a massive dim red sun in a crimson sky. Spooky and beautiful.", likes: 350, replyCount: 8, days: 4 },
  { author: "SpaceCadet_Dan", avatarSeed: "SpaceDan", text: "JWST atmospheric spectroscopy is literally changing astronomy in real time.", likes: 210, replyCount: 2, days: 6 },
  { author: "Nadia Petrov", avatarSeed: "NadiaP", text: "Wait, is Kepler-186f tidally locked to its host star or not?", likes: 145, replyCount: 11, days: 2 },
  { author: "Kevin Vance", avatarSeed: "KevVance", text: "Another masterpiece from Antigravity Studio! Best space channel on YouTube.", likes: 95, replyCount: 0, days: 7 },
  { author: "BioPhysicist_Sarah", avatarSeed: "BioSarah", text: "Retinal-based pigments vs Chlorophyll under M-dwarf spectrum is my favorite topic!", likes: 310, replyCount: 6, days: 3 },
  { author: "Alex Mercer", avatarSeed: "AlexMercer", text: "The 3D render of the planetary surface at 12:30 looked like a sci-fi movie scene.", likes: 175, replyCount: 1, days: 8 },
  { author: "Hannah Abbott", avatarSeed: "HannahAb", text: "490 light years means the light we see from Kepler-186f today left the planet during the Renaissance!", likes: 540, replyCount: 16, days: 1 },
  { author: "Marcus Brody", avatarSeed: "MarcBrody", text: "Would gravity on Kepler-186f feel the same as Earth?", likes: 88, replyCount: 5, days: 9 },
  { author: "Jessica Taylor", avatarSeed: "JessTay", text: "I could listen to this narrator talk about exoplanets for hours. So soothing.", likes: 120, replyCount: 2, days: 10 },
  { author: "Quantum_Leap", avatarSeed: "QLeap", text: "Could a strong magnetosphere shield Kepler-186f from M-dwarf stellar flares?", likes: 190, replyCount: 7, days: 4 },
  { author: "Brian O'Conner", avatarSeed: "BrianOC", text: "Earth 2.0 is such a cool nickname, but it really is its own unique world.", likes: 80, replyCount: 0, days: 11 },
  { author: "Rachel Zane", avatarSeed: "RachZane", text: "Loved the breakdown of the habitable zone calculation at 4:10!", likes: 160, replyCount: 3, days: 12 },
  { author: "David Miller", avatarSeed: "DaveMill", text: "Subscribed! Can you do a video on TRAPPIST-1e next?", likes: 290, replyCount: 10, days: 2 },
  { author: "Laura Croft_Space", avatarSeed: "LauraCroft", text: "Walking under a red dwarf sun would feel like eternal twilight. Eerie!", likes: 230, replyCount: 6, days: 5 },
  { author: "Ian Malcolm", avatarSeed: "IanMalc", text: "Life... uh... finds a way! Especially on habitable zone exoplanets.", likes: 670, replyCount: 21, days: 3 },
  { author: "Sophia Loren", avatarSeed: "SophLoren", text: "The music selection in the ocean rendering segment was pure magic.", likes: 115, replyCount: 1, days: 13 },

  // Medium (21-70)
  { author: "Dr. Alistair Finch", avatarSeed: "AlFinch2", text: "Kepler-186f receives about 32% of the stellar flux that Earth receives from the Sun. That puts it right near the outer edge of its star's habitable zone. If it has a dense CO2 greenhouse atmosphere, liquid water oceans are extremely plausible!", likes: 490, replyCount: 15, days: 2 },
  { author: "Elena Rostova", avatarSeed: "ElenaR2", text: "What fascinated me most was the explanation of retinal photosystems at 8:45. On Earth, plants use chlorophyll which reflects green light. But under an M-dwarf star emitting mostly near-infrared, alien flora would absorb almost all visible light, appearing jet-black or deep violet!", likes: 380, replyCount: 12, days: 4 },
  { author: "Christopher Vance", avatarSeed: "ChrisVance", text: "The orbital period is 129.9 days! Imagine celebrating your birthday every 4 months. Plus, being 1.17 times the radius of Earth means surface gravity would be roughly 1.05g to 1.2g depending on core density. You'd barely feel heavier!", likes: 310, replyCount: 8, days: 6 },
  { author: "Sarah_Astrobiology", avatarSeed: "SarahAstro", text: "M-dwarf stars are notorious for extreme coronal mass ejections and UV flares during their first billion years. For Kepler-186f to harbor life, it MUST have had a powerful intrinsic magnetic dynamo to prevent atmospheric stripping.", likes: 275, replyCount: 9, days: 5 },
  { author: "Tomasz Nowak", avatarSeed: "TomN2", text: "The transit method explanation at 3:15 was the clearest visual representation of light curve dips I've seen. Showing how Kepler detected a 0.04% drop in brightness as the planet crossed the star was brilliant.", likes: 195, replyCount: 4, days: 7 },
  { author: "Priya Sharma", avatarSeed: "PriyaS2", text: "If humanity ever builds a light-sail probe array accelerated by orbital lasers (like Breakthrough Starshot), sending a flyby probe to Kepler-186 at 20% light speed would still take 2,450 years. Space is mind-bogglingly huge.", likes: 450, replyCount: 18, days: 1 },
  { author: "Lucas Dubois", avatarSeed: "LucasD2", text: "One detail often overlooked: Kepler-186 is an M1-type dwarf star, which is much calmer and less prone to superflares than smaller M4 or M8 red dwarfs like Proxima Centauri! That makes 186f far more hospitable for long-term evolution.", likes: 340, replyCount: 10, days: 3 },
  { author: "Rachel Vance", avatarSeed: "RachV2", text: "The rendering of the sunset on Kepler-186f at 16:20 gave me chills. The star would appear 20% larger in the sky than our Sun, but glowing with a warm, deep amber hue. Absolutely stunning artwork!", likes: 290, replyCount: 5, days: 8 },
  { author: "Derek Foster", avatarSeed: "DerekF2", text: "Could Kepler-186f have large moons? If a super-Earth formed with a large moon, the tidal interactions could help keep its mantle hot enough for plate tectonics and a stable carbon-silicate cycle!", likes: 160, replyCount: 7, days: 9 },
  { author: "Hannah Abbott", avatarSeed: "HannahA2", text: "I'm showing this video to my astronomy club tonight. The breakdown of planetary radius vs mass estimates using radial velocity constraints was top notch.", likes: 140, replyCount: 2, days: 10 },
  { author: "Xavier Dupont", avatarSeed: "XavD2", text: "Atmospheric transmission spectroscopy with JWST and the upcoming ELT (Extremely Large Telescope) will hopefully detect biosignatures like oxygen, ozone, or methane in the coming decade. Exciting times to be alive!", likes: 380, replyCount: 11, days: 4 },
  { author: "Sophia Rossi", avatarSeed: "SophR2", text: "The comparison between Earth's solar irradiance and Kepler-186f's flux at 5:50 helped me understand why 'colder star' doesn't mean 'frozen planet' if the planet is closer to the star.", likes: 115, replyCount: 3, days: 11 },
  { author: "Marcus Aurelius", avatarSeed: "MarcAur2", text: "To look at a dim star 490 light-years away and deduce the size, orbit, temperature, and atmospheric potential of its planet using pure math and optics is the ultimate triumph of human intellect.", likes: 520, replyCount: 17, days: 2 },
  { author: "Chloe Zhang", avatarSeed: "ChloeZ2", text: "What about ocean tides? If Kepler-186f is partially tidally locked or in a 3:2 spin-orbit resonance like Mercury, the tidal bulges created by the host star would produce massive coastal waves!", likes: 210, replyCount: 6, days: 7 },
  { author: "Daniel Kim", avatarSeed: "DanK2", text: "I loved the hypothetical calendar breakdown! 130-day year divided into short 4-week seasons. Summer on Kepler-186f would last barely a month!", likes: 175, replyCount: 4, days: 9 },
  { author: "Emily Watson", avatarSeed: "EmWat2", text: "The graphics team for Antigravity Studio deserves a raise. Every single exoplanet visualization is scientific accuracy combined with cinematic art.", likes: 95, replyCount: 1, days: 12 },
  { author: "Gabriel Silva", avatarSeed: "GabS2", text: "Is there any chance Kepler-186f has liquid water oceans but a runaway ice-house climate like Snowball Earth? Receiving only 32% of Earth's solar flux makes ice albedo feedback a major risk.", likes: 260, replyCount: 8, days: 6 },
  { author: "Zoe Kravitz", avatarSeed: "ZoeK2", text: "Great video! The timestamp links in the description made it super easy to rewatch the atmospheric modeling segment.", likes: 45, replyCount: 0, days: 14 },
  { author: "Arthur Pendelton", avatarSeed: "ArtP2", text: "If intelligent life evolved on Kepler-186f, their eyes would likely be optimized for near-infrared vision. To them, our bright yellow Sun would look blindingly harsh and blue-shifted!", likes: 390, replyCount: 13, days: 3 },
  { author: "Victoria Secret_Agent", avatarSeed: "VicSec2", text: "The distinction between exoplanet candidates and VALIDATED exoplanets at 1:45 cleared up a lot of confusion I had. False positive filtering is such complex statistical work.", likes: 180, replyCount: 5, days: 10 },
  { author: "Ian MacLeod", avatarSeed: "IanMac2", text: "Imagine drinking a pint of Scottish ale on a balcony overlooking a black-forest landscape under a red dwarf star. Sign me up!", likes: 310, replyCount: 9, days: 5 },
  { author: "Natalie Portman_Fan", avatarSeed: "NatPort2", text: "Could life exist in the subterranean oceans under an ice crust, similar to Europa or Enceladus, even if the surface is too cold?", likes: 145, replyCount: 4, days: 11 },
  { author: "Oscar Isaac", avatarSeed: "OscI2", text: "The stellar classification segment at 6:10 was so well paced. M-dwarfs make up 70% of all stars in the Milky Way, so Kepler-186f represents the most common class of potentially habitable real estate in the galaxy!", likes: 430, replyCount: 14, days: 2 },
  { author: "Penelope Cruz", avatarSeed: "PenC2", text: "I shared this with my university astrobiology study group. We had a great discussion on how thick CO2 atmospheres alter the Rayleigh scattering color of the sky!", likes: 165, replyCount: 3, days: 8 },
  { author: "Quentin Tarantino", avatarSeed: "QuenT2", text: "Imagine a Western film set on Kepler-186f with twin moons and a crimson horizon. Cinematic perfection!", likes: 620, replyCount: 22, days: 1 },
  { author: "Riley Reid_Academic", avatarSeed: "RilR2", text: "The breakdown of Kepler-186 system's orbital stability was super interesting. 4 interior planets (b, c, d, e) all orbiting much closer than Mercury is to our Sun, keeping the outer planet 186f in a stable gravitational groove.", likes: 280, replyCount: 7, days: 9 },
  { author: "Sebastian Stan", avatarSeed: "SebS2", text: "What spectral band pass filters were used to create the false-color composite images shown at 10:15?", likes: 90, replyCount: 2, days: 13 },
  { author: "Tessa Thompson", avatarSeed: "TessT2", text: "The analogy comparing red dwarf energy output to a campfire vs a spotlight for our Sun was so relatable. Made the flux math easy to grasp.", likes: 135, replyCount: 3, days: 12 },
  { author: "Ulysses Grant", avatarSeed: "UlyG2", text: "Could a super-Earth like Kepler-186f retain a dense hydrogen-helium envelope and become a mini-Neptune instead of a terrestrial world?", likes: 205, replyCount: 8, days: 7 },
  { author: "Valerie F.", avatarSeed: "ValF2", text: "Another fantastic upload! My favorite YouTube channel by far.", likes: 60, replyCount: 0, days: 15 },
  { author: "Winston Smith", avatarSeed: "WinS2", text: "How does the habitability of Kepler-186f compare to TRAPPIST-1e or Proxima Centauri b? A comparison chart in the next video would be awesome!", likes: 310, replyCount: 10, days: 4 },
  { author: "Xena Warrior_Physicist", avatarSeed: "XenP2", text: "The M-dwarf stellar flare problem is why planetary magnetic dipole moment calculations are crucial. Glad you highlighted that around 14:00!", likes: 240, replyCount: 6, days: 8 },
  { author: "Yusuf Demir", avatarSeed: "YusD2", text: "Greetings from Istanbul! Always learning something new from your channel.", likes: 150, replyCount: 2, days: 10 },
  { author: "Zara Larson", avatarSeed: "ZarL2", text: "The sound design during the planetary flyby animation was chef's kiss!", likes: 80, replyCount: 0, days: 14 },
  { author: "Aaron Paul", avatarSeed: "AarP2", text: "Aliens on Kepler-186f: 'Yeah Science!' Outstanding video breakdown!", likes: 540, replyCount: 16, days: 2 },
  { author: "Bella Hadid", avatarSeed: "BelH2", text: "I didn't think I'd spend my Friday evening watching a 18-minute documentary on exoplanets, but I don't regret a single second.", likes: 170, replyCount: 3, days: 9 },
  { author: "Charles Darwin", avatarSeed: "CharD2", text: "If life evolved under a red dwarf, adaptive radiation would produce forms of photosynthesis and vision utterly alien to terrestrial biology.", likes: 380, replyCount: 11, days: 5 },
  { author: "Diana Prince", avatarSeed: "DiaP2", text: "What would the atmospheric pressure at sea level be if Kepler-186f is 10% larger than Earth? Would humans feel heavy or light breathing that air?", likes: 195, replyCount: 5, days: 11 },
  { author: "Edward Norton", avatarSeed: "EdN2", text: "First rule of Exoplanet Exploration: You don't assume a planet is inhabited until you detect atmospheric disequilibrium (oxygen + methane)!", likes: 390, replyCount: 12, days: 3 },
  { author: "Fiona Gallagher", avatarSeed: "FioG2", text: "High quality content as always. Pacing, graphics, and voiceover are unmatched.", likes: 75, replyCount: 1, days: 15 },
  { author: "George St-Pierre", avatarSeed: "GeoSP2", text: "Super clean breakdown of the Kepler space telescope's transit photometry method!", likes: 280, replyCount: 7, days: 6 },
  { author: "Helena Bonham", avatarSeed: "HelB2", text: "The concept of black forests absorbing all visible light under a red sun is going to inspire so many sci-fi artists.", likes: 130, replyCount: 3, days: 12 },
  { author: "Isaac Newton_Ghost", avatarSeed: "IsaN2", text: "My Law of Universal Gravitation (F = G m1 m2 / r^2) holds true even 490 light-years away on Kepler-186f! Marvelous!", likes: 980, replyCount: 34, days: 1 },
  { author: "Jack Sparrow", avatarSeed: "JackS2", text: "Set sail for the Kepler system, savvy? Only 490 light years off the starboard bow!", likes: 450, replyCount: 14, days: 4 },
  { author: "Katherine Johnson", avatarSeed: "KathJ2", text: "Precision orbital mechanics shown clearly! Calculating exoplanetary semi-major axes from orbital periods using Kepler's Third Law is beautiful math.", likes: 360, replyCount: 9, days: 7 },
  { author: "Leonardo DaVinci", avatarSeed: "LeoDV2", text: "To paint a sunset on a world under a red star... what a dream for an artist!", likes: 410, replyCount: 10, days: 8 },
  { author: "Margot Robbie", avatarSeed: "MarR2", text: "Loved every minute! Please cover Kepler-452b or Ross 128b in your next video!", likes: 210, replyCount: 5, days: 10 },
  { author: "Nikola Tesla_Fan", avatarSeed: "NikT2", text: "If Kepler-186f has an active iron core and strong ionosphere, wireless planetary energy transmission might be even easier there!", likes: 290, replyCount: 8, days: 9 },

  // Long & Detailed (71-100)
  {
    author: "Dr. Aris Thorne",
    avatarSeed: "ArisThorne2",
    text: "As an exoplanet climatologist, I want to applaud the accuracy of your atmospheric modeling segment at 11:30.\n\nBecause Kepler-186f receives 32% of Earth's insolation from an M1 dwarf, maintaining an average surface temperature above freezing requires a greenhouse effect driven by roughly 0.5 to 2 bars of CO2 (assuming a 1-bar N2 background atmosphere).\n\nIf the planet possesses an active carbon-silicate cycle (volcanism + weathering), climate feedbacks would naturally regulate CO2 levels to keep oceans liquid! This is why Kepler-186f remains one of our most promising targets for terrestrial habitability studies.",
    likes: 1280,
    replyCount: 32,
    days: 1
  },
  {
    author: "Astrobiology_Review",
    avatarSeed: "AstroBioRev",
    text: "Here is a breakdown of Alien Vegetation on Kepler-186f for those interested:\n\n1. Light Spectrum: Kepler-186 emits peak energy in the near-infrared (~800–1000 nm) with very little blue/UV photon flux compared to G-type stars.\n2. Pigment Adaptation: Earth plants use Chlorophyll-A and B (absorbing blue and red, reflecting green). On 186f, plants would likely evolve bacteriochlorophyll-like pigments that absorb NIR and all visible wavelengths.\n3. Visual Appearance: To human eyes, forests on Kepler-186f would appear pitch-black or extremely dark purple/brown, maximizing photon capture!\n\nSuch a cool intersection between stellar astrophysics and evolutionary biology!",
    likes: 940,
    replyCount: 26,
    days: 2
  },
  {
    author: "Prof. Marcus Vance",
    avatarSeed: "MarcVance2",
    text: "The discussion surrounding Tidal Locking vs Spin-Orbit Resonance at 14:15 was top tier.\n\nBecause Kepler-186f orbits at 0.432 AU from its star, it is far enough out that it is NOT necessarily tidally locked into a permanent day/night hemisphere! It could easily exist in a 3:2 spin-orbit resonance (like Mercury), giving it actual day/night cycles across its entire surface.\n\nThis is huge for habitability because permanent tidal locking creates extreme temperature gradients (eyeball Earth scenarios), whereas a rotating planet distributes heat much more evenly through atmospheric wind patterns.",
    likes: 810,
    replyCount: 19,
    days: 3
  },
  {
    author: "JWST_Data_Analyst",
    avatarSeed: "JWSTData",
    text: "Working with transit spectroscopy data daily, I want to clarify how we detect atmospheres on planets like Kepler-186f:\n\nWhen the planet transits its star, a tiny fraction of the starlight filters through the outer edge of the planet's atmosphere. Chemical elements in the atmosphere absorb specific wavelengths, leaving narrow dark absorption lines in the star's spectrum.\n\nFor a planet 490 light-years away with a stellar transit depth of 0.04%, retrieving a high signal-to-noise spectrum requires stacking dozens of transits over several years. JWST Cycle 3 and Cycle 4 proposals are actively targeting this system!",
    likes: 1150,
    replyCount: 29,
    days: 2
  },
  {
    author: "Elena_K_89",
    avatarSeed: "ElenaK89_2",
    text: "Timestamp breakdown for anyone studying exoplanets or preparing class slides:\n\n0:00 - Introduction to the Kepler-186 System\n2:10 - How Kepler Discovered Kepler-186f (Transit Photometry)\n4:45 - The Habitable Zone & Stellar Flux Calculation\n7:15 - Alien Plants: Black Forests Under a Red Dwarf\n9:50 - Atmospheric Composition & Greenhouse Models\n12:30 - Surface Environment 3D Renders & Gravity Estimates\n15:10 - Stellar Flares & Magnetic Shielding Requirements\n17:05 - Future Telescopes (ELT, HWO) & Biosignature Search\n\nHope this helps!",
    likes: 1410,
    replyCount: 25,
    days: 1
  },
  {
    author: "Engineer_Dan",
    avatarSeed: "EngDan2",
    text: "If we ever send a colonizing generational ship or embryo seed ship to Kepler-186f, atmospheric entry would be fascinating.\n\nWith surface gravity at ~1.05g and an atmospheric density potentially 1.5x Earth's, entry heat shields would experience higher peak thermal loads, but parachutes and aerobraking would be far more effective than on Earth or Mars!\n\nLanding heavy payloads on Kepler-186f might actually be easier than landing on Mars because Mars' thin atmosphere provides almost no drag while having enough gravity to pull ships down hard. Physics of re-entry is wild!",
    likes: 520,
    replyCount: 14,
    days: 5
  },
  {
    author: "Cosmo_Explorer_99",
    avatarSeed: "CosmoEx99",
    text: "Think about the sheer scale of the Kepler Mission:\n\nKepler monitored a single tiny patch of sky in the Cygnus/Lyra constellations — roughly the size of your hand held at arm's length! In that tiny sliver of space, it discovered over 2,600 confirmed exoplanets.\n\nIf you extrapolate those results to the entire sky, statistical analysis indicates there are more PLANETS than STARS in our galaxy, and billions of Earth-sized planets in habitable zones. We are living in the golden age of discovery!",
    likes: 870,
    replyCount: 21,
    days: 4
  },
  {
    author: "Dr. Rebecca Sterling",
    avatarSeed: "RebecS2",
    text: "Great point at 15:40 regarding Habitable Worlds Observatory (HWO) scheduled for the 2030s/2040s.\n\nHWO will feature a 6-meter optical/UV space telescope equipped with an advanced coronagraph and starlight suppression system capable of direct imaging of Earth-like exoplanets around sun-like stars!\n\nInstead of just observing light dips during transits, we will actually capture direct pixels of reflected light from planets like Kepler-186f, allowing us to map oceans, continents, and cloud cover over time!",
    likes: 730,
    replyCount: 18,
    days: 6
  },
  {
    author: "Starbound_Pioneer",
    avatarSeed: "StarPio2",
    text: "What would human culture look like after 500 years of living on Kepler-186f?\n\n- Art and architecture designed around soft amber/crimson sunlight.\n- Circadian rhythms adapted to a 130-day orbital calendar.\n- Architecture built with wider UV-filtering skylights to capture maximum near-IR heat.\n- Folklore and mythology revolving around the 4 inner sister planets (b, c, d, e) visible as bright evening stars.\n\nScience fiction becomes human history given enough time and determination.",
    likes: 640,
    replyCount: 15,
    days: 7
  },
  {
    author: "Julian_Cosmology",
    avatarSeed: "JulCosmo2",
    text: "A quick note on the Kepler-186 star's age:\n\nKepler-186 is estimated to be roughly 4 billion years old — very similar in age to our Sun (~4.6 billion years). Because M-dwarf stars burn their nuclear fuel extremely slowly, Kepler-186 will remain on the main sequence for several HUNDRED BILLION years!\n\nLong after our Sun expands into a red giant and incinerates Earth in 5 billion years, Kepler-186f will still be sitting quietly in its habitable zone. Red dwarf systems are the true marathon runners of the cosmos.",
    likes: 990,
    replyCount: 28,
    days: 3
  },
  {
    author: "Marcus_Physics_Grad",
    avatarSeed: "MarcPG2",
    text: "Question for anyone studying planetary geology:\n\nIf Kepler-186f has a radius 1.17 times Earth's, its mass is likely around 1.4 to 1.7 Earth masses (assuming iron-silicate composition).\n\nDoes higher mass mean internal radiogenic heating (decay of Uranium-238, Thorium-232, Potassium-40) lasts longer than on Earth? If so, plate tectonics and mantle convection could persist for tens of billions of years, providing an incredibly long-term stable thermostat!",
    likes: 410,
    replyCount: 13,
    days: 8
  },
  {
    author: "SciFi_Writer_Alex",
    avatarSeed: "SciFiAlex2",
    text: "I am writing an alien civilization chapter set on a world orbiting an M-dwarf star, and the details at 07:45 regarding atmospheric scattering were invaluable!\n\nBecause Rayleigh scattering scales with 1/λ^4, shorter blue wavelengths scatter much less under an M-dwarf star compared to Earth. The sky would not be azure blue, but a muted, dusty salmon or deep peach color during the day!\n\nThis kind of scientific grounding elevates sci-fi world-building from fantasy to plausible realism.",
    likes: 350,
    replyCount: 8,
    days: 9
  },
  {
    author: "Prof_David_Holloway",
    avatarSeed: "DaveHoll2",
    text: "I want to highlight how well this channel explains error bars and statistical confidence in astronomy.\n\nWhen declaring Kepler-186f as 'validated' rather than just a candidate, you correctly explained the Blender algorithm and statistical false-positive probability (< 0.1%). Showing how astronomers rule out background eclipsing binaries gives viewers genuine appreciation for the scientific method.",
    likes: 680,
    replyCount: 16,
    days: 5
  },
  {
    author: "Quantum_Foam_Researcher",
    avatarSeed: "QFoam2",
    text: "If we ever build laser interferometer arrays in deep space (like LISA or Big Bang Observer), we could detect micro-gravitational perturbations from exoplanets directly!\n\nCombining optical transit spectroscopy with gravitational wave astrometry will give us total mass, density, and orbital parameters with unprecedented sub-percent precision.",
    likes: 310,
    replyCount: 7,
    days: 10
  },
  {
    author: "Samantha_Space_Art",
    avatarSeed: "SamSpace2",
    text: "The landscape artwork at 13:10 showing a crystal-clear alien coastline with black vegetation reflecting the dim red sun was so inspiring that I started painting my own version on canvas tonight!\n\nAntigravity Studio is proof that science and art are two sides of the exact same coin.",
    likes: 420,
    replyCount: 9,
    days: 11
  },
  {
    author: "Brian_T_Engineering",
    avatarSeed: "BrianTEng2",
    text: "Let's do the math on relativistic travel to Kepler-186 (490 light-years):\n\n- At 0.1c (10% speed of light): 4,900 years journey\n- At 0.5c: 980 years journey\n- At 0.99c (gamma = 7.09): 495 years Earth time, but only 70 years ship time for passengers due to time dilation!\n\nWith constant 1g acceleration, a ship could reach Kepler-186 in just ~12 years of ship time! Relativity is the ultimate interstellar ticket.",
    likes: 1250,
    replyCount: 31,
    days: 2
  },
  {
    author: "Dr. Kenji Sato",
    avatarSeed: "KenjiSato2",
    text: "Konnichiwa from Japan! Our astronomy department loved your overview of Kepler-186f.\n\nThe explanation of planetary equilibrium temperature (Teq) vs actual surface temperature with greenhouse effect (Tsurf) was very clear. Many people don't realize Earth's Teq is -18°C without greenhouse gases, so Kepler-186f having a Teq of -85°C just means it needs a thicker atmosphere to be cozy!",
    likes: 740,
    replyCount: 15,
    days: 6
  },
  {
    author: "Astro_Girl_2026",
    avatarSeed: "AstroG26_2",
    text: "Whenever I feel stressed by daily life, I come to this channel and watch videos about distant worlds like Kepler-186f.\n\nIt puts everything into perspective. Out there, 490 light-years away, an entire Earth-sized world is orbiting its sun right now in total quiet, waiting for us to discover its secrets.",
    likes: 890,
    replyCount: 19,
    days: 4
  },
  {
    author: "Victor_Hugo_Physics",
    avatarSeed: "VicHugo2",
    text: "To quote Carl Sagan:\n'The cosmos is within us. We are made of star-stuff. We are a way for the cosmos to know itself.'\n\nStudying exoplanets like Kepler-186f is the ultimate expression of the cosmos looking back at itself through human eyes.",
    likes: 610,
    replyCount: 11,
    days: 12
  },
  {
    author: "Physics_Tutor_Dan",
    avatarSeed: "PhysTutor2",
    text: "Key takeaway summary for astronomy students:\n\n1. Exoplanet: Kepler-186f\n2. Distance: ~490 light-years (150 parsecs)\n3. Host Star: Kepler-186 (M1V dwarf star, ~0.54 Solar mass)\n4. Planet Radius: 1.17 Earth radii\n5. Orbital Period: 129.9 days\n6. Flux Received: 32% of Earth's solar irradiance\n7. Significance: First Earth-sized planet discovered in the conservative habitable zone of its star!",
    likes: 1120,
    replyCount: 22,
    days: 3
  },
  {
    author: "Clara_Oswald_Space",
    avatarSeed: "ClaraOsw2",
    text: "The concept of an 'eyeball Earth' where the side facing the star is a permanent desert ocean and the night side is frozen ice, with a ring of habitable twilight in between, is mind-blowing. Glad you clarified that 186f's distance makes full tidal locking less likely!",
    likes: 340,
    replyCount: 7,
    days: 13
  },
  {
    author: "David_C_Aerospace",
    avatarSeed: "DaveCAero2",
    text: "If we ever build a Solar Gravitational Lens (SGL) telescope array stationed at 550 AU from our Sun, we could use the Sun's own gravity to magnify Kepler-186f by a factor of 10^11!\n\nThat would yield 1,000x1,000 pixel surface resolution images showing continents, clouds, and seasonal vegetation shifts from 490 light years away! The technology is theoretically possible today.",
    likes: 580,
    replyCount: 14,
    days: 7
  },
  {
    author: "Nora_Al_Mansoori",
    avatarSeed: "NoraAlM2",
    text: "Another masterpiece video! Sharing this with my university's Space Sciences department. The graphics, scientific rigor, and soundtrack were all 10/10.",
    likes: 310,
    replyCount: 4,
    days: 14
  },
  {
    author: "Tom_Hardy_Voice",
    avatarSeed: "TomHVoice2",
    text: "490 light years? That's a long commute mate! Better pack plenty of sandwiches for the generational ship!",
    likes: 720,
    replyCount: 18,
    days: 5
  },
  {
    author: "Rachel_Green_Physics",
    avatarSeed: "RachGreen2",
    text: "The light curve graph at 03:20 showed how sensitive Kepler's photometer was. Detecting a 0.04% dip in brightness is like detecting a flea walking across a car headlight from miles away!",
    likes: 410,
    replyCount: 9,
    days: 10
  },
  {
    author: "Kevin_Space_Geek",
    avatarSeed: "KevSpGeek2",
    text: "Antigravity Studio has officially become my favorite YouTube channel. The quality of research and lack of sensationalism is so refreshing.",
    likes: 560,
    replyCount: 8,
    days: 8
  },
  {
    author: "Dr. Henrik Lindqvist",
    avatarSeed: "HenrikL2",
    text: "Greetings from Sweden! We appreciated your careful distinction between optimistic vs conservative habitable zones in exoplanetry science. Excellent rigor.",
    likes: 380,
    replyCount: 6,
    days: 11
  },
  {
    author: "Zoe_W_Astronomy",
    avatarSeed: "ZoeWAstro2",
    text: "Watching this video makes me feel so lucky to live in the era where we transitioned from wondering 'Are there other planets?' to cataloging thousands of alien solar systems!",
    likes: 670,
    replyCount: 12,
    days: 9
  },
  {
    author: "Astronomy_Daily",
    avatarSeed: "AstroDaily",
    text: "Fun fact: Kepler-186f was confirmed using the 'Validation by Multiplicity' technique! Systems with multiple transiting planets are statistically far less likely to be false positives than single-planet systems.",
    likes: 420,
    replyCount: 9,
    days: 7
  },
  {
    author: "Liam_Space_Enthusiast",
    avatarSeed: "LiamSE",
    text: "The rendering at 14:30 showing atmospheric refraction during twilight was stunning. Imagine seeing a sun twice as large as ours setting on a crimson horizon!",
    likes: 210,
    replyCount: 3,
    days: 8
  },
  {
    author: "Elena_Vance_Exo",
    avatarSeed: "ElenaVExo",
    text: "I wonder if Kepler-186f has active plate tectonics. Without plate tectonics to recycle carbon, the atmosphere would eventually lock up in rocks!",
    likes: 310,
    replyCount: 6,
    days: 12
  },
  {
    author: "Antigravity_Studio_Team",
    avatarSeed: "AGStudio2",
    text: "PINNED COMMENT:\nThank you all for watching! Which exoplanet would you like us to explore next? TRAPPIST-1e, K2-18b (the ocean world), or Proxima Centauri b?",
    likes: 2950,
    replyCount: 118,
    days: 0
  }
];

// --- VIDEO 3: RAW COMMENTS (ALCUBIERRE WARP DRIVE) ---
const vid3RawComments = [
  { author: "Marcus Thorne", avatarSeed: "MarcThorne", text: "Finally a video addressing the negative mass requirements for the Alcubierre drive! Can you do a follow-up on whether Wormholes and ER=EPR can bypass the energy condition?", likes: 450, replyCount: 18, days: 2 },
  { author: "Dr. Rachel Sterling", avatarSeed: "RachSter", text: "The explanation at 06:40 of the Casimir effect was eye-opening. Best explanation of warp metrics on YouTube.", likes: 320, replyCount: 7, days: 4 },
  { author: "Cosmic_Observer", avatarSeed: "CosObs", text: "Wait, so if you drop out of warp, would the blueshifted Hawking radiation at 13:00 annihilate whatever planetary system you arrive at? That's terrifying!", likes: 580, replyCount: 24, days: 1 },
  { author: "Tech_Vanguard", avatarSeed: "TechVan", text: "Please make a dedicated episode on Quantum Entanglement and whether it can transmit information FTL!", likes: 410, replyCount: 12, days: 3 },
  { author: "Sarah Jenkins", avatarSeed: "SarahJ", text: "I'm a theoretical physics student and your visual analogies for contracted vs expanded space at 03:15 are the clearest I've seen.", likes: 215, replyCount: 4, days: 5 },
  { author: "David Vance", avatarSeed: "DaveV", text: "Would an Alcubierre warp bubble allow closed timelike curves (time travel)? You hinted at it, please make a full video on that!", likes: 390, replyCount: 15, days: 2 },
  { author: "AstroNerd99", avatarSeed: "AstroN99", text: "What about White's interferometer experiment? Did NASA ever detect nanoscale warp bubbles?", likes: 185, replyCount: 6, days: 6 },
  { author: "Liam O'Connor", avatarSeed: "LiamOC", text: "Can you do a video on the Kardashev scale and how a Type II civilization would power a warp drive?", likes: 295, replyCount: 9, days: 7 },
  { author: "Elena Rostova", avatarSeed: "ElenaR", text: "Loved the timestamp breakdown. Shared this with my physics study group!", likes: 120, replyCount: 1, days: 8 },
  { author: "Hyperion_01", avatarSeed: "Hyp01", text: "Pure science gold. No clickbait, just solid general relativity.", likes: 240, replyCount: 3, days: 4 }
];

// --- VIDEO 4: RAW COMMENTS (KERR BLACK HOLE) ---
const vid4RawComments = [
  { author: "Prof_Holloway", avatarSeed: "Holloway", text: "The ergosphere and Penrose process at 02:50 was explained so intuitively! Imagine civilizations harvesting energy from spinning black holes.", likes: 890, replyCount: 32, days: 1 },
  { author: "Maya Lin", avatarSeed: "MayaLin", text: "At 09:45 when you explained the Cauchy horizon mass inflation firewall, that actually gave me chills. Nothing survives that radiation spike.", likes: 640, replyCount: 19, days: 3 },
  { author: "Dr. Aris Thorne", avatarSeed: "ArisThorne", text: "Please do a video on Hawking Radiation and the Black Hole Information Paradox next! It connects directly with this.", likes: 720, replyCount: 28, days: 2 },
  { author: "VectorSpace", avatarSeed: "VectorS", text: "Wait, Roy Kerr actually proved the ring singularity isn't a point? Does passing through the ring really lead to negative space/antigravity spacetime?", likes: 430, replyCount: 14, days: 4 },
  { author: "Derek Foster", avatarSeed: "DerekF", text: "This is easily your best video yet. 1.5M views well deserved! The frame-dragging animation at 04:10 was mesmerizing.", likes: 310, replyCount: 6, days: 5 },
  { author: "Sophia Rossi", avatarSeed: "SophR", text: "Could we ever send a probe into a supermassive black hole and transmit data before reaching the Cauchy horizon?", likes: 260, replyCount: 11, days: 6 },
  { author: "Gabriel Silva", avatarSeed: "GabS", text: "Can you explore white holes and whether the Big Bang was actually the white-hole output of a parent black hole?", likes: 510, replyCount: 21, days: 3 },
  { author: "Chloe Zhang", avatarSeed: "ChloeZ", text: "The pacing, narration, and mathematical accuracy are unmatched. You deserve millions of subscribers.", likes: 190, replyCount: 2, days: 8 }
];

// --- VIDEO 5: RAW COMMENTS (DARK FOREST THEORY) ---
const vid5RawComments = [
  { author: "Julian Hays", avatarSeed: "JulianH", text: "The Dark Forest theory is the scariest existential concept I've ever encountered. The chain of suspicion at 06:15 was chilling.", likes: 530, replyCount: 25, days: 2 },
  { author: "Chris Gallagher", avatarSeed: "ChrisG", text: "Why are humans actively sending METI signals if this theory is even 1% likely? We are screaming in a quiet forest!", likes: 470, replyCount: 19, days: 3 },
  { author: "Jessica Reed", avatarSeed: "JessR", text: "Please do a video on Megastructures: Dyson Spheres, Ringworlds, and Matrioshka Brains next!", likes: 610, replyCount: 22, days: 1 },
  { author: "Tomasz Nowak", avatarSeed: "TomN", text: "I think the Great Filter hypothesis is more plausible than the Dark Forest. You should make a video comparing all Fermi Paradox solutions!", likes: 380, replyCount: 14, days: 4 },
  { author: "Priya Sharma", avatarSeed: "PriyaS", text: "Can you make a video on the James Webb Telescope finding potential biosignatures on exoplanet K2-18b?", likes: 490, replyCount: 16, days: 2 },
  { author: "Lucas Dubois", avatarSeed: "LucasD", text: "The game theory breakdown at 03:00 was brilliant. Subscribed immediately!", likes: 175, replyCount: 4, days: 5 }
];

// Formatter function to convert raw comment data to YouTube API item format
const formatCommentList = (videoId, rawList, publishDate) => {
  return rawList.map((item, index) => {
    const publishedAt = getDateBetween(publishDate, item.days || 20);
    return {
      id: `${videoId}-c-${index + 1}`,
      author: item.author,
      authorAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.avatarSeed}`,
      text: item.text.replace(/\n/g, '<br/>'),
      likes: item.likes,
      publishedAt,
      replyCount: item.replyCount
    };
  });
};

export const getMockComments = (videoId, count = 100) => {
  let comments = [];
  let video = mockVideos.find(v => v.id === videoId) || mockVideos[0];

  if (videoId === 'vid2') {
    comments = formatCommentList('vid2', vid2RawComments, '2026-05-01');
  } else if (videoId === 'vid3') {
    comments = formatCommentList('vid3', vid3RawComments, '2026-04-18');
  } else if (videoId === 'vid4') {
    comments = formatCommentList('vid4', vid4RawComments, '2026-04-02');
  } else if (videoId === 'vid5') {
    comments = formatCommentList('vid5', vid5RawComments, '2026-03-15');
  } else {

    // Default to Video 1
    comments = formatCommentList('vid1', vid1RawComments, '2026-05-15');
  }

  // Ensure exact count requested
  const slicedComments = comments.slice(0, count);

  return {
    comments: slicedComments,
    totalComments: comments.length
  };
};

export const generateDailyStats = () => {
  const rows = [];
  const startDate = new Date('2023-01-01');
  const endDate = new Date();

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayStr = d.toISOString().split('T')[0];

    // Add seasonality and noise for 2 videos
    const dayOfWeek = d.getDay();
    const seasonality = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.25 : 0.95;
    const uploadSpike = (d.getDate() === 1 || d.getDate() === 15) ? 2.2 : 1.0;

    const views = Math.floor((Math.random() * 1500 + 2000) * seasonality * uploadSpike);
    const likes = Math.floor(views * (Math.random() * 0.06 + 0.04));
    const dislikes = Math.floor(views * (Math.random() * 0.001 + 0.0005));
    const comments = Math.floor(views * (Math.random() * 0.008 + 0.004));
    const shares = Math.floor(views * (Math.random() * 0.015 + 0.008));
    const subscribersGained = Math.floor(views * (Math.random() * 0.004 + 0.002));
    const subscribersLost = Math.floor(subscribersGained * 0.12);
    const estimatedMinutesWatched = Math.floor(views * (Math.random() * 3 + 7));
    const averageViewDuration = Math.floor((estimatedMinutesWatched / views) * 60);

    rows.push([
      dayStr,
      views,
      likes,
      dislikes,
      comments,
      shares,
      subscribersGained,
      subscribersLost,
      estimatedMinutesWatched,
      averageViewDuration
    ]);
  }
  return rows;
};

export const generateVideoDailyStats = (videoId) => {
  const video = mockVideos.find(v => v.id === videoId) || mockVideos[0];
  const rows = [];
  const startDate = new Date(video.publishDate);
  const endDate = new Date();

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayStr = d.toISOString().split('T')[0];

    const diffTime = Math.abs(d - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const decay = 1 / (1 + diffDays * 0.15);
    const baseViews = (video.views / 20) * decay;

    const dayOfWeek = d.getDay();
    const seasonality = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.2 : 0.95;

    const views = Math.floor((Math.random() * (baseViews * 0.4) + (baseViews * 0.8)) * seasonality);
    const likes = Math.floor(views * 0.05);
    const dislikes = Math.floor(views * 0.001);
    const comments = Math.floor(views * 0.005);
    const shares = Math.floor(views * 0.01);
    const estimatedMinutesWatched = Math.floor(views * 8.5);
    const averageViewDuration = 510;

    rows.push([
      dayStr,
      views,
      likes,
      dislikes,
      comments,
      shares,
      estimatedMinutesWatched,
      averageViewDuration
    ]);
  }
  return rows;
};

export const getMockCountryStats = () => {
  return {
    headers: ['country', 'views', 'estimatedMinutesWatched'],
    rows: [
      ['US', 850000, 7200000],
      ['GB', 310000, 2600000],
      ['CA', 270000, 2300000],
      ['DE', 210000, 1800000],
      ['IN', 190000, 1600000],
      ['AU', 150000, 1250000],
      ['FR', 120000, 1000000],
      ['BR', 95000, 800000],
      ['JP', 80000, 680000],
      ['NL', 60000, 500000]
    ]
  };
};

export const getMockVideoCountryStats = (videoId) => {
  const video = mockVideos.find(v => v.id === videoId) || mockVideos[0];
  const totalViews = video.views;

  return {
    headers: ['country', 'views', 'estimatedMinutesWatched'],
    rows: [
      ['US', Math.floor(totalViews * 0.35), Math.floor(totalViews * 0.35 * 8.5)],
      ['GB', Math.floor(totalViews * 0.15), Math.floor(totalViews * 0.15 * 8.5)],
      ['CA', Math.floor(totalViews * 0.12), Math.floor(totalViews * 0.12 * 8.5)],
      ['DE', Math.floor(totalViews * 0.10), Math.floor(totalViews * 0.10 * 8.5)],
      ['IN', Math.floor(totalViews * 0.08), Math.floor(totalViews * 0.08 * 8.5)],
      ['AU', Math.floor(totalViews * 0.06), Math.floor(totalViews * 0.06 * 8.5)],
      ['FR', Math.floor(totalViews * 0.05), Math.floor(totalViews * 0.05 * 8.5)],
      ['BR', Math.floor(totalViews * 0.04), Math.floor(totalViews * 0.04 * 8.5)],
      ['JP', Math.floor(totalViews * 0.03), Math.floor(totalViews * 0.03 * 8.5)],
      ['NL', Math.floor(totalViews * 0.02), Math.floor(totalViews * 0.02 * 8.5)]
    ]
  };
};
