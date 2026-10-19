// ─────────────────────────────────────────────────────────────────────────────
//  ARMAAN MUJAWAR — PORTFOLIO CONTENT (OFFICIAL STUDIO ENGINE)
// ─────────────────────────────────────────────────────────────────────────────
window.CONTENT = {
  profile: {
    name: 'Armaan Mujawar',
    role: 'Digital Artist · Creative Developer',
    greeting: "Hey, I'm Armaan! Digital artist, designer & creative developer. Look around my studio.",
  },

  about: {
    title: 'About Me', icon: '◆',
    subtitle: 'Digital artist with a passion for gaming keyart, 3D branding & code',
    sections: [
      { type: 'image', src: 'assets/media/Profile.png', alt: 'Armaan Mujawar' },
      { type: 'text', body: "Hello! I'm Armaan Mujawar, a passionate digital artist and designer. I thrive on new challenges and am always looking to push my creative boundaries across gaming keyart, 3D brand systems, and interactive code." },
      { type: 'list', title: 'What I Build', items: [
        '🎮  ESPORTS KEYART — Tournament visuals, YouTube thumbnails, and matte paintings.',
        '🔷  3D BRANDING — Geometric identities, Cinema 4D renders, and vector marks.',
        '💻  CREATIVE CODE — Interactive web experiences, Canvas animations, and frontend apps.',
        '🚀  COMMERCIAL ART — Advertising posters, editorial typography, and high-impact retouching.',
      ] },
      { type: 'tags', title: 'Creative Stack', items: ['Photoshop', 'Blender', 'Cinema 4D', 'Figma', 'React', 'TypeScript', 'Tailwind CSS', 'Matter.js'] },
      { type: 'text', body: 'Tip: walk up to things and press E (or click them). Try petting the cat or playing the record player.' },
    ],
  },

  contact: {
    title: "Let's Connect", icon: '✉',
    subtitle: 'Available for freelance keyart, 3D identity & creative projects.',
    sections: [
      { type: 'text', body: "I'm currently available for freelance work and collaborations. Drop me a line through any channel below:" },
      { type: 'links', items: [
        { label: 'LinkedIn', href: 'https://www.linkedin.com/in/armaan-mujawar-8a33362b9/', note: 'Armaan Mujawar' },
        { label: 'Twitter / X', href: 'https://x.com/Araman245', note: '@Araman245' },
        { label: 'Discord', href: 'https://discordapp.com/users/923904253548978206', note: 'armaan245' },
        { label: 'GitHub', href: 'https://github.com/Armaan245', note: '@Armaan245' },
      ] },
    ],
  },

  datadukan: {
    title: 'DataDukan', icon: '📊',
    subtitle: 'Decentralized Data Marketplace & Analytics Suite',
    sections: [
      { type: 'image', src: 'assets/media/Vantagelab.png', alt: 'DataDukan Platform' },
      { type: 'text', body: 'A modern, high-performance data exchange platform built for real-time dataset discovery, secure licensing, and automated analytical pipelines. Empowers organizations and developers to monetize and consume verified data streams seamlessly.' },
      { type: 'stats', items: [
        { value: '10k+', label: 'Active Datasets' },
        { value: '<50ms', label: 'Query Latency' },
        { value: '99.9%', label: 'Uptime SLA' },
      ] },
      { type: 'tags', items: ['React', 'TypeScript', 'Data Pipelines', 'Analytics Engine', 'Marketplace', 'PostgreSQL', 'Tailwind CSS'] },
    ],
  },

  vaultdoc: {
    title: 'VaultDoc', icon: '🔐',
    subtitle: 'Zero-Knowledge Encrypted Document Vault',
    sections: [
      { type: 'image', src: 'assets/media/BGMI(Mere He sab se aacha hai).png', alt: 'VaultDoc Security' },
      { type: 'text', body: 'Enterprise-grade encrypted document repository engineered with zero-knowledge cryptographic safeguards, fine-grained access policies, tamper-proof audit trails, and instant secure sharing permissions.' },
      { type: 'stats', items: [
        { value: 'AES-256', label: 'Encryption' },
        { value: 'Zero-Trust', label: 'Architecture' },
        { value: 'SOC 2', label: 'Compliant' },
      ] },
      { type: 'tags', items: ['Cloud Security', 'Zero-Knowledge', 'Cryptography', 'Document Vault', 'Access Control', 'OAuth 2.0'] },
    ],
  },

  skills: {
    title: 'Skills & Tools', icon: '📚',
    subtitle: 'Specialized across digital art pipelines and modern frontend web',
    sections: [
      { type: 'tags', title: 'Design & 3D', items: ['Adobe Photoshop', 'Blender', 'Cinema 4D', 'Figma', 'Matte Painting', 'Color Grading', 'After Effects'] },
      { type: 'tags', title: 'Code & Web', items: ['React', 'TypeScript', 'Tailwind CSS', 'HTML5 Canvas', 'Matter.js', 'Vite', 'Git & GitHub'] },
      { type: 'list', title: 'Workflow', items: [
        'Photoshop — High-impact esports compositing, cinematic lighting, dramatic rim glow, and photobashing.',
        '3D & CGI — Staging geometric assets, lighting, and camera passes in Blender and Cinema 4D.',
        'Modern Web — Crafting fluid interactive web experiences with React, TypeScript, and Canvas.',
      ] },
    ],
  },

  ideas: {
    title: 'COD Warfare Visuals', icon: '💥',
    subtitle: 'Esports visual design & cinematic weapon rigs',
    sections: [
      { type: 'image', src: 'assets/media/COD2.png', alt: 'COD Warfare Visuals' },
      { type: 'text', body: 'High-octane 3D weapon rigs, lens flares, combat motion blur, and cinematic atmosphere designed for competitive streaming.' },
      { type: 'tags', items: ['Action Art', '3D Rigs', 'Compositing', 'Esports'] },
    ],
  },

  music: {
    title: 'Now Playing', icon: '♪',
    subtitle: 'Ambient Lo-Fi beats for the studio',
    sections: [
      { type: 'music', title: 'Studio Radio' },
      { type: 'text', body: 'A cozy lo-fi loop for the studio. Synthesized Rhodes chords with vinyl crackle generated completely in code.' },
    ],
  },

  github: {
    username: 'Armaan245',
    title: 'GitHub', icon: '⌥',
    subtitle: 'Live code contributions & repositories',
    sections: [
      { type: 'github-stats' },
      { type: 'contrib' },
      { type: 'links', items: [{ label: 'View my GitHub', href: 'https://github.com/Armaan245', note: '@Armaan245' }] },
    ],
  },

  experience: {
    title: 'Creative Works', icon: '⌘',
    subtitle: 'Commercial design & digital art vault',
    sections: [
      { type: 'gallery', title: 'Selected Commercial & Art Projects', tall: true, items: [
        { src: 'assets/media/CetaphilAD01.png', alt: 'Cetaphil Commercial Skincare Poster' },
        { src: 'assets/media/Chamber1-Recovered.jpg', alt: 'Valorant Chamber Agent Concept' },
        { src: 'assets/media/STU.png', alt: 'Interstellar Cosmos Wallpaper' },
        { src: 'assets/media/PROMPTMFinal.png', alt: 'Prompt Master Visual Art' },
        { src: 'assets/media/LogoSTU01.png', alt: 'STU Studio Identity' },
      ] },
    ],
  },

  running: {
    title: 'Cetaphil Skincare Ad', icon: '🧴',
    subtitle: 'Brutalist commercial product poster concept',
    sections: [
      { type: 'image', src: 'assets/media/CetaphilAD01.png', alt: 'Cetaphil Poster' },
      { type: 'text', body: 'Brutalist commercial poster concept balancing high-contrast skincare product photography with crisp geometric layouts and modern editorial typography.' },
      { type: 'tags', items: ['Commercial', 'Poster Design', 'Typography', 'Retouching', 'Brutalism'] },
    ],
  },

  resume: {
    title: 'Watchparty YouTube Keyart', icon: '🎬',
    subtitle: 'High-retention cinematic YouTube thumbnail',
    sections: [
      { type: 'image', src: 'assets/media/Watchtogther.png', alt: 'Watchparty YouTube Keyart' },
      { type: 'text', body: 'High-retention cinematic YouTube thumbnail designed with dynamic color grading, dramatic rim lighting, and focal depth to maximize viewer engagement and click-through rates.' },
      { type: 'tags', items: ['YouTube Keyart', 'CTR Design', 'Compositing', 'Lighting Theory'] },
    ],
  },

  location: {
    title: 'Where I Am', icon: '🌍',
    subtitle: 'Based in India · Working Globally',
    sections: [
      { type: 'clock', tz: 'Asia/Kolkata', label: 'My local time' },
    ],
  },

  reading: {
    title: 'Visual Art Vault', icon: '🎨',
    subtitle: 'Complete design and concept art archive',
    sections: [
      { type: 'gallery', title: 'High-Resolution Art Vault', tall: true, items: [
        { src: 'assets/media/BGMI(Mere He sab se aacha hai).png', alt: 'BGMI Esports Keyart' },
        { src: 'assets/media/Vantagelab.png', alt: 'Vantage Lab 3D' },
        { src: 'assets/media/Watchtogther.png', alt: 'Watchparty Keyart' },
        { src: 'assets/media/COD2.png', alt: 'COD Warfare' },
        { src: 'assets/media/CetaphilAD01.png', alt: 'Cetaphil Commercial' },
        { src: 'assets/media/STU.png', alt: 'Interstellar Cosmos' },
        { src: 'assets/media/Chamber1-Recovered.jpg', alt: 'Valorant Chamber' },
        { src: 'assets/media/PROMPTMFinal.png', alt: 'Prompt Master' },
        { src: 'assets/media/LogoSTU01.png', alt: 'STU Logo' },
      ] },
    ],
  },
};

// Aliases for backward compatibility
window.CONTENT.trustyy = window.CONTENT.datadukan;
window.CONTENT.gooddex = window.CONTENT.vaultdoc;
