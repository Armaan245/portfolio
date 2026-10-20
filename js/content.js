// ─────────────────────────────────────────────────────────────────────────────
//  ARAMAN MUJAWAR — PORTFOLIO CONTENT (OFFICIAL STUDIO ENGINE)
// ─────────────────────────────────────────────────────────────────────────────
window.CONTENT = {
  profile: {
    name: 'Araman Mujawar',
    role: 'Digital Artist · Creative Developer',
    greeting: "Hey, I'm Araman! Digital artist, designer & creative developer. Look around my studio.",
  },

  about: {
    title: 'About Me', icon: '◆',
    subtitle: 'Digital artist & developer passionate about esports keyart, brand design & code',
    sections: [
      { type: 'image', src: 'assets/media/profile-armaan.jpg', alt: 'Araman Mujawar', class: 'portrait' },
      { type: 'text', body: "Hello! I'm Araman Mujawar, a passionate digital artist, designer & developer. I thrive on new challenges and am always looking to push my creative boundaries across esports keyart, brand identities, and interactive software." },
      { type: 'list', title: 'What I Build', items: [
        '📦  DATADUKAN (STARTUP) — AI-driven merchant POS, inventory & voice ledger app built with Flutter & FastAPI.',
        '🔐  VAULTDOC — Zero-knowledge client-side encrypted document vault engineered with AES-256 safeguards.',
        '🎮  ESPORTS & COMMERCIAL KEYART — Tournament graphics, high-CTR YouTube thumbnails, and matte paintings.',
        '💻  INTERACTIVE WEB & APPS — Gamified pixel studio engines, fluid Canvas animations, and responsive web apps.',
      ] },
      { type: 'tags', title: 'Core Stack', items: ['Flutter', 'React', 'TypeScript', 'FastAPI', 'Supabase', 'Photoshop', 'Figma', 'After Effects', 'Tailwind CSS'] },
      { type: 'text', body: 'Tip: walk up to things and press E (or click them). Try petting the cat or playing the record player.' },
    ],
  },

  contact: {
    title: "Let's Connect", icon: '✉',
    subtitle: 'Available for freelance keyart, brand identity & creative dev projects.',
    sections: [
      { type: 'text', body: "I'm currently available for freelance work and collaborations. Drop me a line through any channel below:" },
      { type: 'links', items: [
        { label: 'LinkedIn', href: 'https://www.linkedin.com/in/armaan-mujawar-8a33362b9/', note: 'Araman Mujawar' },
        { label: 'Twitter / X', href: 'https://x.com/Araman245', note: '@Araman245' },
        { label: 'Discord', href: 'https://discordapp.com/users/923904253548978206', note: 'armaan245' },
        { label: 'GitHub', href: 'https://github.com/Armaan245', note: '@Armaan245' },
      ] },
    ],
  },

  datadukan: {
    title: 'DATADUKAN', icon: '📦',
    subtitle: 'AI-Powered Shop & Inventory Platform · Indian Retail',
    sections: [
      { type: 'gallery', tall: true, items: [
        { src: 'assets/media/datadukan-splash.png', alt: 'DataDukan Splash', caption: 'Flutter Mobile App' },
        { src: 'assets/media/datadukan-home.png', alt: 'DataDukan Merchant Home', caption: 'Merchant Home & UPI Gross' },
        { src: 'assets/media/datadukan-transactions.png', alt: 'Transactions & Ledger', caption: 'Transactions & Udhaar Ledger' },
        { src: 'assets/media/datadukan-cards.png', alt: 'DataDukan One Card', caption: 'DataDukan One Card' },
        { src: 'assets/media/datadukan-cards-limits.png', alt: 'Card Limits & Controls', caption: 'Card Settings & Limits' },
        { src: 'assets/media/datadukan-menu.png', alt: 'App Navigation & Services', caption: 'Smart OCR & Invoicing Menu' },
        { src: 'assets/media/datadukan-banking.png', alt: 'Banking & Tally Prime Sync', caption: 'Banking & Tally Prime Sync' },
        { src: 'assets/media/datadukan-hardware.png', alt: 'POS & Soundbox Controls', caption: 'Thermal Printer & Soundbox' },
        { src: 'assets/media/datadukan-settings.png', alt: 'Shop Settings & Billing', caption: 'Shop Settings & Team' },
        { src: 'assets/media/datadukan-customization.png', alt: 'E-Invoicing & Customization', caption: 'E-Invoicing & Customization' },
      ] },
      { type: 'text', body: 'Empowering Indian retail merchants to run shop inventory, billing, and supplier ledgers with voice and AI vision.' },
      { type: 'list', title: 'How It Works', items: [
        'Multi-Role Portals: Streamlined roles for Merchants, Shoppers, and Suppliers.',
        'Gemini AI Vision & OCR: Snap a photo of paper invoices to auto-populate inventory and stock entries.',
        'Voice-Driven Input: Dictate bills and items hands-free in English, Hindi, or Marathi.',
        'Scalable Architecture: Engineered on Flutter, FastAPI, Supabase with Row Level Security, and Tally export.',
      ] },
      { type: 'tags', items: ['Flutter', 'FastAPI', 'Supabase (RLS)', 'Gemini AI', 'Firebase', 'RetailTech'] },
    ],
  },

  vaultdoc: {
    title: 'VAULTDOC', icon: '🔐',
    subtitle: 'Zero-Knowledge Encrypted Document Vault · Built on Tauri',
    sections: [
      { type: 'video', src: 'assets/media/vaultdoc.mp4', poster: 'assets/media/vaultdoc-preview.png', alt: 'VaultDoc Encryption Platform' },
      { type: 'text', body: 'Zero-knowledge encrypted document repository and local codebase intelligence platform, built on Tauri for a 100% private, air-gapped native desktop experience.' },
      { type: 'list', title: 'How It Works', items: [
        'Built on Tauri: Ultra-lightweight, high-performance native desktop runtime powered by Tauri & Rust.',
        'Client-Side AES-256-GCM: Documents and data are encrypted locally in the desktop app before transmission.',
        'Zero-Knowledge Privacy: Master cryptographic keys are never sent to or stored on any server.',
        'Time-Limited Access: Share self-destructing links with customizable expiration and instant revocation.',
        'Cryptographic Audit Trail: SHA-256 integrity verification across every file upload and access event.',
      ] },
      { type: 'tags', items: ['Tauri', 'Rust', 'Zero-Knowledge', 'Local-First', 'AES-256-GCM', 'FastAPI', 'Open Source'] },
      { type: 'text', body: 'Join developers and teams testing the private local-first beta:' },
      { type: 'links', items: [
        { label: 'Join Private Beta', href: 'https://www.vaultdoc.tech/', note: 'vaultdoc.tech', highlight: true },
      ] },
    ],
  },

  skills: {
    title: 'Skills & Tools', icon: '📚',
    subtitle: 'Specialized across creative visual design and modern frontend engineering',
    sections: [
      { type: 'tags', title: 'Design & Creative', items: ['Adobe Photoshop', 'Figma', 'After Effects', 'Matte Painting', 'Color Grading', 'Retouching', 'Poster Design'] },
      { type: 'tags', title: 'Code & Web', items: ['React', 'TypeScript', 'Tailwind CSS', 'Flutter', 'Tauri', 'HTML5 Canvas', 'Vite', 'Git & GitHub'] },
      { type: 'list', title: 'Workflow', items: [
        'Photoshop — High-impact esports compositing, cinematic lighting, dramatic rim glow, and photobashing.',
        'Figma & Motion — Crafting brand identity systems, UI marks, and motion graphics with After Effects.',
        'Modern Web & Apps — Building fluid, high-performance interactive experiences with React, Tauri, and Flutter.',
      ] },
    ],
  },

  ideas: {
    title: 'STUDIO CREED', icon: '⚡',
    subtitle: 'Principles behind bold art & better code',
    sections: [
      { type: 'list', title: 'Core Principles', items: [
        '🎨  BOLD VISUAL IDENTITY — Art should never just fill empty space; it must set an unmistakable mood, tell a story, and command attention at first glance.',
        '⚙️  ENGINEERING WITH PURPOSE — Write clean, maintainable, and resilient code that solves real-world friction for actual users and merchants.',
        '⚡  SPEED WITHOUT SLOPPINESS — Iterate fast, prototype aggressively, but hold every interaction, layout, and pixel to an uncompromising standard.',
        '🔷  CROSS-DISCIPLINARY CRAFT — Refuse to stay in one lane. Master both cinematic visual storytelling and modern full-stack software architecture.',
      ] },
      { type: 'tags', title: 'Guiding Values', items: [
        'Cinematic Art', 'User-First UX', 'Clean Architecture', 'Zero Compromise', 'Rapid Iteration', 'Modern Aesthetics'
      ] },
      { type: 'text', body: '“Great ideas are only the starting point — execution, taste, and relentless refinement turn concepts into work that lasts.”' },
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
    title: 'EXPERIENCE', icon: '⌘',
    subtitle: 'My journey so far',
    sections: [
      { type: 'timeline', items: [
        { when: 'Jan 2026 – Present', what: 'Lead Developer & Co-Founder · DataDukan', note: 'Built DataDukan Pro for retail merchants using Flutter, FastAPI, Supabase (RLS), and Gemini-based OCR & voice input.' },
        { when: '2026', what: 'Creator & Developer · VaultDoc', note: 'Zero-knowledge encrypted document vault engineered with AES-256 safeguards and client-side access control.' },
        { when: 'Jan 2026 – Present', what: 'Cloud & Automation Specialist · Azure for Students', note: 'Deploy and manage n8n workflow automation instances on Microsoft Azure, optimizing server-side resources.' },
        { when: '2026', what: 'Hardware & ML Developer · BioGuardian (SIH 2026)', note: 'Designed microfluidic chip sensing and an RDKit + Random Forest / XGBoost model with a Next.js/FastAPI dashboard.' },
        { when: '2025', what: 'Embedded Systems & Robotics · e-Yantra, IIT Bombay', note: 'Scored 99/100 Merit Certificate in eLSI: Basics of Embedded Systems, ATmega2560 interfacing, and register manipulation.' },
      ] },
      { type: 'links', items: [
        { label: 'Full resume (PDF)', href: 'resume.pdf', note: 'AramanMujawar2026.pdf', highlight: true },
      ] },
    ],
  },

  resume: {
    title: 'RESUME', icon: '📑',
    subtitle: 'The one-page version',
    sections: [
      { type: 'text', body: 'B.Tech student in Artificial Intelligence & Data Science (2024–2028) and startup co-founder building AI-powered software for Indian retail merchants. Lead Developer & Co-Founder @ DataDukan.' },
      { type: 'links', items: [
        { label: 'Open resume (PDF)', href: 'resume.pdf', note: 'AramanMujawar2026.pdf', highlight: true },
      ] },
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
