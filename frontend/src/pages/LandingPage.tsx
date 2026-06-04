import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SparklesCore } from '@/components/ui/sparkles';
import { useTheme } from '@/contexts/ThemeContext';
import { FeaturesSection } from '@/components/ui/features-section';
import { HowItWorksSection } from '@/components/ui/how-it-works-section';
import { TestimonialsSection } from '@/components/ui/testimonials-section';
import { CTASection } from '@/components/ui/cta-section';
import { Header } from '@/components/layout/Header';
import { LandingFooter } from '@/components/layout/LandingFooter';


const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function LandingPage() {
  const { isDark } = useTheme();
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 w-full h-full">
          <SparklesCore
            id="tsparticleshero"
            background="transparent"
            minSize={0.6}
            maxSize={1.4}
            particleDensity={100}
            className="w-full h-full"
            particleColor={isDark ? "#FFFFFF" : "#0d47a1"}
          />
        </div>
        <motion.div
          className="container relative z-10 mx-auto text-center max-w-4xl"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >


          <motion.h1
            variants={itemVariants}
            className="text-4xl md:text-6xl font-bold mb-6 leading-tight"
          >
            Schedule Smarter,{' '}
            <span className="text-primary">Book Faster</span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto"
          >
            The complete booking platform for service providers and customers.
            Manage appointments, track bookings, and grow your business.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link to="/signup">
              <Button size="xl" className="w-full sm:w-auto group">
                Start for Free
                <ArrowRight className="group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="xl" className="w-full sm:w-auto">
                Sign In
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      <FeaturesSection />

      <HowItWorksSection />

      <TestimonialsSection />

      {/* CTA Section */}
      <CTASection />

      <LandingFooter />
    </div>
  );
}

