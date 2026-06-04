"use client"
import { TestimonialsSection as TestimonialsMarquee } from "@/components/ui/testimonials-with-marquee"
import { SparklesCore } from "@/components/ui/sparkles"
import { Typewriter } from "@/components/ui/typewriter-text"

const testimonials = [
    {
        author: {
            name: "Anita Patel",
            handle: "Salon Owner",
            avatar: "/professional-woman-portrait.png",
        },
        text: "Bookify simplified our booking flow - real-time slots and automated reminders reduced no-shows and saved our team hours every week.",
    },
    {
        author: {
            name: "David Khan",
            handle: "Clinic Manager",
            avatar: "/professional-man-portrait.png",
        },
        text: "Managing multiple providers and resources is effortless now. The capacity controls and calendar views are exactly what we needed.",
    },
    {
        author: {
            name: "Priya Sharma",
            handle: "Freelance Therapist",
            avatar: "/professional-woman-therapist.png",
        },
        text: "Customers love the easy booking experience. The confirmation and payment flow gave us the professional setup we were missing.",
    },
]

import { useTheme } from "@/contexts/ThemeContext";

export function TestimonialsSection() {
    const { isDark } = useTheme();

    return (
        <div className="relative w-full">
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <SparklesCore
                    id="testimonials-sparkles"
                    background="transparent"
                    minSize={0.6}
                    maxSize={1.4}
                    particleDensity={100}
                    className="h-full w-full"
                    particleColor={isDark ? "#FFFFFF" : "#0d47a1"}
                />
            </div>
            <div className="relative z-10">
                <TestimonialsMarquee
                    title={<Typewriter text="Trusted by service businesses" speed={60} loop={false} cursor="" />}
                    description="Real customers share how Bookify improved their scheduling and operations."
                    testimonials={testimonials}
                />
            </div>
        </div>
    )
}
