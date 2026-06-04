"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Search, CalendarCheck, CheckCircle } from "lucide-react"

const steps = [
    {
        number: "1",
        icon: Search,
        title: "Find Your Service",
        description: "Browse through our list of services and select the one that best fits your needs.",
        features: ["Wide range of services available", "Detailed service descriptions", "Real-time availability"],
    },
    {
        number: "2",
        icon: CalendarCheck,
        title: "Book Your Appointment",
        description: "Choose your preferred date and time from the available slots.",
        features: ["Real-time calendar availability", "Instant confirmation", "Flexible scheduling options"],
    },
    {
        number: "3",
        icon: CheckCircle,
        title: "Get Things Done",
        description: "Arrive at your appointment and experience our top-notch service.",
        features: ["Professional service providers", "Quality guaranteed", "Satisfaction focused"],
    },
]

export function HowItWorksSection() {
    const [visibleSteps, setVisibleSteps] = useState<number[]>([])
    const sectionRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        steps.forEach((_, index) => {
                            setTimeout(() => {
                                setVisibleSteps((prev) => [...prev, index])
                            }, index * 200)
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
        <section id="how-it-works" className="py-20 md:py-32" ref={sectionRef}>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mx-auto text-center mb-16">
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-balance">How it works</h2>
                    <p className="text-lg text-muted-foreground text-balance leading-relaxed">
                        Our streamlined booking process makes scheduling your next appointment quick and hassle-free
                    </p>
                </div>

                <div className="max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                        {/* Connection line for desktop */}
                        <div className="hidden md:block absolute top-20 left-[16.666%] right-[16.666%] h-0.5 bg-border" />

                        {steps.map((step, index) => {
                            const Icon = step.icon
                            return (
                                <div
                                    key={index}
                                    className={`relative ${visibleSteps.includes(index) ? "animate-fade-in-up opacity-100" : "opacity-0"
                                        }`}
                                    style={{ animationDelay: `${index * 0.2}s` }}
                                >
                                    <Card className="border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg h-full">
                                        <CardContent className="p-6">
                                            <div className="flex flex-col items-center text-center mb-4">
                                                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4 relative z-10">
                                                    <Icon className="w-8 h-8 text-primary-foreground" />
                                                </div>
                                                <span className="text-4xl font-bold text-primary/20 absolute top-2">{step.number}</span>
                                            </div>
                                            <h3 className="text-xl font-semibold mb-2 text-center">{step.title}</h3>
                                            <p className="text-sm text-muted-foreground mb-4 text-center leading-relaxed">
                                                {step.description}
                                            </p>
                                            <ul className="space-y-2">
                                                {step.features.map((feature, featureIndex) => (
                                                    <li key={featureIndex} className="flex items-start gap-2 text-sm text-muted-foreground">
                                                        <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                                                        <span>{feature}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </section>
    )
}
