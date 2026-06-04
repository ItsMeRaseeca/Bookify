"use client"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface Testimonial {
    author: {
        name: string
        handle: string
        avatar: string
    }
    text: string
}

interface TestimonialsSectionProps {
    title: React.ReactNode
    description: string
    testimonials: Testimonial[]
    className?: string
}

export function TestimonialsSection({
    title,
    description,
    testimonials,
    className,
}: TestimonialsSectionProps) {
    return (
        <section className={cn("py-20 md:py-32 overflow-hidden", className)}>
            <div className="container px-4 md:px-6 mb-12 text-center">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight mb-4">
                    {title}
                </h2>
                <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                    {description}
                </p>
            </div>

            <div className="relative w-full overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10" />
                <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10" />

                <div className="flex w-max animate-marquee gap-6 hover:[animation-play-state:paused] py-4">
                    {[...testimonials, ...testimonials, ...testimonials].map((testimonial, i) => (
                        <Card key={i} className="w-[350px] shrink-0 border-border/50 bg-card/50 backdrop-blur-sm">
                            <CardContent className="p-6">
                                <p className="text-muted-foreground mb-6 leading-relaxed">"{testimonial.text}"</p>
                                <div className="flex items-center gap-4">
                                    <Avatar>
                                        <AvatarImage src={testimonial.author.avatar} alt={testimonial.author.name} />
                                        <AvatarFallback>{testimonial.author.name[0]}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold text-sm">{testimonial.author.name}</p>
                                        <p className="text-xs text-muted-foreground">{testimonial.author.handle}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    )
}
