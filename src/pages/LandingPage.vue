<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  Brain,
  ArrowRight,
  Zap,
  ShieldAlert,
  Activity,
  FileText,
  BrainCircuit,
  Columns3,
  Lock,
  ShieldCheck,
  Check,
  Info,
  ExternalLink
} from 'lucide-vue-next'

const router = useRouter()

// Navigation
const getStarted = () => router.push({ name: 'setup' })
const launchApp = () => router.push({ name: 'unlock' })
const scrollToSection = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

// Scroll reveal animation
const observerRef = ref<IntersectionObserver | null>(null)

onMounted(() => {
  observerRef.value = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed')
          observerRef.value?.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
  )

  document.querySelectorAll('.reveal-on-scroll').forEach((el) => {
    observerRef.value?.observe(el)
  })
})

onUnmounted(() => {
  observerRef.value?.disconnect()
})
</script>

<template>
  <div class="min-h-screen bg-canvas text-slate-300 antialiased selection:bg-indigo-500/30 selection:text-white overflow-x-hidden">
    <!-- Navbar -->
    <nav class="fixed top-0 w-full z-50 border-b border-slate-800 bg-canvas/80 backdrop-blur-md">
      <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Brain class="text-white w-5 h-5" />
          </div>
          <span class="font-bold text-white tracking-tight">RecoveryLM</span>
        </div>
        <div class="hidden md:flex items-center gap-6 text-sm font-medium">
          <button @click="scrollToSection('features')" class="hover:text-white transition-colors">Features</button>
          <button @click="scrollToSection('framework')" class="hover:text-white transition-colors">Framework</button>
          <button @click="scrollToSection('privacy')" class="hover:text-white transition-colors">Privacy</button>
          <button
            @click="launchApp"
            class="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-700 transition-all"
          >
            Launch App
          </button>
        </div>
      </div>
    </nav>

    <!-- Hero Section -->
    <header class="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
      <!-- Grid Background Effect -->
      <div class="absolute inset-0 grid-bg opacity-10 pointer-events-none"></div>

      <div class="max-w-4xl mx-auto px-6 text-center relative z-10">
        <h1 class="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight leading-tight text-glow">
          Recovery support that's <br class="hidden md:block" />
          always available—and <span class="text-indigo-500">always private</span>.
        </h1>

        <p class="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          Meet <strong class="text-white">Remi</strong>, your AI recovery companion. Free, anonymous, and built on evidence-based techniques. All your data stays on your device.
        </p>

        <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            @click="getStarted"
            class="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-lg font-semibold shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 group"
          >
            Get Started
            <ArrowRight class="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
          <button
            @click="scrollToSection('framework')"
            class="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-8 py-4 rounded-lg font-medium transition-all"
          >
            View the Framework
          </button>
        </div>
      </div>
    </header>

    <!-- The Problem Section -->
    <section class="py-20 bg-surface-1 border-y border-slate-800 reveal-on-scroll">
      <div class="max-w-3xl mx-auto px-6">
        <h2 class="text-3xl font-bold text-white mb-6">Recovery is hard. It's harder without support.</h2>
        <div class="space-y-6 text-slate-300 text-lg leading-relaxed">
          <p>
            Not everyone has a therapist they can afford, a sponsor who's available at 2am, or a support group that meets when they need it.
          </p>
          <p>
            RecoveryLM exists to fill the gaps—not to replace professional help, but to be there in the moments between. When you need to work through a craving, challenge a rationalization, or just remember why you're doing this.
          </p>
        </div>
      </div>
    </section>

    <!-- What RecoveryLM Is (Features) -->
    <section id="features" class="py-24 max-w-6xl mx-auto px-6">
      <div class="text-center mb-16 reveal-on-scroll">
        <h2 class="text-3xl font-bold text-white mb-4">An AI companion built for recovery</h2>
        <p class="text-slate-400 max-w-2xl mx-auto">
          Remi is a warm but direct AI companion who helps you practice skills, process difficult moments, and stay aware of your patterns—without platitudes or toxic positivity.
        </p>
      </div>

      <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <!-- Feature 1 -->
        <div class="reveal-on-scroll bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-indigo-500/50 transition-colors group">
          <div class="w-12 h-12 bg-surface-1 rounded-lg flex items-center justify-center mb-4 group-hover:bg-indigo-900/30 transition-colors border border-slate-700">
            <Zap class="w-5 h-5 text-indigo-400 group-hover:text-indigo-300" />
          </div>
          <h3 class="text-white font-semibold mb-2">Urge Management</h3>
          <p class="text-sm text-slate-400">Work through surges using structured tools like the DENTS protocol and urge surfing timers.</p>
        </div>

        <!-- Feature 2 -->
        <div class="reveal-on-scroll bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-indigo-500/50 transition-colors group" style="--delay: 0.1s">
          <div class="w-12 h-12 bg-surface-1 rounded-lg flex items-center justify-center mb-4 group-hover:bg-indigo-900/30 transition-colors border border-slate-700">
            <ShieldAlert class="w-5 h-5 text-indigo-400 group-hover:text-indigo-300" />
          </div>
          <h3 class="text-white font-semibold mb-2">Cognitive Defense</h3>
          <p class="text-sm text-slate-400">Challenge cognitive distortions and "Play the Tape Through" when rationalization starts.</p>
        </div>

        <!-- Feature 3 -->
        <div class="reveal-on-scroll bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-indigo-500/50 transition-colors group" style="--delay: 0.2s">
          <div class="w-12 h-12 bg-surface-1 rounded-lg flex items-center justify-center mb-4 group-hover:bg-indigo-900/30 transition-colors border border-slate-700">
            <Activity class="w-5 h-5 text-indigo-400 group-hover:text-indigo-300" />
          </div>
          <h3 class="text-white font-semibold mb-2">Pattern Tracking</h3>
          <p class="text-sm text-slate-400">Track daily habits and spot "Leading Indicators"—early warning signs of drift.</p>
        </div>

        <!-- Feature 4 -->
        <div class="reveal-on-scroll bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-indigo-500/50 transition-colors group" style="--delay: 0.3s">
          <div class="w-12 h-12 bg-surface-1 rounded-lg flex items-center justify-center mb-4 group-hover:bg-indigo-900/30 transition-colors border border-slate-700">
            <FileText class="w-5 h-5 text-indigo-400 group-hover:text-indigo-300" />
          </div>
          <h3 class="text-white font-semibold mb-2">Therapy Prep</h3>
          <p class="text-sm text-slate-400">Prepare for sessions or process what came up after. Generate summaries for your therapist.</p>
        </div>
      </div>
    </section>

    <!-- The Framework -->
    <section id="framework" class="py-24 bg-surface-1 border-y border-slate-800">
      <div class="max-w-6xl mx-auto px-6">
        <div class="flex flex-col lg:flex-row gap-16 items-center">
          <div class="lg:w-1/2 reveal-on-scroll">
            <h2 class="text-3xl font-bold text-white mb-6">Built on the Independent Recovery Framework</h2>
            <p class="text-slate-300 text-lg mb-8 leading-relaxed">
              RecoveryLM is built around a self-directed approach to addiction recovery that draws from three core disciplines. Remi helps you put these ideas into practice: working through urges, challenging rationalizations, and building the daily habits that support long-term recovery.
            </p>
          </div>

          <div class="lg:w-1/2 w-full">
            <div class="grid gap-4">
              <div class="reveal-on-scroll bg-slate-800 p-5 rounded-lg border-l-4 border-indigo-500 flex items-start gap-4">
                <div class="mt-1"><BrainCircuit class="w-5 h-5 text-indigo-400" /></div>
                <div>
                  <h3 class="text-white font-bold">SMART Recovery</h3>
                  <p class="text-sm text-slate-400 mt-1">Self-empowerment and self-management tools.</p>
                </div>
              </div>
              <div class="reveal-on-scroll bg-slate-800 p-5 rounded-lg border-l-4 border-emerald-500 flex items-start gap-4" style="--delay: 0.1s">
                <div class="mt-1"><Activity class="w-5 h-5 text-emerald-400" /></div>
                <div>
                  <h3 class="text-white font-bold">CBT Concepts</h3>
                  <p class="text-sm text-slate-400 mt-1">Recognizing automatic thoughts and cognitive distortions.</p>
                </div>
              </div>
              <div class="reveal-on-scroll bg-slate-800 p-5 rounded-lg border-l-4 border-amber-500 flex items-start gap-4" style="--delay: 0.2s">
                <div class="mt-1"><Columns3 class="w-5 h-5 text-amber-400" /></div>
                <div>
                  <h3 class="text-white font-bold">Stoic Philosophy</h3>
                  <p class="text-sm text-slate-400 mt-1">The dichotomy of control and the pause between stimulus and response.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Privacy Section -->
    <section id="privacy" class="py-24 max-w-5xl mx-auto px-6">
      <div class="reveal-on-scroll bg-surface-1 rounded-2xl border border-slate-700 p-8 md:p-12 relative overflow-hidden">
        <!-- Decorative Lock -->
        <div class="absolute -right-10 -top-10 text-slate-800 opacity-50 pointer-events-none">
          <Lock class="w-64 h-64" />
        </div>

        <div class="relative z-10">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/30 border border-emerald-500/30 text-emerald-400 text-xs font-mono mb-6">
            <ShieldCheck class="w-3 h-3" />
            LOCAL VAULT ARCHITECTURE
          </div>

          <h2 class="text-3xl font-bold text-white mb-6">Your data never leaves your device</h2>
          <p class="text-slate-300 text-lg mb-8 max-w-2xl">
            RecoveryLM takes a different approach to privacy. We don't collect your data. We can't—because we never have it. Your encryption key exists only in your browser's memory.
          </p>

          <div class="grid md:grid-cols-2 gap-y-4 gap-x-12">
            <div class="flex items-center gap-3">
              <Check class="text-emerald-500 w-5 h-5 flex-shrink-0" />
              <span class="text-slate-200">Free to use — No subscription</span>
            </div>
            <div class="flex items-center gap-3">
              <Check class="text-emerald-500 w-5 h-5 flex-shrink-0" />
              <span class="text-slate-200">No account required (No email)</span>
            </div>
            <div class="flex items-center gap-3">
              <Check class="text-emerald-500 w-5 h-5 flex-shrink-0" />
              <span class="text-slate-200">Completely anonymous</span>
            </div>
            <div class="flex items-center gap-3">
              <Check class="text-emerald-500 w-5 h-5 flex-shrink-0" />
              <span class="text-slate-200">All data stored locally in browser</span>
            </div>
            <div class="flex items-center gap-3">
              <Check class="text-emerald-500 w-5 h-5 flex-shrink-0" />
              <span class="text-slate-200">AES-256 encryption at rest</span>
            </div>
            <div class="flex items-center gap-3">
              <Check class="text-emerald-500 w-5 h-5 flex-shrink-0" />
              <span class="text-slate-200">Nothing stored on servers</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Disclaimer / Crisis -->
    <section class="py-16 bg-red-950/20 border-y border-red-900/30">
      <div class="max-w-4xl mx-auto px-6">
        <div class="flex flex-col md:flex-row gap-8">
          <div class="md:w-1/2 reveal-on-scroll">
            <h2 class="text-2xl font-bold text-slate-200 mb-4 flex items-center gap-2">
              <Info class="w-5 h-5 text-amber-500" />
              A supplement, not a replacement
            </h2>
            <p class="text-slate-400 text-sm leading-relaxed mb-4">
              RecoveryLM is not a therapist, doctor, or crisis line. It does not provide therapy, medical advice, or professional treatment.
            </p>
            <p class="text-slate-400 text-sm leading-relaxed">
              It's a support tool—available 24/7 to help you work through difficult moments, build daily structure, and stay aware of your patterns. If you don't have access to professional resources yet, Remi can help you build structure while you work on finding them.
            </p>
          </div>
          <div class="md:w-1/2 bg-red-950/30 rounded-lg p-6 border border-red-900/30 reveal-on-scroll" style="--delay: 0.1s">
            <h3 class="text-red-400 font-bold mb-4 uppercase text-sm tracking-wider">If you're in crisis:</h3>
            <ul class="space-y-3 text-slate-300 text-sm">
              <li class="flex justify-between border-b border-red-900/30 pb-2">
                <span>National Suicide Prevention Lifeline</span>
                <span class="font-mono font-bold text-white">988</span>
              </li>
              <li class="flex justify-between border-b border-red-900/30 pb-2">
                <span>Crisis Text Line</span>
                <span class="font-mono font-bold text-white">Text HOME to 741741</span>
              </li>
              <li class="flex justify-between border-b border-red-900/30 pb-2">
                <span>SAMHSA National Helpline</span>
                <span class="font-mono font-bold text-white">1-800-662-4357</span>
              </li>
              <li class="flex justify-between">
                <span>Emergency Services</span>
                <span class="font-mono font-bold text-white">911</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer CTA -->
    <footer class="py-24 text-center reveal-on-scroll">
      <div class="max-w-2xl mx-auto px-6">
        <h2 class="text-3xl font-bold text-white mb-6">Ready to get started?</h2>
        <p class="text-slate-400 mb-10">
          Create your encrypted vault in seconds. No email. No account. Just you and Remi.
        </p>
        <button
          @click="getStarted"
          class="bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-4 rounded-lg font-semibold shadow-lg shadow-indigo-500/20 transition-all"
        >
          Launch RecoveryLM
        </button>
        <a href="https://github.com/recoverylm/recoverylm" target="_blank" rel="noopener" class="mt-8 text-xs text-slate-600 hover:text-slate-400 transition-colors flex items-center justify-center gap-1">
          Open source on GitHub
          <ExternalLink class="w-3 h-3" />
        </a>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* Grid background effect */
.grid-bg {
  background-image: linear-gradient(to right, #1e293b 1px, transparent 1px),
    linear-gradient(to bottom, #1e293b 1px, transparent 1px);
  background-size: 40px 40px;
  mask-image: radial-gradient(circle at center, black, transparent 80%);
  -webkit-mask-image: radial-gradient(circle at center, black, transparent 80%);
}

/* Text glow effect */
.text-glow {
  text-shadow: 0 0 20px rgba(79, 70, 229, 0.3);
}

/* Scroll reveal animations */
.reveal-on-scroll {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s ease-out, transform 0.6s ease-out;
  transition-delay: var(--delay, 0s);
}

.reveal-on-scroll.revealed {
  opacity: 1;
  transform: translateY(0);
}
</style>
