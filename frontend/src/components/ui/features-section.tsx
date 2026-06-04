"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { MessageSquare, Mic, Smartphone, Zap, Map, LayoutDashboard, CalendarClock, ShieldCheck } from "lucide-react"
import { Tilt } from "@/components/ui/tilt"

// Define features directly here as requested
const features = [
    {
        icon: Mic,
        title: "AI Voice Agent",
        description:
            "Experience the future of booking with our V2V (Voice-to-Voice) agent. Speak naturally to schedule, reschedule, or inquire about appointments hands-free.",
    },
    {
        icon: MessageSquare,
        title: "Chat-Based Booking",
        description:
            "Skip the forms. Book your appointments through a conversational chat interface that understands your needs and guides you to the perfect slot.",
    },
    {
        icon: Smartphone,
        title: "Seamless Payments",
        description:
            "Integrated secure payments via PhonePe. Enjoy friction-free creation and instant confirmation with India's most trusted payment gateway.",
    },
    {
        icon: Zap,
        title: "Real-Time Updates",
        description:
            "Never worry about double-booking. Our engine syncs availability in real-time across all users and devices for up-to-the-second accuracy.",
    },
    {
        icon: Map,
        title: "Location Intelligence",
        description:
            "Find services near you with interactive map widgets. Visualise service locations and get directions seamlessly within the platform.",
    },
    {
        icon: LayoutDashboard,
        title: "Smart Command Center",
        description:
            "A powerful administrative dashboard for total control. Manage users, track bookings, and oversee system health from a single pane of glass.",
    },
    {
        icon: CalendarClock,
        title: "Smart Scheduling Engine",
        description:
            "Guaranteed conflict-free bookings using database-level pessimistic locking. Define custom slot durations, set break hours, and manage availability with absolute data integrity.",
    },
    {
        icon: ShieldCheck,
        title: "Secure Authentication",
        description:
            "Bank-grade security with OTP-based verification for all users. Trust and safety are built-in with verified provider badges.",
    },
]

export function FeaturesSection() {
    const [visibleCards, setVisibleCards] = useState<number[]>([])
    const sectionRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const cards = entry.target.querySelectorAll("[data-card-index]")
                        cards.forEach((card, index) => {
                            setTimeout(() => {
                                setVisibleCards((prev) => [...prev, index])
                            }, index * 100)
                        })
                    }
                })
            },
            { threshold: 0.1 },
        )

        if (sectionRef.current) {
            observer.observe(sectionRef.current)
        }

        return () => observer.disconnect()
    }, [])

    return (
        <section id="features" className="py-20 md:py-32 bg-muted/30" ref={sectionRef}>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mx-auto text-center mb-16">
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-balance">
                        Everything you need to manage appointments
                    </h2>
                    <p className="text-lg text-muted-foreground text-balance leading-relaxed">
                        Powerful features designed to help service businesses streamline their operations and deliver exceptional
                        customer experiences.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    {features.map((feature, index) => {
                        const Icon = feature.icon
                        return (
                            <Tilt
                                key={index}
                                rotationFactor={8}
                                isRevese
                                springOptions={{
                                    stiffness: 26.7,
                                    damping: 4.1,
                                    mass: 0.2,
                                }}
                            >
                                <Card
                                    data-card-index={index}
                                    className={`border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg h-full ${visibleCards.includes(index) ? "animate-scale-in opacity-100" : "opacity-0"
                                        }`}
                                >
                                    <CardContent className="p-6">
                                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                                            <Icon className="w-6 h-6 text-primary" />
                                        </div>
                                        <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                                    </CardContent>
                                </Card>
                            </Tilt>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
