'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { 
  Key, 
  Shield, 
  MessageSquare, 
  Github, 
  ExternalLink,
  Menu,
  X,
  Zap,
  Lock,
  Globe,
  ArrowRight,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { LoginButton } from '@/components/auth/LoginButton';
import { useAuthStore } from '@/lib/stores/auth-store';

// Floating Paths Background Component
function FloatingPaths({ position }: { position: number }) {
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
      380 - i * 5 * position
    } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
      152 - i * 5 * position
    } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
      684 - i * 5 * position
    } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.03,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none">
      <svg
        className="w-full h-full text-neutral-950 dark:text-white"
        viewBox="0 0 696 316"
        fill="none"
      >
        <title>Background Paths</title>
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={0.1 + path.id * 0.02}
            initial={{ pathLength: 0.3, opacity: 0.6 }}
            animate={{
              pathLength: 1,
              opacity: [0.3, 0.6, 0.3],
              pathOffset: [0, 1, 0],
            }}
            transition={{
              duration: 20 + Math.random() * 10,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          />
        ))}
      </svg>
    </div>
  );
}

// Navigation Component
function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  const navLinks = [
    { name: 'Features', href: '#features' },
    { name: 'How it Works', href: '#how-it-works' },
    { name: 'GitHub', href: 'https://github.com', external: true },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md border-b border-neutral-200/50 dark:border-neutral-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-neutral-900 dark:bg-white rounded-lg flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white dark:text-neutral-900" />
            </div>
            <span className="text-lg font-semibold text-neutral-900 dark:text-white tracking-tight">
              NostrChat
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                target={link.external ? '_blank' : undefined}
                rel={link.external ? 'noopener noreferrer' : undefined}
                className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                {link.name}
                {link.external && <ExternalLink className="inline w-3 h-3 ml-1" />}
              </a>
            ))}
          </div>

          {/* CTA Button */}
          <div className="hidden md:block">
            {isAuthenticated ? (
              <button
                onClick={() => router.push('/app')}
                className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg text-sm font-medium hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
              >
                Launch App
              </button>
            ) : (
              <LoginButton className="px-4 py-2 text-sm" />
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-neutral-600 dark:text-neutral-400"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden py-4 border-t border-neutral-200 dark:border-neutral-800"
          >
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  target={link.external ? '_blank' : undefined}
                  rel={link.external ? 'noopener noreferrer' : undefined}
                  className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.name}
                </a>
              ))}
              <div className="pt-2">
                {isAuthenticated ? (
                  <button
                    onClick={() => router.push('/app')}
                    className="w-full px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg text-sm font-medium"
                  >
                    Launch App
                  </button>
                ) : (
                  <LoginButton className="w-full px-4 py-2 text-sm" />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </nav>
  );
}

// Hero Section
function HeroSection() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-white dark:bg-neutral-950">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-neutral-100 dark:bg-neutral-900 rounded-full text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-8">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            Built on Nostr Protocol
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-neutral-900 dark:text-white mb-6">
            Team Chat.
            <br />
            <span className="text-neutral-500 dark:text-neutral-400">Uncensorable. Yours.</span>
          </h1>

          {/* Sub-headline */}
          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-neutral-600 dark:text-neutral-400 mb-10 leading-relaxed">
            The collaboration feel you love, built on the Nostr protocol. 
            Your data stays on our secure relay, encrypted end-to-end.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {isAuthenticated ? (
              <button
                onClick={() => router.push('/app')}
                className="w-full sm:w-auto px-8 py-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl font-semibold text-lg hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all shadow-lg hover:shadow-xl"
              >
                Launch App
                <ArrowRight className="inline w-5 h-5 ml-2" />
              </button>
            ) : (
              <LoginButton className="w-full sm:w-auto px-8 py-4 text-lg shadow-lg hover:shadow-xl" />
            )}
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-4 bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-xl font-semibold text-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors border border-neutral-200 dark:border-neutral-800"
            >
              <Github className="inline w-5 h-5 mr-2" />
              View on GitHub
            </a>
          </div>
        </motion.div>

        {/* App Mockup Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-16 relative"
        >
          <div className="aspect-video max-w-4xl mx-auto bg-neutral-100 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden">
            <div className="h-full flex items-center justify-center">
              <div className="text-center p-8">
                <MessageSquare className="w-16 h-16 mx-auto text-neutral-300 dark:text-neutral-700 mb-4" />
                <p className="text-neutral-400 dark:text-neutral-600 text-sm">App Interface Preview</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// Problem/Solution Section
function WhySection() {
  const comparisons = [
    {
      traditional: "Centralized servers can go down",
      nostr: "Self-hosted relay with high availability infrastructure",
      icon: Zap,
    },
    {
      traditional: "Company owns and reads your messages",
      nostr: "End-to-end encryption, only you have the keys",
      icon: Lock,
    },
    {
      traditional: "Locked into one platform forever",
      nostr: "Portable identity, switch apps anytime",
      icon: Globe,
    },
  ];

  return (
    <section id="how-it-works" className="py-24 sm:py-32 bg-neutral-50 dark:bg-neutral-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-neutral-900 dark:text-white mb-4">
            Stop Renting Your Conversations.
          </h2>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
            Traditional team chat apps own your data. We believe you should.
          </p>
        </motion.div>

        <div className="space-y-6">
          {comparisons.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="grid md:grid-cols-2 gap-4"
            >
              {/* Traditional */}
              <div className="p-6 bg-white dark:bg-neutral-950 rounded-xl border border-neutral-200 dark:border-neutral-800">
                <div className="flex items-start gap-4">
                  <XCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-neutral-500 dark:text-neutral-500 mb-1">Traditional Apps</p>
                    <p className="text-neutral-700 dark:text-neutral-300">{item.traditional}</p>
                  </div>
                </div>
              </div>

              {/* Nostr */}
              <div className="p-6 bg-neutral-900 dark:bg-white rounded-xl">
                <div className="flex items-start gap-4">
                  <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-neutral-400 dark:text-neutral-600 mb-1">With NostrChat</p>
                    <p className="text-white dark:text-neutral-900">{item.nostr}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Feature Grid Section
function FeaturesSection() {
  const features = [
    {
      icon: Key,
      title: "Sovereignty",
      subtitle: "Your Keys, Your Chat",
      description: "No accounts to create. Your cryptographic keys are your identity. Take them anywhere.",
    },
    {
      icon: Shield,
      title: "Security",
      subtitle: "Military Grade Privacy",
      description: "Messages are encrypted so only intended recipients can decrypt. Not even relay operators can read them.",
    },
    {
      icon: MessageSquare,
      title: "Simplicity",
      subtitle: "Slack-like Feel",
      description: "Channels, threads, reactions, and everything you expect. Familiar interface, revolutionary backend.",
    },
  ];

  return (
    <section id="features" className="py-24 sm:py-32 bg-white dark:bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-neutral-900 dark:text-white mb-4">
            Built Different.
          </h2>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
            Every feature designed with privacy and ownership in mind.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group p-8 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
            >
              <div className="w-12 h-12 bg-neutral-900 dark:bg-white rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <feature.icon className="w-6 h-6 text-white dark:text-neutral-900" />
              </div>
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-500 uppercase tracking-wider mb-2">
                {feature.title}
              </p>
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">
                {feature.subtitle}
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Nostr Explanation Section
function NostrSection() {
  return (
    <section className="py-24 sm:py-32 bg-neutral-900 dark:bg-neutral-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white dark:text-neutral-900 mb-6">
            Powered by Nostr.
          </h2>
          <p className="text-lg sm:text-xl text-neutral-300 dark:text-neutral-600 mb-8 leading-relaxed">
            Built on the Nostr protocol with a dedicated relay hosted on secure cloud infrastructure. 
            Your messages are encrypted and stored reliably. The protocol ensures you can always 
            export your data and identity.
          </p>
          <a
            href="https://nostr.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-white dark:text-neutral-900 font-medium hover:underline"
          >
            What is Nostr?
            <ExternalLink className="w-4 h-4 ml-2" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}

// Open Source Section
function OpenSourceSection() {
  return (
    <section className="py-24 sm:py-32 bg-white dark:bg-neutral-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Github className="w-16 h-16 mx-auto text-neutral-900 dark:text-white mb-6" />
          <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
            100% Open Source
          </h2>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-8">
            Audit our code. Contribute. Fork it. We believe in radical transparency.
          </p>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl font-medium hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
          >
            <Github className="w-5 h-5 mr-2" />
            View on GitHub
          </a>
        </motion.div>
      </div>
    </section>
  );
}

// Footer
function Footer() {
  const footerLinks = {
    product: [
      { name: 'Download', href: '#' },
      { name: 'Features', href: '#features' },
      { name: 'Changelog', href: '#' },
    ],
    resources: [
      { name: 'NIP Specs', href: 'https://github.com/nostr-protocol/nips', external: true },
      { name: 'Documentation', href: '#' },
      { name: 'API', href: '#' },
    ],
    legal: [
      { name: 'Privacy Policy', href: '#' },
      { name: 'Terms of Service', href: '#' },
    ],
  };

  return (
    <footer className="bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-neutral-900 dark:bg-white rounded-lg flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-white dark:text-neutral-900" />
              </div>
              <span className="text-lg font-semibold text-neutral-900 dark:text-white">
                NostrChat
              </span>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
              Decentralized team collaboration.
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-4">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="#"
                className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-white mb-4">Product</h4>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-white mb-4">Resources</h4>
            <ul className="space-y-2">
              {footerLinks.resources.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    target={link.external ? '_blank' : undefined}
                    rel={link.external ? 'noopener noreferrer' : undefined}
                    className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-white mb-4">Legal</h4>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-neutral-200 dark:border-neutral-800">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-neutral-500">
              © {new Date().getFullYear()} NostrChat. Open source under MIT License.
            </p>
            <p className="text-xs text-neutral-400 font-mono">
              npub1...your-key-here
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

// Main Landing Page Component
export function NewLandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <Navigation />
      <HeroSection />
      <WhySection />
      <FeaturesSection />
      <NostrSection />
      <OpenSourceSection />
      <Footer />
    </div>
  );
}
